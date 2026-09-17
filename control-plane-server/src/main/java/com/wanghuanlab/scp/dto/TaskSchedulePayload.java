package com.wanghuanlab.scp.dto;

import lombok.Data;

@Data
public class TaskSchedulePayload {
    private Boolean enabled;
    private String timezone;
    private CronEditorConfig cronConfig;
}
