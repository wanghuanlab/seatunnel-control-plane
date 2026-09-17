package com.wanghuanlab.scp.web;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wanghuanlab.scp.dto.TaskPayload;
import com.wanghuanlab.scp.dto.TaskSchedulePayload;
import com.wanghuanlab.scp.error.ApiException;
import com.wanghuanlab.scp.service.SchedulerService;
import com.wanghuanlab.scp.service.ScheduleService;
import com.wanghuanlab.scp.service.TaskService;

@RestController
public class TasksController {

    private final TaskService taskService;
    private final ScheduleService scheduleService;
    private final SchedulerService schedulerService;

    public TasksController(TaskService taskService,
                           ScheduleService scheduleService,
                           SchedulerService schedulerService) {
        this.taskService = taskService;
        this.scheduleService = scheduleService;
        this.schedulerService = schedulerService;
    }

    @GetMapping("/api/tasks")
    public Object list(@RequestParam(name = "sync", required = false) String sync) {
        boolean doSync = !"false".equals(sync);
        return taskService.listTasks(doSync);
    }

    @PostMapping("/api/tasks")
    public ResponseEntity<Map<String, Object>> create(@RequestBody TaskPayload body) {
        if (body == null || isBlank(body.getName()) || isBlank(body.getConfigContent())) {
            throw ApiException.badRequest("name and configContent are required");
        }
        return ResponseEntity.status(201).body(taskService.createTask(body));
    }

    @GetMapping("/api/tasks/{id}")
    public Map<String, Object> get(@PathVariable("id") Long id) {
        Map<String, Object> task = taskService.getTask(id);
        if (task == null) {
            throw ApiException.notFound("Task not found");
        }
        return task;
    }

    @PutMapping("/api/tasks/{id}")
    public Map<String, Object> update(@PathVariable("id") Long id, @RequestBody(required = false) TaskPayload body) {
        Map<String, Object> task = taskService.updateTask(id, body == null ? new TaskPayload() : body);
        if (task == null) {
            throw ApiException.notFound("Task not found");
        }
        return task;
    }

    @DeleteMapping("/api/tasks/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
        if (!taskService.deleteTask(id)) {
            throw ApiException.notFound("Task not found");
        }
        schedulerService.reloadScheduler();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/tasks/{id}/run")
    public Map<String, Object> run(@PathVariable("id") Long id) {
        Map<String, Object> result = taskService.runTask(id);
        if (result == null) {
            throw ApiException.notFound("Task not found");
        }
        return result;
    }

    @GetMapping("/api/tasks/{id}/runs")
    public Map<String, Object> runs(@PathVariable("id") Long id,
                                    @RequestParam(name = "page", required = false, defaultValue = "1") int page,
                                    @RequestParam(name = "rows", required = false, defaultValue = "20") int rows) {
        return taskService.listTaskRuns(id, page, rows);
    }

    @GetMapping("/api/tasks/{id}/schedule")
    public Map<String, Object> getSchedule(@PathVariable("id") Long id) {
        Map<String, Object> schedule = scheduleService.getTaskSchedule(id);
        if (schedule == null) {
            throw ApiException.notFound("Task not found");
        }
        return schedule;
    }

    @PutMapping("/api/tasks/{id}/schedule")
    public Map<String, Object> saveSchedule(@PathVariable("id") Long id,
                                            @RequestBody(required = false) TaskSchedulePayload body) {
        Map<String, Object> schedule = scheduleService.saveTaskSchedule(id, body == null ? new TaskSchedulePayload() : body);
        schedulerService.reloadScheduler();
        return schedule;
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
