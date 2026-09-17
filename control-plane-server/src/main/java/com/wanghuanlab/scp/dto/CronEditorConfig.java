package com.wanghuanlab.scp.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CronEditorConfig {
    private String preset;
    private Integer minute;
    private Integer hour;
    private Integer minuteOfHour;
    private List<Integer> daysOfWeek;
    private Integer dayOfMonth;
    private String customExpr;
}
