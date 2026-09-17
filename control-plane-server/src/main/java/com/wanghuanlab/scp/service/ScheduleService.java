package com.wanghuanlab.scp.service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wanghuanlab.scp.domain.TaskSchedule;
import com.wanghuanlab.scp.dto.CronEditorConfig;
import com.wanghuanlab.scp.dto.DtoMapper;
import com.wanghuanlab.scp.dto.Jsons;
import com.wanghuanlab.scp.dto.TaskSchedulePayload;
import com.wanghuanlab.scp.error.ApiException;
import com.wanghuanlab.scp.repo.TaskRepository;
import com.wanghuanlab.scp.repo.TaskScheduleRepository;
import com.wanghuanlab.scp.util.CronUtils;
import com.wanghuanlab.scp.util.TimeUtils;

@Service
public class ScheduleService {

    private final TaskRepository taskRepository;
    private final TaskScheduleRepository scheduleRepository;

    public ScheduleService(TaskRepository taskRepository, TaskScheduleRepository scheduleRepository) {
        this.taskRepository = taskRepository;
        this.scheduleRepository = scheduleRepository;
    }

    public static Instant computeNextRunAt(String cronExpr, String timezone) {
        try {
            String springCron = CronUtils.toSpringCron(cronExpr);
            CronExpression expression = CronExpression.parse(springCron);
            ZoneId zone = ZoneId.of(timezone == null || timezone.isEmpty() ? "Asia/Shanghai" : timezone);
            ZonedDateTime next = expression.next(ZonedDateTime.now(zone));
            return next == null ? null : next.toInstant();
        } catch (Exception e) {
            return null;
        }
    }

    @Transactional
    public Map<String, Object> getTaskSchedule(Long taskId) {
        TaskSchedule row = ensureScheduleRow(taskId);
        if (row == null) {
            return null;
        }
        return DtoMapper.toScheduleDto(row, true);
    }

    @Transactional
    public Map<String, Object> saveTaskSchedule(Long taskId, TaskSchedulePayload payload) {
        TaskSchedule existing = ensureScheduleRow(taskId);
        if (existing == null) {
            throw ApiException.badRequest("Task not found");
        }
        CronEditorConfig cronConfig = payload.getCronConfig() == null ? CronUtils.defaultCronConfig() : payload.getCronConfig();
        String cronExpr = CronUtils.buildCronExpression(cronConfig);
        String timezone = payload.getTimezone() == null || payload.getTimezone().isEmpty() ? "Asia/Shanghai" : payload.getTimezone();
        boolean enabled = Boolean.TRUE.equals(payload.getEnabled());
        Instant nextRunAt = enabled ? computeNextRunAt(cronExpr, timezone) : null;

        existing.setEnabled(enabled);
        existing.setCronExpr(cronExpr);
        existing.setCronConfig(writeJson(cronConfig));
        existing.setTimezone(timezone);
        existing.setNextRunAt(nextRunAt);
        existing.setUpdatedAt(TimeUtils.now());
        return DtoMapper.toScheduleDto(scheduleRepository.save(existing), true);
    }

    @Transactional(readOnly = true)
    public List<TaskSchedule> listEnabledSchedules() {
        return scheduleRepository.findEnabledWithEnabledTask();
    }

    @Transactional
    public void markScheduleTriggered(Long taskId, String status, String error) {
        TaskSchedule row = scheduleRepository.findById(taskId).orElse(null);
        if (row == null) {
            return;
        }
        Instant now = TimeUtils.now();
        row.setLastTriggerAt(now);
        row.setLastTriggerStatus(status);
        row.setLastTriggerError(error);
        row.setNextRunAt(computeNextRunAt(row.getCronExpr(), row.getTimezone()));
        row.setUpdatedAt(now);
        scheduleRepository.save(row);
    }

    @Transactional(readOnly = true)
    public Map<Long, Map<String, Object>> loadScheduleSummaries(List<Long> taskIds) {
        if (taskIds == null || taskIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<TaskSchedule> rows = scheduleRepository.findByTaskIdIn(taskIds);
        Map<Long, Map<String, Object>> map = new HashMap<Long, Map<String, Object>>();
        for (TaskSchedule row : rows) {
            map.put(row.getTaskId(), DtoMapper.toScheduleDto(row, false));
        }
        return map;
    }

    private TaskSchedule ensureScheduleRow(Long taskId) {
        if (!taskRepository.existsById(taskId)) {
            return null;
        }
        TaskSchedule existing = scheduleRepository.findById(taskId).orElse(null);
        if (existing != null) {
            return existing;
        }
        CronEditorConfig config = CronUtils.defaultCronConfig();
        String cronExpr = CronUtils.buildCronExpression(config);
        TaskSchedule created = new TaskSchedule();
        created.setTaskId(taskId);
        created.setEnabled(false);
        created.setCronExpr(cronExpr);
        created.setCronConfig(writeJson(config));
        created.setTimezone("Asia/Shanghai");
        created.setNextRunAt(computeNextRunAt(cronExpr, "Asia/Shanghai"));
        created.setUpdatedAt(TimeUtils.now());
        return scheduleRepository.save(created);
    }

    private static String writeJson(Object value) {
        try {
            return Jsons.MAPPER.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
