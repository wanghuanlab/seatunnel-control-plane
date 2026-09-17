package com.wanghuanlab.scp.web;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.wanghuanlab.scp.dto.Jsons;
import com.wanghuanlab.scp.dto.UserDto;
import com.wanghuanlab.scp.service.AuthService;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AuthFilter extends OncePerRequestFilter {

    public static final String CURRENT_USER_ATTR = "scp.currentUser";

    private final AuthService authService;

    public AuthFilter(AuthService authService) {
        this.authService = authService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }
        if ("/api/auth/login".equals(path) || "/api/auth/logout".equals(path)) {
            filterChain.doFilter(request, response);
            return;
        }
        UserDto user = authService.getUserBySessionToken(readSessionToken(request));
        if (user == null) {
            writeJson(response, 401, errorBody("未登录或会话已过期"));
            return;
        }
        request.setAttribute(CURRENT_USER_ATTR, user);
        filterChain.doFilter(request, response);
    }

    public static UserDto currentUser(HttpServletRequest request) {
        return (UserDto) request.getAttribute(CURRENT_USER_ATTR);
    }

    public static UserDto requireAdmin(HttpServletRequest request, HttpServletResponse response) throws IOException {
        UserDto user = currentUser(request);
        if (user == null) {
            writeJson(response, 401, errorBody("未登录或会话已过期"));
            return null;
        }
        if (!"admin".equals(user.getRole())) {
            writeJson(response, 403, errorBody("需要管理员权限"));
            return null;
        }
        return user;
    }

    public static String readSessionToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (AuthService.SESSION_COOKIE.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    public static ResponseCookie sessionCookie(String token, Instant expiresAt) {
        long maxAge = Math.max(0, Duration.between(Instant.now(), expiresAt).getSeconds());
        return ResponseCookie.from(AuthService.SESSION_COOKIE, token)
                .path("/")
                .httpOnly(true)
                .sameSite("Lax")
                .maxAge(maxAge)
                .build();
    }

    public static ResponseCookie clearSessionCookie() {
        return ResponseCookie.from(AuthService.SESSION_COOKIE, "")
                .path("/")
                .httpOnly(true)
                .sameSite("Lax")
                .maxAge(0)
                .build();
    }

    public static void writeJson(HttpServletResponse response, int status, Object payload) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json; charset=utf-8");
        response.getOutputStream().write(Jsons.MAPPER.writeValueAsBytes(payload));
    }

    public static Map<String, Object> errorBody(String message) {
        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("error", message);
        return body;
    }

    public static void addCookie(HttpServletResponse response, ResponseCookie cookie) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public static byte[] utf8(String value) {
        return value.getBytes(StandardCharsets.UTF_8);
    }
}
