package com.wanghuanlab.scp.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
public class UserDto {
    private Long id;
    private String username;
    private String role;
    @JsonProperty("isEnabled")
    private boolean enabled;
    private String createdAt;
    private String updatedAt;
}
