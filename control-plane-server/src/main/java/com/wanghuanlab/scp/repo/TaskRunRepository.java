package com.wanghuanlab.scp.repo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.wanghuanlab.scp.domain.TaskRun;

public interface TaskRunRepository extends JpaRepository<TaskRun, Long> {

    Page<TaskRun> findByTaskIdOrderByStartedAtDesc(Long taskId, Pageable pageable);

    void deleteByTaskId(Long taskId);
}
