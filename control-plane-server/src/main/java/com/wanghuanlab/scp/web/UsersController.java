package com.wanghuanlab.scp.web;

import java.util.ArrayList;
import java.util.List;

import javax.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.wanghuanlab.scp.domain.AppUser;
import com.wanghuanlab.scp.dto.CreateUserRequest;
import com.wanghuanlab.scp.dto.DtoMapper;
import com.wanghuanlab.scp.dto.UpdateUserRequest;
import com.wanghuanlab.scp.dto.UserDto;
import com.wanghuanlab.scp.error.ApiException;
import com.wanghuanlab.scp.service.AuthService;

@RestController
public class UsersController {

    private final AuthService authService;

    public UsersController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/api/users")
    public List<UserDto> list(HttpServletRequest request) {
        requireAdmin(request);
        List<UserDto> users = new ArrayList<UserDto>();
        for (AppUser user : authService.listUsers()) {
            users.add(DtoMapper.toUserDto(user));
        }
        return users;
    }

    @PostMapping("/api/users")
    public org.springframework.http.ResponseEntity<UserDto> create(HttpServletRequest request,
                                                                   @RequestBody CreateUserRequest body) {
        requireAdmin(request);
        return org.springframework.http.ResponseEntity.status(HttpStatus.CREATED).body(authService.createUser(body));
    }

    @PutMapping("/api/users/{id}")
    public UserDto update(HttpServletRequest request,
                          @PathVariable("id") Long id,
                          @RequestBody(required = false) UpdateUserRequest body) {
        UserDto actor = requireAdmin(request);
        return authService.updateUser(id, body == null ? new UpdateUserRequest() : body, actor.getId());
    }

    private static UserDto requireAdmin(HttpServletRequest request) {
        UserDto user = AuthFilter.currentUser(request);
        if (user == null) {
            throw ApiException.unauthorized("未登录或会话已过期");
        }
        if (!"admin".equals(user.getRole())) {
            throw ApiException.forbidden("需要管理员权限");
        }
        return user;
    }
}
