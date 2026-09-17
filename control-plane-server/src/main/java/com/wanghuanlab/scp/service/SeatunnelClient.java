package com.wanghuanlab.scp.service;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ByteArrayEntity;
import org.apache.http.entity.ContentType;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.util.EntityUtils;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.wanghuanlab.scp.dto.Jsons;
import com.wanghuanlab.scp.error.ApiException;

@Service
public class SeatunnelClient {

    private static final Set<String> ACTIVE_STATUSES;

    static {
        Set<String> statuses = new HashSet<String>();
        statuses.add("RUNNING");
        statuses.add("PENDING");
        statuses.add("RESTORE");
        statuses.add("SUBMITTED");
        ACTIVE_STATUSES = Collections.unmodifiableSet(statuses);
    }

    private final SettingsService settingsService;
    private final CloseableHttpClient httpClient;

    public SeatunnelClient(SettingsService settingsService, CloseableHttpClient httpClient) {
        this.settingsService = settingsService;
        this.httpClient = httpClient;
    }

    public static boolean isActiveJobStatus(String status) {
        return ACTIVE_STATUSES.contains(String.valueOf(status == null ? "" : status).toUpperCase());
    }

    public Map<String, Object> submitJob(String configFormat, String configContent, String jobName) throws Exception {
        String base = requireBase();
        String format = configFormat == null || configFormat.isEmpty() ? "hocon" : configFormat;
        StringBuilder url = new StringBuilder(base).append("/submit-job");
        boolean first = true;
        if (jobName != null && !jobName.isEmpty()) {
            url.append("?jobName=").append(urlEncode(jobName));
            first = false;
        }
        if (!"json".equals(format)) {
            url.append(first ? '?' : '&').append("format=").append(urlEncode(format));
        }

        HttpPost post = new HttpPost(url.toString());
        post.setHeader("Accept", "application/json");
        byte[] body;
        ContentType contentType;
        if ("hocon".equals(format) || "sql".equals(format)) {
            contentType = ContentType.create("hocon".equals(format) ? "application/hocon" : "text/plain", StandardCharsets.UTF_8);
            body = configContent == null ? new byte[0] : configContent.getBytes(StandardCharsets.UTF_8);
        } else {
            contentType = ContentType.APPLICATION_JSON;
            body = configContent == null ? new byte[0] : configContent.getBytes(StandardCharsets.UTF_8);
        }
        post.setEntity(new ByteArrayEntity(body, contentType));

        CloseableHttpResponse response = httpClient.execute(post);
        try {
            String text = response.getEntity() == null ? "" : EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
            int status = response.getStatusLine().getStatusCode();
            if (status < 200 || status >= 300) {
                throw new IllegalStateException(text.isEmpty() ? ("SeaTunnel submit failed: " + status) : text);
            }
            try {
                return Jsons.MAPPER.readValue(text, new TypeReference<Map<String, Object>>() { });
            } catch (Exception e) {
                throw new IllegalStateException(text.isEmpty() ? "Invalid SeaTunnel submit response" : text);
            }
        } finally {
            response.close();
        }
    }

    public Map<String, Object> fetchJobInfo(String jobId) throws Exception {
        String base = requireBase();
        HttpGet get = new HttpGet(base + "/job-info/" + urlEncode(jobId));
        get.setHeader("Accept", "application/json");
        CloseableHttpResponse response = httpClient.execute(get);
        try {
            String text = response.getEntity() == null ? "" : EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
            int status = response.getStatusLine().getStatusCode();
            if (status < 200 || status >= 300) {
                throw new IllegalStateException(text.isEmpty() ? ("job-info failed: " + status) : text);
            }
            return Jsons.MAPPER.readValue(text, new TypeReference<Map<String, Object>>() { });
        } finally {
            response.close();
        }
    }

    private String requireBase() {
        String base = settingsService.getSeatunnelBase();
        if (base == null || base.isEmpty()) {
            throw ApiException.badRequest("尚未配置 SeaTunnel API Base，请管理员在「系统设置」中配置");
        }
        return base;
    }

    private static String urlEncode(String value) {
        try {
            return java.net.URLEncoder.encode(value, "UTF-8").replace("+", "%20");
        } catch (Exception e) {
            return value;
        }
    }
}
