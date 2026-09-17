package com.wanghuanlab.scp.util;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import com.wanghuanlab.scp.dto.CronEditorConfig;
import com.wanghuanlab.scp.error.ApiException;

public final class CronUtils {

    private static final String[] WEEKDAY_LABELS = {"周日", "周一", "周二", "周三", "周四", "周五", "周六"};

    private CronUtils() {
    }

    public static CronEditorConfig defaultCronConfig() {
        CronEditorConfig config = new CronEditorConfig();
        config.setPreset("daily");
        config.setHour(9);
        config.setMinuteOfHour(0);
        config.setDaysOfWeek(new ArrayList<Integer>(Arrays.asList(1, 2, 3, 4, 5)));
        config.setDayOfMonth(1);
        config.setMinute(0);
        config.setCustomExpr("0 9 * * *");
        return config;
    }

    public static String buildCronExpression(CronEditorConfig config) {
        if (config == null) {
            throw ApiException.badRequest("无效的调度配置");
        }
        String preset = config.getPreset() == null ? "daily" : config.getPreset();

        if ("custom".equals(preset)) {
            String expr = config.getCustomExpr() == null ? "" : config.getCustomExpr().trim();
            if (expr.isEmpty()) {
                throw ApiException.badRequest("请填写 Cron 表达式");
            }
            return expr;
        }
        if ("every_minute".equals(preset)) {
            return "* * * * *";
        }
        if ("hourly".equals(preset)) {
            int minute = clamp(config.getMinute() == null ? 0 : config.getMinute(), 0, 59, "分钟");
            return minute + " * * * *";
        }

        int minute = clamp(config.getMinuteOfHour() == null ? 0 : config.getMinuteOfHour(), 0, 59, "分钟");
        int hour = clamp(config.getHour() == null ? 9 : config.getHour(), 0, 23, "小时");

        if ("daily".equals(preset)) {
            return minute + " " + hour + " * * *";
        }
        if ("weekly".equals(preset)) {
            List<Integer> days = config.getDaysOfWeek() == null
                    ? Collections.singletonList(1)
                    : new ArrayList<Integer>(config.getDaysOfWeek());
            Set<Integer> unique = new LinkedHashSet<Integer>();
            for (Integer day : days) {
                unique.add(day);
            }
            if (unique.isEmpty()) {
                throw ApiException.badRequest("请至少选择一个星期");
            }
            List<Integer> sorted = new ArrayList<Integer>(unique);
            Collections.sort(sorted);
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < sorted.size(); i++) {
                int d = sorted.get(i);
                if (d < 0 || d > 6) {
                    throw ApiException.badRequest("星期取值无效");
                }
                if (i > 0) {
                    sb.append(',');
                }
                sb.append(d);
            }
            return minute + " " + hour + " * * " + sb;
        }
        if ("monthly".equals(preset)) {
            int dom = clamp(config.getDayOfMonth() == null ? 1 : config.getDayOfMonth(), 1, 31, "日期");
            return minute + " " + hour + " " + dom + " * *";
        }
        throw ApiException.badRequest("不支持的调度类型: " + preset);
    }

    public static String describeCronExpression(CronEditorConfig config, String timezone) {
        String tz = timezone == null || timezone.isEmpty() ? "Asia/Shanghai" : timezone;
        try {
            String expr = buildCronExpression(config);
            return describeRawCron(expr, tz, config);
        } catch (RuntimeException error) {
            return error.getMessage() == null ? String.valueOf(error) : error.getMessage();
        }
    }

    public static String describeRawCron(String expr, String timezone, CronEditorConfig config) {
        String tz = timezone == null || timezone.isEmpty() ? "Asia/Shanghai" : timezone;
        if (config != null && "every_minute".equals(config.getPreset())) {
            return "在 " + tz + " 时区，每分钟执行一次";
        }
        if (config != null && "hourly".equals(config.getPreset())) {
            int minute = config.getMinute() == null ? 0 : config.getMinute();
            return "在 " + tz + " 时区，每小时的第 " + minute + " 分钟执行";
        }
        if (config != null && "daily".equals(config.getPreset())) {
            return "在 " + tz + " 时区，每天 " + pad(config.getHour() == null ? 9 : config.getHour())
                    + ":" + pad(config.getMinuteOfHour() == null ? 0 : config.getMinuteOfHour()) + " 执行";
        }
        if (config != null && "weekly".equals(config.getPreset())) {
            List<Integer> days = config.getDaysOfWeek() == null
                    ? Collections.singletonList(1)
                    : config.getDaysOfWeek();
            StringBuilder labels = new StringBuilder();
            for (int i = 0; i < days.size(); i++) {
                int d = days.get(i);
                if (d >= 0 && d < WEEKDAY_LABELS.length) {
                    if (labels.length() > 0) {
                        labels.append('、');
                    }
                    labels.append(WEEKDAY_LABELS[d]);
                }
            }
            return "在 " + tz + " 时区，每周 " + labels + " 的 "
                    + pad(config.getHour() == null ? 9 : config.getHour()) + ":"
                    + pad(config.getMinuteOfHour() == null ? 0 : config.getMinuteOfHour()) + " 执行";
        }
        if (config != null && "monthly".equals(config.getPreset())) {
            return "在 " + tz + " 时区，每月 " + (config.getDayOfMonth() == null ? 1 : config.getDayOfMonth())
                    + " 日 " + pad(config.getHour() == null ? 9 : config.getHour()) + ":"
                    + pad(config.getMinuteOfHour() == null ? 0 : config.getMinuteOfHour()) + " 执行";
        }
        if (config != null && "custom".equals(config.getPreset())) {
            return "在 " + tz + " 时区，按 Cron 表达式执行：" + expr;
        }
        return "Cron: " + expr;
    }

    /**
     * Convert unix 5-field cron to Spring 6-field cron (with seconds).
     */
    public static String toSpringCron(String unixCron) {
        if (unixCron == null) {
            throw new IllegalArgumentException("cron expression is required");
        }
        String trimmed = unixCron.trim().replaceAll("\\s+", " ");
        String[] parts = trimmed.split(" ");
        if (parts.length == 5) {
            return "0 " + trimmed;
        }
        if (parts.length == 6) {
            return trimmed;
        }
        throw new IllegalArgumentException("unsupported cron expression: " + unixCron);
    }

    private static int clamp(int value, int min, int max, String label) {
        if (value < min || value > max) {
            throw ApiException.badRequest(label + "需在 " + min + "-" + max + " 之间");
        }
        return value;
    }

    private static String pad(int n) {
        return n < 10 ? "0" + n : String.valueOf(n);
    }
}
