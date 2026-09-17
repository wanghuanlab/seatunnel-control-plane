package com.wanghuanlab.scp.web;

import java.util.LinkedHashMap;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.wanghuanlab.scp.dto.ChangePasswordRequest;
import com.wanghuanlab.scp.dto.LoginRequest;
import com.wanghuanlab.scp.dto.UserDto;
import com.wanghuanlab.scp.service.AuthService;
import com.wanghuanlab.scp.service.AuthService.LoginResult;

@RestController
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/api/auth/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody(required = false) LoginRequest body,
                                                     HttpServletResponse response) {
        LoginRequest request = body == null ? new LoginRequest() : body;
        LoginResult result = authService.authenticate(request.getUsername(), request.getPassword());
        AuthFilter.addCookie(response, AuthFilter.sessionCookie(result.token, result.expiresAt));
        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("user", result.user);
        return ResponseEntity.ok(payload);
    }

    @PostMapping("/api/auth/logout")
    public Map<String, Object> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.destroySession(AuthFilter.readSessionToken(request));
        AuthFilter.addCookie(response, AuthFilter.clearSessionCookie());
        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("ok", true);
        return payload;
    }

    @GetMapping("/api/auth/me")
    public Map<String, Object> me(HttpServletRequest request) {
        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("user", AuthFilter.currentUser(request));
        return payload;
    }

    @PostMapping("/api/auth/change-password")
    public Map<String, Object> changePassword(HttpServletRequest request,
                                              @RequestBody(required = false) ChangePasswordRequest body) {
        ChangePasswordRequest payload = body == null ? new ChangePasswordRequest() : body;
        UserDto user = AuthFilter.currentUser(request);
        authService.changePassword(user.getId(), payload.getOldPassword(), payload.getNewPassword());
        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("ok", true);
        return result;
    }
}
