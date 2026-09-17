package com.wanghuanlab.scp.dto;

import lombok.Data;

@Data
public class TaskPayload {
    private String name;
    private String description;
    private String configFormat;
    private String configContent;
    private String defaultJobName;
    private Boolean isEnabled;
}
