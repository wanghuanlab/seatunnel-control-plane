package com.wanghuanlab.scp.web;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpEntityEnclosingRequestBase;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpRequestBase;
import org.apache.http.entity.ByteArrayEntity;
import org.apache.http.entity.ContentType;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.util.EntityUtils;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UrlPathHelper;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.wanghuanlab.scp.dto.Jsons;
import com.wanghuanlab.scp.service.SettingsService;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class SeatunnelProxyFilter extends OncePerRequestFilter {

    private static final String PREFIX = "/api/seatunnel";
    private static final Pattern JOB_LIST_PATH = Pattern.compile("^/(running-jobs|finished-jobs(?:/[A-Z_]+)?)$");
    private static final long JOB_LIST_TTL_MS = 8000L;
    private static final Set<String> SKIP_REQUEST_HEADERS;
    private static final Set<String> SKIP_RESPONSE_HEADERS;

    static {
        Set<String> req = new HashSet<String>(Arrays.asList(
                "host", "content-length", "connection", "transfer-encoding",
                "accept-encoding", "cookie", "keep-alive", "proxy-connection"));
        SKIP_REQUEST_HEADERS = Collections.unmodifiableSet(req);
        Set<String> resp = new HashSet<String>(Arrays.asList(
                "connection", "transfer-encoding", "keep-alive", "proxy-connection", "content-encoding"));
        SKIP_RESPONSE_HEADERS = Collections.unmodifiableSet(resp);
    }

    private final SettingsService settingsService;
    private final CloseableHttpClient httpClient;
    private final Map<String, CacheEntry> jobListCache = new ConcurrentHashMap<String, CacheEntry>();
    private final UrlPathHelper pathHelper = new UrlPathHelper();

    public SeatunnelProxyFilter(SettingsService settingsService, CloseableHttpClient httpClient) {
        this.settingsService = settingsService;
        this.httpClient = httpClient;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = pathHelper.getPathWithinApplication(request);
        return path == null || !path.startsWith(PREFIX);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = pathHelper.getPathWithinApplication(request);
        String targetPath = path.substring(PREFIX.length());
        if (targetPath.isEmpty()) {
            targetPath = "/";
        }
        String query = request.getQueryString();
        String targetWithQuery = query == null || query.isEmpty() ? targetPath : targetPath + "?" + query;

        String base = settingsService.getSeatunnelBase();
        if (base == null || base.isEmpty()) {
            AuthFilter.writeJson(response, 503, AuthFilter.errorBody("尚未配置 SeaTunnel API Base，请管理员在「系统设置」中配置"));
            return;
        }

        try {
            if ("GET".equalsIgnoreCase(request.getMethod()) && JOB_LIST_PATH.matcher(pathAfterBase(targetPath)).matches()) {
                proxyJobList(request, response, base, pathAfterBase(targetPath));
                return;
            }
            proxyRaw(request, response, base + targetWithQuery);
        } catch (Exception e) {
            Map<String, Object> body = new LinkedHashMap<String, Object>();
            body.put("error", "SeaTunnel API unreachable");
            body.put("detail", e.getMessage() == null ? String.valueOf(e) : e.getMessage());
            AuthFilter.writeJson(response, 502, body);
        }
    }

    private static String pathAfterBase(String targetPath) {
        int q = targetPath.indexOf('?');
        return q >= 0 ? targetPath.substring(0, q) : targetPath;
    }

    private void proxyJobList(HttpServletRequest request, HttpServletResponse response, String base, String pathname)
            throws Exception {
        int page = Math.max(1, parseInt(request.getParameter("page"), 1));
        int rows = Math.min(200, Math.max(1, parseInt(request.getParameter("rows"), 20)));
        CacheEntry cached = jobListCache.get(pathname);
        long now = System.currentTimeMillis();
        JsonNode list;

        if (cached != null && now - cached.at < JOB_LIST_TTL_MS) {
            list = cached.list;
        } else {
            HttpGet upstreamReq = new HttpGet(base + pathname);
            copyRequestHeaders(request, upstreamReq);
            CloseableHttpResponse upstream = httpClient.execute(upstreamReq);
            try {
                int status = upstream.getStatusLine().getStatusCode();
                byte[] raw = readEntity(upstream.getEntity());
                if (status < 200 || status >= 300) {
                    copyResponseHeaders(upstream, response);
                    response.setStatus(status);
                    response.getOutputStream().write(raw);
                    return;
                }
                String text = new String(raw, StandardCharsets.UTF_8);
                JsonNode parsed;
                try {
                    parsed = Jsons.MAPPER.readTree(text);
                } catch (Exception e) {
                    response.setStatus(200);
                    response.setContentType("application/json");
                    response.getOutputStream().write(raw);
                    return;
                }
                if (parsed.isArray()) {
                    list = parsed;
                } else if (parsed.isObject() && parsed.get("data") != null && parsed.get("data").isArray()) {
                    boolean alreadyPaged = parsed.has("page") || parsed.has("rows");
                    if (alreadyPaged) {
                        ObjectNode out = (ObjectNode) parsed;
                        if (!out.has("total")) {
                            out.put("total", out.get("data").size());
                        }
                        if (!out.has("page")) {
                            out.put("page", page);
                        }
                        if (!out.has("rows")) {
                            out.put("rows", rows);
                        }
                        AuthFilter.writeJson(response, 200, out);
                        return;
                    }
                    list = parsed.get("data");
                } else {
                    response.setStatus(200);
                    response.setContentType("application/json");
                    response.getOutputStream().write(raw);
                    return;
                }
                jobListCache.put(pathname, new CacheEntry(now, list));
            } finally {
                upstream.close();
            }
        }

        ArrayNode array = (ArrayNode) list;
        int total = array.size();
        int start = (page - 1) * rows;
        int end = Math.min(total, start + rows);
        ArrayNode slice = Jsons.MAPPER.createArrayNode();
        for (int i = Math.max(0, start); i < end; i++) {
            slice.add(array.get(i));
        }
        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("data", slice);
        payload.put("total", total);
        payload.put("page", page);
        payload.put("rows", rows);
        AuthFilter.writeJson(response, 200, payload);
    }

    private void proxyRaw(HttpServletRequest request, HttpServletResponse response, String url) throws Exception {
        HttpRequestBase upstreamReq;
        if ("GET".equalsIgnoreCase(request.getMethod()) || "HEAD".equalsIgnoreCase(request.getMethod())) {
            upstreamReq = "HEAD".equalsIgnoreCase(request.getMethod())
                    ? new HttpMethodRequest("HEAD", url)
                    : new HttpGet(url);
        } else {
            HttpMethodRequest enclosing = new HttpMethodRequest(request.getMethod(), url);
            byte[] body = readRequestBody(request);
            if (body.length > 0) {
                String contentType = request.getContentType();
                ContentType type = contentType == null ? ContentType.APPLICATION_OCTET_STREAM : ContentType.parse(contentType);
                enclosing.setEntity(new ByteArrayEntity(body, type));
            }
            upstreamReq = enclosing;
        }
        copyRequestHeaders(request, upstreamReq);
        CloseableHttpResponse upstream = httpClient.execute(upstreamReq);
        try {
            copyResponseHeaders(upstream, response);
            response.setStatus(upstream.getStatusLine().getStatusCode());
            byte[] raw = readEntity(upstream.getEntity());
            if (raw.length > 0) {
                response.getOutputStream().write(raw);
            }
        } finally {
            upstream.close();
        }
    }

    private static void copyRequestHeaders(HttpServletRequest request, HttpRequestBase target) {
        Enumeration<String> names = request.getHeaderNames();
        while (names.hasMoreElements()) {
            String name = names.nextElement();
            if (SKIP_REQUEST_HEADERS.contains(name.toLowerCase())) {
                continue;
            }
            Enumeration<String> values = request.getHeaders(name);
            while (values.hasMoreElements()) {
                target.addHeader(name, values.nextElement());
            }
        }
        try {
            URI uri = URI.create(target.getURI().toString());
            if (uri.getHost() != null) {
                int port = uri.getPort();
                String host = port > 0 ? uri.getHost() + ":" + port : uri.getHost();
                target.setHeader("Host", host);
            }
        } catch (Exception ignored) {
            // keep original
        }
    }

    private static void copyResponseHeaders(CloseableHttpResponse upstream, HttpServletResponse response) {
        for (Header header : upstream.getAllHeaders()) {
            if (SKIP_RESPONSE_HEADERS.contains(header.getName().toLowerCase())) {
                continue;
            }
            response.addHeader(header.getName(), header.getValue());
        }
    }

    private static byte[] readRequestBody(HttpServletRequest request) throws IOException {
        InputStream in = request.getInputStream();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        while ((n = in.read(buf)) >= 0) {
            out.write(buf, 0, n);
        }
        return out.toByteArray();
    }

    private static byte[] readEntity(HttpEntity entity) throws IOException {
        if (entity == null) {
            return new byte[0];
        }
        return EntityUtils.toByteArray(entity);
    }

    private static int parseInt(String value, int fallback) {
        if (value == null || value.isEmpty()) {
            return fallback;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static final class CacheEntry {
        private final long at;
        private final JsonNode list;

        private CacheEntry(long at, JsonNode list) {
            this.at = at;
            this.list = list;
        }
    }

    private static final class HttpMethodRequest extends HttpEntityEnclosingRequestBase {
        private final String method;

        private HttpMethodRequest(String method, String uri) {
            this.method = method;
            setURI(URI.create(uri));
        }

        @Override
        public String getMethod() {
            return method;
        }
    }
}
