package com.wanghuanlab.scp.repo;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.wanghuanlab.scp.domain.TaskSchedule;

public interface TaskScheduleRepository extends JpaRepository<TaskSchedule, Long> {

    List<TaskSchedule> findByTaskIdIn(Collection<Long> taskIds);

    @Query("select s from TaskSchedule s, Task t where s.taskId = t.id and s.enabled = true and t.enabled = true")
    List<TaskSchedule> findEnabledWithEnabledTask();
}
