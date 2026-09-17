package com.wanghuanlab.scp.web;

import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.wanghuanlab.scp.dto.SeatunnelBaseRequest;
import com.wanghuanlab.scp.dto.UserDto;
import com.wanghuanlab.scp.error.ApiException;
import com.wanghuanlab.scp.service.SettingsService;

@RestController
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping("/api/settings/health")
    public Map<String, Object> health() {
        return settingsService.getSettingsHealth();
    }

    @GetMapping("/api/settings/seatunnel")
    public Map<String, Object> getSeatunnel(HttpServletRequest request) {
        requireAdmin(request);
        return settingsService.getSeatunnelSettings();
    }

    @PutMapping("/api/settings/seatunnel")
    public Map<String, Object> saveSeatunnel(HttpServletRequest request,
                                             @RequestBody(required = false) SeatunnelBaseRequest body) {
        requireAdmin(request);
        String apiBase = body == null ? null : body.getApiBase();
        return settingsService.saveSeatunnelBase(apiBase);
    }

    private static void requireAdmin(HttpServletRequest request) {
        UserDto user = AuthFilter.currentUser(request);
        if (user == null) {
            throw ApiException.unauthorized("未登录或会话已过期");
        }
        if (!"admin".equals(user.getRole())) {
            throw ApiException.forbidden("需要管理员权限");
        }
    }
}
