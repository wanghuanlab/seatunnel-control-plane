package com.wanghuanlab.scp.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.wanghuanlab.scp.domain.Task;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findAllByOrderByUpdatedAtDesc();
}
