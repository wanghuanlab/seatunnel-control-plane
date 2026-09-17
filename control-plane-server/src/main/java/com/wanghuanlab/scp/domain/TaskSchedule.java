package com.wanghuanlab.scp.domain;

import java.time.Instant;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "task_schedules", indexes = {
        @Index(name = "idx_task_schedules_enabled", columnList = "enabled, next_run_at")
})
public class TaskSchedule {

    @Id
    @Column(name = "task_id")
    private Long taskId;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "cron_expr", nullable = false)
    private String cronExpr = "0 9 * * *";

    @Column(name = "cron_config", nullable = false, columnDefinition = "TEXT")
    private String cronConfig;

    @Column(nullable = false)
    private String timezone = "Asia/Shanghai";

    @Column(name = "next_run_at")
    private Instant nextRunAt;

    @Column(name = "last_trigger_at")
    private Instant lastTriggerAt;

    @Column(name = "last_trigger_status")
    private String lastTriggerStatus;

    @Column(name = "last_trigger_error", columnDefinition = "TEXT")
    private String lastTriggerError;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
