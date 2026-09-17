package com.wanghuanlab.scp.dto;

import lombok.Data;

@Data
public class CreateUserRequest {
    private String username;
    private String password;
    private String role;
    private Boolean isEnabled;
}
