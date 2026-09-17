package com.wanghuanlab.scp.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wanghuanlab.scp.service.SettingsService;

@RestController
public class RootController {

    private final SettingsService settingsService;

    public RootController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping("/")
    public Map<String, Object> root() {
        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("status", "ok");
        body.put("proxy", settingsService.getSeatunnelBase());
        body.put("mode", "java-server");
        return body;
    }
}
