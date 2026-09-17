package com.wanghuanlab.scp.domain;

import java.time.Instant;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "tasks", indexes = {
        @Index(name = "idx_tasks_updated_at", columnList = "updated_at")
})
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "config_format", nullable = false, length = 16)
    private String configFormat = "hocon";

    @Column(name = "config_content", nullable = false, columnDefinition = "TEXT")
    private String configContent;

    @Column(name = "default_job_name")
    private String defaultJobName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "last_run_at")
    private Instant lastRunAt;

    @Column(name = "last_job_id")
    private String lastJobId;

    @Column(name = "last_job_status", nullable = false)
    private String lastJobStatus = "IDLE";

    @Column(name = "last_error_msg", columnDefinition = "TEXT")
    private String lastErrorMsg;

    @Column(name = "is_enabled", nullable = false)
    private boolean enabled = true;
}
