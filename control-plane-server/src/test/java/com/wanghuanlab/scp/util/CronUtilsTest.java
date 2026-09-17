package com.wanghuanlab.scp.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.springframework.scheduling.support.CronExpression;

import com.wanghuanlab.scp.dto.CronEditorConfig;
import com.wanghuanlab.scp.error.ApiException;
import com.wanghuanlab.scp.service.SettingsService;

class CronUtilsTest {

    @Test
    void dailyPresetBuildsUnixCron() {
        CronEditorConfig config = CronUtils.defaultCronConfig();
        assertEquals("0 9 * * *", CronUtils.buildCronExpression(config));
        assertEquals("0 0 9 * * *", CronUtils.toSpringCron(CronUtils.buildCronExpression(config)));
        CronExpression.parse(CronUtils.toSpringCron(CronUtils.buildCronExpression(config)));
    }

    @Test
    void everyMinuteAndHourlyAndWeekly() {
        CronEditorConfig everyMinute = new CronEditorConfig();
        everyMinute.setPreset("every_minute");
        assertEquals("* * * * *", CronUtils.buildCronExpression(everyMinute));

        CronEditorConfig hourly = new CronEditorConfig();
        hourly.setPreset("hourly");
        hourly.setMinute(15);
        assertEquals("15 * * * *", CronUtils.buildCronExpression(hourly));

        CronEditorConfig weekly = new CronEditorConfig();
        weekly.setPreset("weekly");
        weekly.setHour(8);
        weekly.setMinuteOfHour(30);
        weekly.setDaysOfWeek(Arrays.asList(1, 3, 5));
        assertEquals("30 8 * * 1,3,5", CronUtils.buildCronExpression(weekly));
    }

    @Test
    void customRequiresExpression() {
        CronEditorConfig custom = new CronEditorConfig();
        custom.setPreset("custom");
        ApiException ex = assertThrows(ApiException.class, new org.junit.jupiter.api.function.Executable() {
            @Override
            public void execute() {
                CronUtils.buildCronExpression(custom);
            }
        });
        assertEquals("请填写 Cron 表达式", ex.getMessage());
    }

    @Test
    void describeDaily() {
        String text = CronUtils.describeCronExpression(CronUtils.defaultCronConfig(), "Asia/Shanghai");
        assertTrue(text.contains("每天"));
        assertTrue(text.contains("09:00"));
    }

    @Test
    void weeklyRequiresAtLeastOneDay() {
        CronEditorConfig weekly = new CronEditorConfig();
        weekly.setPreset("weekly");
        weekly.setDaysOfWeek(Collections.<Integer>emptyList());
        ApiException ex = assertThrows(ApiException.class, new org.junit.jupiter.api.function.Executable() {
            @Override
            public void execute() {
                CronUtils.buildCronExpression(weekly);
            }
        });
        assertEquals("请至少选择一个星期", ex.getMessage());
    }
}

class SettingsNormalizeTest {

    @Test
    void stripsTrailingSlashAndRejectsBadScheme() {
        assertEquals("http://127.0.0.1:8080", SettingsService.normalizeSeatunnelBase("http://127.0.0.1:8080/"));
        ApiException ex = assertThrows(ApiException.class, new org.junit.jupiter.api.function.Executable() {
            @Override
            public void execute() {
                SettingsService.normalizeSeatunnelBase("ftp://example.com");
            }
        });
        assertEquals("API Base 仅支持 http:// 或 https://", ex.getMessage());
    }

    @Test
    void keepsNonRootPath() {
        assertEquals("http://127.0.0.1:8080/seatunnel",
                SettingsService.normalizeSeatunnelBase("http://127.0.0.1:8080/seatunnel/"));
    }
}
