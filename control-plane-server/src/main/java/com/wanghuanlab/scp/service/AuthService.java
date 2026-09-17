package com.wanghuanlab.scp.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wanghuanlab.scp.domain.AppUser;
import com.wanghuanlab.scp.domain.UserSession;
import com.wanghuanlab.scp.dto.CreateUserRequest;
import com.wanghuanlab.scp.dto.DtoMapper;
import com.wanghuanlab.scp.dto.UpdateUserRequest;
import com.wanghuanlab.scp.dto.UserDto;
import com.wanghuanlab.scp.error.ApiException;
import com.wanghuanlab.scp.repo.AppUserRepository;
import com.wanghuanlab.scp.repo.UserSessionRepository;
import com.wanghuanlab.scp.util.TimeUtils;

@Service
public class AuthService {

    public static final String SESSION_COOKIE = "scp_session";
    public static final Duration SESSION_TTL = Duration.ofDays(7);
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_\\-.]{3,64}$");
    private static final char[] HEX = "0123456789abcdef".toCharArray();

    private final AppUserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public AuthService(AppUserRepository userRepository,
                       UserSessionRepository sessionRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public boolean seedDefaultAdmin() {
        if (userRepository.findByUsername("admin").isPresent()) {
            return false;
        }
        Instant now = TimeUtils.now();
        AppUser user = new AppUser();
        user.setUsername("admin");
        user.setPasswordHash(passwordEncoder.encode("123456"));
        user.setRole("admin");
        user.setEnabled(true);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        userRepository.save(user);
        return true;
    }

    @Transactional
    public LoginResult authenticate(String username, String password) {
        AppUser user = userRepository.findByUsername(username == null ? "" : username.trim()).orElse(null);
        if (user == null || !user.isEnabled() || !passwordEncoder.matches(String.valueOf(password), user.getPasswordHash())) {
            throw ApiException.unauthorized("用户名或密码错误");
        }
        UserSession session = createSession(user);
        return new LoginResult(DtoMapper.toUserDto(user), session.getId(), session.getExpiresAt());
    }

    @Transactional
    public UserSession createSession(AppUser user) {
        Instant now = TimeUtils.now();
        UserSession session = new UserSession();
        session.setId(randomToken());
        session.setUser(user);
        session.setExpiresAt(now.plus(SESSION_TTL));
        session.setCreatedAt(now);
        return sessionRepository.save(session);
    }

    @Transactional
    public void destroySession(String token) {
        if (token == null || token.isEmpty()) {
            return;
        }
        sessionRepository.deleteById(token);
    }

    @Transactional
    public UserDto getUserBySessionToken(String token) {
        if (token == null || token.isEmpty()) {
            return null;
        }
        sessionRepository.deleteExpired(TimeUtils.now());
        UserSession session = sessionRepository.findValid(token, TimeUtils.now()).orElse(null);
        return session == null ? null : DtoMapper.toUserDto(session.getUser());
    }

    @Transactional
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        AppUser user = userRepository.findById(userId).orElseThrow(() -> ApiException.badRequest("用户不存在"));
        if (!passwordEncoder.matches(String.valueOf(oldPassword), user.getPasswordHash())) {
            throw ApiException.badRequest("当前密码不正确");
        }
        String next = newPassword == null ? "" : newPassword;
        if (next.length() < 6) {
            throw ApiException.badRequest("新密码至少 6 位");
        }
        user.setPasswordHash(passwordEncoder.encode(next));
        user.setUpdatedAt(TimeUtils.now());
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public List<AppUser> listUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public UserDto createUser(CreateUserRequest request) {
        String name = request.getUsername() == null ? "" : request.getUsername().trim();
        if (name.isEmpty()) {
            throw ApiException.badRequest("用户名不能为空");
        }
        if (!USERNAME_PATTERN.matcher(name).matches()) {
            throw ApiException.badRequest("用户名需为 3-64 位字母数字或 _-.");
        }
        if ("admin".equalsIgnoreCase(name)) {
            throw ApiException.badRequest("不能创建名为 admin 的用户");
        }
        String pwd = request.getPassword() == null ? "" : request.getPassword();
        if (pwd.length() < 6) {
            throw ApiException.badRequest("密码至少 6 位");
        }
        if (userRepository.findByUsername(name).isPresent()) {
            throw ApiException.badRequest("用户名已存在");
        }
        Instant now = TimeUtils.now();
        AppUser user = new AppUser();
        user.setUsername(name);
        user.setPasswordHash(passwordEncoder.encode(pwd));
        user.setRole("admin".equals(request.getRole()) ? "admin" : "user");
        user.setEnabled(request.getIsEnabled() == null || Boolean.TRUE.equals(request.getIsEnabled()));
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        return DtoMapper.toUserDto(userRepository.save(user));
    }

    @Transactional
    public UserDto updateUser(Long id, UpdateUserRequest payload, Long actorUserId) {
        AppUser current = userRepository.findById(id).orElseThrow(() -> ApiException.badRequest("用户不存在"));
        String nextRole = payload.getRole() == null ? current.getRole() : ("admin".equals(payload.getRole()) ? "admin" : "user");
        boolean nextEnabled = payload.getIsEnabled() == null ? current.isEnabled() : payload.getIsEnabled();

        if (isProtectedAdminUser(current)) {
            boolean roleChange = payload.getRole() != null && !nextRole.equals(current.getRole());
            boolean enabledChange = payload.getIsEnabled() != null && nextEnabled != current.isEnabled();
            if (roleChange || enabledChange) {
                throw ApiException.badRequest("内置 admin 账号仅允许重置密码，不能修改角色或启用状态");
            }
        }

        if ("admin".equals(current.getRole()) && (!"admin".equals(nextRole) || !nextEnabled)) {
            if (userRepository.countByRoleAndEnabledTrueAndIdNot("admin", id) < 1) {
                throw ApiException.badRequest("至少保留一名启用中的管理员");
            }
        }

        if (actorUserId != null && actorUserId.equals(id) && !nextEnabled) {
            throw ApiException.badRequest("不能禁用当前登录账号");
        }

        if (payload.getPassword() != null && payload.getPassword().length() > 0) {
            if (payload.getPassword().length() < 6) {
                throw ApiException.badRequest("密码至少 6 位");
            }
            current.setPasswordHash(passwordEncoder.encode(payload.getPassword()));
        }
        current.setRole(nextRole);
        current.setEnabled(nextEnabled);
        current.setUpdatedAt(TimeUtils.now());
        AppUser saved = userRepository.save(current);
        if (!nextEnabled) {
            sessionRepository.deleteByUserId(id);
        }
        return DtoMapper.toUserDto(saved);
    }

    public static boolean isProtectedAdminUser(AppUser user) {
        return user != null && "admin".equalsIgnoreCase(user.getUsername());
    }

    private String randomToken() {
        byte[] data = new byte[32];
        random.nextBytes(data);
        char[] out = new char[data.length * 2];
        for (int i = 0; i < data.length; i++) {
            int v = data[i] & 0xFF;
            out[i * 2] = HEX[v >>> 4];
            out[i * 2 + 1] = HEX[v & 0x0F];
        }
        return new String(out);
    }

    public static final class LoginResult {
        public final UserDto user;
        public final String token;
        public final Instant expiresAt;

        public LoginResult(UserDto user, String token, Instant expiresAt) {
            this.user = user;
            this.token = token;
            this.expiresAt = expiresAt;
        }
    }
}
