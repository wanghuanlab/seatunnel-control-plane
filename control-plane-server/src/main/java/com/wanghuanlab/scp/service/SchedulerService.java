package com.wanghuanlab.scp.service;

import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

import javax.annotation.PreDestroy;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;

import com.wanghuanlab.scp.domain.TaskSchedule;
import com.wanghuanlab.scp.util.CronUtils;

@Service
public class SchedulerService {

    private static final Logger log = LoggerFactory.getLogger(SchedulerService.class);

    private final ThreadPoolTaskScheduler taskScheduler;
    private final ScheduleService scheduleService;
    private final TaskService taskService;
    private final Map<Long, ScheduledFuture<?>> jobs = new ConcurrentHashMap<Long, ScheduledFuture<?>>();
    private final Object reloadLock = new Object();
    private volatile boolean reloading;

    public SchedulerService(ThreadPoolTaskScheduler taskScheduler,
                            ScheduleService scheduleService,
                            TaskService taskService) {
        this.taskScheduler = taskScheduler;
        this.scheduleService = scheduleService;
        this.taskService = taskService;
    }

    public void reloadScheduler() {
        if (reloading) {
            return;
        }
        synchronized (reloadLock) {
            if (reloading) {
                return;
            }
            reloading = true;
            try {
                for (ScheduledFuture<?> job : jobs.values()) {
                    job.cancel(false);
                }
                jobs.clear();
                for (TaskSchedule schedule : scheduleService.listEnabledSchedules()) {
                    try {
                        String springCron = CronUtils.toSpringCron(schedule.getCronExpr());
                        CronTrigger trigger = new CronTrigger(
                                springCron,
                                TimeZone.getTimeZone(schedule.getTimezone() == null ? "Asia/Shanghai" : schedule.getTimezone()));
                        final Long taskId = schedule.getTaskId();
                        ScheduledFuture<?> future = taskScheduler.schedule(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    taskService.runTask(taskId);
                                    scheduleService.markScheduleTriggered(taskId, "SUCCESS", null);
                                    log.info("[scheduler] task {} triggered", taskId);
                                } catch (Exception error) {
                                    scheduleService.markScheduleTriggered(taskId, "FAILED",
                                            error.getMessage() == null ? String.valueOf(error) : error.getMessage());
                                    log.error("[scheduler] task {} failed: {}", taskId, error.getMessage());
                                }
                            }
                        }, trigger);
                        if (future != null) {
                            jobs.put(taskId, future);
                        }
                    } catch (Exception e) {
                        log.warn("Skip invalid cron for task {}: {}", schedule.getTaskId(), schedule.getCronExpr());
                    }
                }
                log.info("[scheduler] loaded {} schedule(s)", jobs.size());
            } finally {
                reloading = false;
            }
        }
    }

    @PreDestroy
    public void stopScheduler() {
        for (ScheduledFuture<?> job : jobs.values()) {
            job.cancel(false);
        }
        jobs.clear();
    }
}
