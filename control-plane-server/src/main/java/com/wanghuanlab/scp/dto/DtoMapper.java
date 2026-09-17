package com.wanghuanlab.scp.dto;

import java.util.LinkedHashMap;
import java.util.Map;

import com.wanghuanlab.scp.domain.AppUser;
import com.wanghuanlab.scp.domain.Task;
import com.wanghuanlab.scp.domain.TaskRun;
import com.wanghuanlab.scp.domain.TaskSchedule;
import com.wanghuanlab.scp.util.CronUtils;
import com.wanghuanlab.scp.util.TimeUtils;

public final class DtoMapper {

    private DtoMapper() {
    }

    public static UserDto toUserDto(AppUser user) {
        if (user == null) {
            return null;
        }
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setRole(user.getRole());
        dto.setEnabled(user.isEnabled());
        dto.setCreatedAt(TimeUtils.toIso(user.getCreatedAt()));
        dto.setUpdatedAt(TimeUtils.toIso(user.getUpdatedAt()));
        return dto;
    }

    public static Map<String, Object> toTaskDto(Task task, Map<String, Object> schedule) {
        Map<String, Object> dto = new LinkedHashMap<String, Object>();
        dto.put("id", task.getId());
        dto.put("name", task.getName());
        dto.put("description", task.getDescription());
        dto.put("configFormat", task.getConfigFormat());
        dto.put("configContent", task.getConfigContent());
        dto.put("defaultJobName", task.getDefaultJobName());
        dto.put("createdAt", TimeUtils.toIso(task.getCreatedAt()));
        dto.put("updatedAt", TimeUtils.toIso(task.getUpdatedAt()));
        dto.put("lastRunAt", TimeUtils.toIso(task.getLastRunAt()));
        dto.put("lastJobId", task.getLastJobId());
        dto.put("lastJobStatus", task.getLastJobStatus());
        dto.put("lastErrorMsg", task.getLastErrorMsg());
        dto.put("isEnabled", task.isEnabled());
        dto.put("schedule", schedule);
        return dto;
    }

    public static Map<String, Object> toRunDto(TaskRun run) {
        Map<String, Object> dto = new LinkedHashMap<String, Object>();
        dto.put("id", run.getId());
        dto.put("taskId", run.getTask().getId());
        dto.put("jobId", run.getJobId());
        dto.put("jobName", run.getJobName());
        dto.put("status", run.getStatus());
        dto.put("errorMsg", run.getErrorMsg());
        dto.put("startedAt", TimeUtils.toIso(run.getStartedAt()));
        dto.put("finishedAt", TimeUtils.toIso(run.getFinishedAt()));
        return dto;
    }

    public static Map<String, Object> toScheduleDto(TaskSchedule row, boolean includeErrorAndUpdated) {
        if (row == null) {
            return null;
        }
        CronEditorConfig cronConfig = parseCronConfig(row.getCronConfig());
        String timezone = row.getTimezone() == null || row.getTimezone().isEmpty() ? "Asia/Shanghai" : row.getTimezone();
        Map<String, Object> dto = new LinkedHashMap<String, Object>();
        dto.put("taskId", row.getTaskId());
        dto.put("enabled", row.isEnabled());
        dto.put("cronExpr", row.getCronExpr());
        dto.put("cronConfig", cronConfig);
        dto.put("timezone", timezone);
        dto.put("description", CronUtils.describeCronExpression(cronConfig, timezone));
        dto.put("nextRunAt", TimeUtils.toIso(row.getNextRunAt()));
        dto.put("lastTriggerAt", TimeUtils.toIso(row.getLastTriggerAt()));
        dto.put("lastTriggerStatus", row.getLastTriggerStatus());
        if (includeErrorAndUpdated) {
            dto.put("lastTriggerError", row.getLastTriggerError());
            dto.put("updatedAt", TimeUtils.toIso(row.getUpdatedAt()));
        }
        return dto;
    }

    public static CronEditorConfig parseCronConfig(String value) {
        if (value == null || value.isEmpty()) {
            return CronUtils.defaultCronConfig();
        }
        try {
            CronEditorConfig parsed = Jsons.MAPPER.readValue(value, CronEditorConfig.class);
            return parsed == null ? CronUtils.defaultCronConfig() : parsed;
        } catch (Exception e) {
            return CronUtils.defaultCronConfig();
        }
    }
}
