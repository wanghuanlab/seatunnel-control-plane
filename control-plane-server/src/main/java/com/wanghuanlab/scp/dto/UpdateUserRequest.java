package com.wanghuanlab.scp.dto;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String role;
    private Boolean isEnabled;
    private String password;
}
