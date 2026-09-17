package com.wanghuanlab.scp.service;

import java.net.URI;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.util.EntityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wanghuanlab.scp.domain.AppSetting;
import com.wanghuanlab.scp.dto.Jsons;
import com.wanghuanlab.scp.error.ApiException;
import com.wanghuanlab.scp.repo.AppSettingRepository;
import com.wanghuanlab.scp.util.TimeUtils;

@Service
public class SettingsService {

    public static final String SETTING_SEATUNNEL_API_BASE = "seatunnel_api_base";
    public static final String SETTING_SEATUNNEL_LAST_PROBE = "seatunnel_last_probe";

    private final AppSettingRepository settingRepository;
    private final CloseableHttpClient httpClient;
    private volatile String cachedBase;
    private volatile boolean cacheLoaded;

    public SettingsService(AppSettingRepository settingRepository, CloseableHttpClient httpClient) {
        this.settingRepository = settingRepository;
        this.httpClient = httpClient;
    }

    public void invalidateSeatunnelBaseCache() {
        cachedBase = null;
        cacheLoaded = false;
    }

    public static String normalizeSeatunnelBase(String input) {
        String raw = input == null ? "" : input.trim();
        while (raw.endsWith("/")) {
            raw = raw.substring(0, raw.length() - 1);
        }
        if (raw.isEmpty()) {
            throw ApiException.badRequest("请填写 SeaTunnel API Base");
        }
        URI url;
        try {
            url = URI.create(raw);
        } catch (Exception e) {
            throw ApiException.badRequest("API Base 不是合法 URL");
        }
        if (url.getScheme() == null || url.getHost() == null) {
            throw ApiException.badRequest("API Base 不是合法 URL");
        }
        if (!"http".equalsIgnoreCase(url.getScheme()) && !"https".equalsIgnoreCase(url.getScheme())) {
            throw ApiException.badRequest("API Base 仅支持 http:// 或 https://");
        }
        if (url.getUserInfo() != null && !url.getUserInfo().isEmpty()) {
            throw ApiException.badRequest("API Base 请勿包含用户名密码");
        }
        String path = url.getRawPath();
        if (path == null || "/".equals(path)) {
            path = "";
        } else {
            while (path.endsWith("/")) {
                path = path.substring(0, path.length() - 1);
            }
        }
        int port = url.getPort();
        String host = url.getHost();
        String authority = port > 0 ? host + ":" + port : host;
        return url.getScheme() + "://" + authority + path;
    }

    @Transactional(readOnly = true)
    public String getSeatunnelBase() {
        if (cacheLoaded) {
            return cachedBase;
        }
        AppSetting row = settingRepository.findById(SETTING_SEATUNNEL_API_BASE).orElse(null);
        cachedBase = row == null || row.getValue() == null || row.getValue().isEmpty() ? null : row.getValue();
        cacheLoaded = true;
        return cachedBase;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSeatunnelSettings() {
        String base = getSeatunnelBase();
        AppSetting baseRow = settingRepository.findById(SETTING_SEATUNNEL_API_BASE).orElse(null);
        Map<String, Object> dto = new LinkedHashMap<String, Object>();
        dto.put("apiBase", base);
        dto.put("configured", base != null);
        dto.put("lastProbe", getLastProbe());
        dto.put("updatedAt", baseRow == null ? null : TimeUtils.toIso(baseRow.getUpdatedAt()));
        return dto;
    }

    @Transactional
    public Map<String, Object> getSettingsHealth() {
        Map<String, Object> settings = getSeatunnelSettings();
        Object probe = settings.get("lastProbe");
        String apiBase = (String) settings.get("apiBase");
        if (apiBase != null) {
            probe = probeSeatunnelBase(apiBase);
            upsertSetting(SETTING_SEATUNNEL_LAST_PROBE, writeJson(probe));
        }
        boolean configured = Boolean.TRUE.equals(settings.get("configured"));
        boolean reachable = probe instanceof Map && Boolean.TRUE.equals(((Map<?, ?>) probe).get("ok"));
        String message;
        if (!configured) {
            message = "尚未配置 SeaTunnel API Base";
        } else if (reachable) {
            message = "SeaTunnel API 连接正常";
        } else {
            Object detail = probe instanceof Map ? ((Map<?, ?>) probe).get("detail") : null;
            message = "SeaTunnel API 不可用：" + (detail == null ? "未知错误" : detail);
        }
        Map<String, Object> dto = new LinkedHashMap<String, Object>();
        dto.put("apiBase", apiBase);
        dto.put("configured", configured);
        dto.put("reachable", reachable);
        dto.put("lastProbe", probe);
        dto.put("message", message);
        return dto;
    }

    @Transactional
    public Map<String, Object> saveSeatunnelBase(String apiBase) {
        String normalized = normalizeSeatunnelBase(apiBase);
        Map<String, Object> probe = probeSeatunnelBase(normalized);
        if (!Boolean.TRUE.equals(probe.get("ok"))) {
            throw new ApiException(400, "连通性检查失败：" + probe.get("detail"), probe);
        }
        upsertSetting(SETTING_SEATUNNEL_API_BASE, normalized);
        upsertSetting(SETTING_SEATUNNEL_LAST_PROBE, writeJson(probe));
        cacheLoaded = true;
        cachedBase = normalized;
        Map<String, Object> dto = new LinkedHashMap<String, Object>();
        dto.put("apiBase", normalized);
        dto.put("configured", true);
        dto.put("lastProbe", probe);
        dto.put("updatedAt", TimeUtils.toIso(TimeUtils.now()));
        return dto;
    }

    public Map<String, Object> probeSeatunnelBase(String base) {
        String target = base + "/overview";
        long started = System.currentTimeMillis();
        RequestConfig config = RequestConfig.custom()
                .setConnectTimeout(5_000)
                .setSocketTimeout(5_000)
                .setConnectionRequestTimeout(5_000)
                .build();
        HttpGet get = new HttpGet(target);
        get.setConfig(config);
        get.setHeader("Accept", "application/json");
        try {
            CloseableHttpResponse response = httpClient.execute(get);
            try {
                int status = response.getStatusLine().getStatusCode();
                String text = response.getEntity() == null ? "" : EntityUtils.toString(response.getEntity(), "UTF-8");
                boolean ok = status >= 200 && status < 300;
                String detail = "HTTP " + status;
                if (!ok) {
                    detail = text.length() > 200 ? text.substring(0, 200) : (text.isEmpty() ? detail : text);
                }
                return probeResult(ok, status, detail, started, base);
            } finally {
                response.close();
            }
        } catch (Exception e) {
            return probeResult(false, 0, e.getMessage() == null ? String.valueOf(e) : e.getMessage(), started, base);
        }
    }

    private Map<String, Object> getLastProbe() {
        AppSetting row = settingRepository.findById(SETTING_SEATUNNEL_LAST_PROBE).orElse(null);
        if (row == null || row.getValue() == null || row.getValue().isEmpty()) {
            return null;
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = Jsons.MAPPER.readValue(row.getValue(), Map.class);
            return parsed;
        } catch (Exception e) {
            return null;
        }
    }

    private void upsertSetting(String key, String value) {
        Instant now = TimeUtils.now();
        AppSetting setting = settingRepository.findById(key).orElseGet(AppSetting::new);
        setting.setKey(key);
        setting.setValue(value);
        setting.setUpdatedAt(now);
        settingRepository.save(setting);
    }

    private static Map<String, Object> probeResult(boolean ok, int status, String detail, long started, String base) {
        Map<String, Object> probe = new LinkedHashMap<String, Object>();
        probe.put("ok", ok);
        probe.put("status", status);
        probe.put("detail", detail);
        probe.put("checkedAt", TimeUtils.toIso(TimeUtils.now()));
        probe.put("latencyMs", System.currentTimeMillis() - started);
        probe.put("base", base);
        return probe;
    }

    private static String writeJson(Object value) {
        try {
            return Jsons.MAPPER.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
