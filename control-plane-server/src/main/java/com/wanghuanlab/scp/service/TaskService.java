package com.wanghuanlab.scp.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wanghuanlab.scp.domain.Task;
import com.wanghuanlab.scp.domain.TaskRun;
import com.wanghuanlab.scp.dto.DtoMapper;
import com.wanghuanlab.scp.dto.TaskPayload;
import com.wanghuanlab.scp.error.ApiException;
import com.wanghuanlab.scp.repo.TaskRepository;
import com.wanghuanlab.scp.repo.TaskRunRepository;
import com.wanghuanlab.scp.repo.TaskScheduleRepository;
import com.wanghuanlab.scp.util.TimeUtils;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskRunRepository taskRunRepository;
    private final TaskScheduleRepository taskScheduleRepository;
    private final ScheduleService scheduleService;
    private final SeatunnelClient seatunnelClient;

    public TaskService(TaskRepository taskRepository,
                       TaskRunRepository taskRunRepository,
                       TaskScheduleRepository taskScheduleRepository,
                       ScheduleService scheduleService,
                       SeatunnelClient seatunnelClient) {
        this.taskRepository = taskRepository;
        this.taskRunRepository = taskRunRepository;
        this.taskScheduleRepository = taskScheduleRepository;
        this.scheduleService = scheduleService;
        this.seatunnelClient = seatunnelClient;
    }

    @Transactional
    public List<Map<String, Object>> listTasks(boolean sync) {
        List<Task> rows = taskRepository.findAllByOrderByUpdatedAtDesc();
        List<Task> synced = new ArrayList<Task>();
        for (Task row : rows) {
            synced.add(sync ? syncTaskStatus(row) : row);
        }
        return attachScheduleSummary(synced);
    }

    @Transactional
    public Map<String, Object> getTask(Long id) {
        Task row = taskRepository.findById(id).orElse(null);
        if (row == null) {
            return null;
        }
        Task synced = syncTaskStatus(row);
        List<Map<String, Object>> wrapped = attachScheduleSummary(java.util.Collections.singletonList(synced));
        return wrapped.get(0);
    }

    @Transactional
    public Map<String, Object> createTask(TaskPayload payload) {
        Instant now = TimeUtils.now();
        Task task = new Task();
        task.setName(payload.getName());
        task.setDescription(payload.getDescription());
        task.setConfigFormat(payload.getConfigFormat() == null || payload.getConfigFormat().isEmpty() ? "hocon" : payload.getConfigFormat());
        task.setConfigContent(payload.getConfigContent());
        task.setDefaultJobName(payload.getDefaultJobName());
        task.setEnabled(payload.getIsEnabled() == null || Boolean.TRUE.equals(payload.getIsEnabled()));
        task.setLastJobStatus("IDLE");
        task.setCreatedAt(now);
        task.setUpdatedAt(now);
        Task saved = taskRepository.save(task);
        return DtoMapper.toTaskDto(saved, null);
    }

    @Transactional
    public Map<String, Object> updateTask(Long id, TaskPayload payload) {
        Task task = taskRepository.findById(id).orElse(null);
        if (task == null) {
            return null;
        }
        if (payload.getName() != null) {
            task.setName(payload.getName());
        }
        if (payload.getDescription() != null) {
            task.setDescription(payload.getDescription());
        }
        if (payload.getConfigFormat() != null) {
            task.setConfigFormat(payload.getConfigFormat());
        }
        if (payload.getConfigContent() != null) {
            task.setConfigContent(payload.getConfigContent());
        }
        if (payload.getDefaultJobName() != null) {
            task.setDefaultJobName(payload.getDefaultJobName());
        }
        if (payload.getIsEnabled() != null) {
            task.setEnabled(payload.getIsEnabled());
        }
        task.setUpdatedAt(TimeUtils.now());
        return DtoMapper.toTaskDto(taskRepository.save(task), null);
    }

    @Transactional
    public boolean deleteTask(Long id) {
        if (!taskRepository.existsById(id)) {
            return false;
        }
        taskRunRepository.deleteByTaskId(id);
        taskScheduleRepository.deleteById(id);
        taskRepository.deleteById(id);
        return true;
    }

    @Transactional
    public Map<String, Object> runTask(Long id) {
        Task task = taskRepository.findById(id).orElse(null);
        if (task == null) {
            return null;
        }
        if (!task.isEnabled()) {
            throw ApiException.badRequest("任务已禁用，无法运行");
        }
        String jobName = task.getDefaultJobName() == null || task.getDefaultJobName().isEmpty()
                ? task.getName() + "_" + System.currentTimeMillis()
                : task.getDefaultJobName();
        Map<String, Object> result;
        try {
            result = seatunnelClient.submitJob(task.getConfigFormat(), task.getConfigContent(), jobName);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.badRequest(e.getMessage() == null ? String.valueOf(e) : e.getMessage());
        }
        Object jobIdValue = result.get("jobId");
        if (jobIdValue == null) {
            throw ApiException.badRequest("SeaTunnel submit failed: missing jobId");
        }
        String jobId = String.valueOf(jobIdValue);
        Instant now = TimeUtils.now();
        String submittedStatus = "SUBMITTED";
        task.setLastRunAt(now);
        task.setLastJobId(jobId);
        task.setLastJobStatus(submittedStatus);
        task.setLastErrorMsg(null);
        task.setUpdatedAt(now);
        taskRepository.save(task);

        TaskRun run = new TaskRun();
        run.setTask(task);
        run.setJobId(jobId);
        Object submittedName = result.get("jobName");
        run.setJobName(submittedName == null ? jobName : String.valueOf(submittedName));
        run.setStatus(submittedStatus);
        run.setStartedAt(now);
        TaskRun savedRun = taskRunRepository.save(run);

        Map<String, Object> dto = new LinkedHashMap<String, Object>();
        dto.put("task", DtoMapper.toTaskDto(task, null));
        dto.put("run", DtoMapper.toRunDto(savedRun));
        dto.put("submitResult", result);
        return dto;
    }

    @Transactional
    public Map<String, Object> listTaskRuns(Long taskId, int page, int rows) {
        int safePage = Math.max(1, page);
        int safeRows = Math.min(200, Math.max(1, rows));
        Page<TaskRun> result = taskRunRepository.findByTaskIdOrderByStartedAtDesc(
                taskId, PageRequest.of(safePage - 1, safeRows));
        List<Map<String, Object>> data = new ArrayList<Map<String, Object>>();
        for (TaskRun row : result.getContent()) {
            data.add(DtoMapper.toRunDto(syncRunStatus(row)));
        }
        Map<String, Object> dto = new LinkedHashMap<String, Object>();
        dto.put("data", data);
        dto.put("total", result.getTotalElements());
        dto.put("page", safePage);
        dto.put("rows", safeRows);
        return dto;
    }

    private List<Map<String, Object>> attachScheduleSummary(List<Task> tasks) {
        List<Long> ids = new ArrayList<Long>();
        for (Task task : tasks) {
            ids.add(task.getId());
        }
        Map<Long, Map<String, Object>> schedules = scheduleService.loadScheduleSummaries(ids);
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        for (Task task : tasks) {
            result.add(DtoMapper.toTaskDto(task, schedules.get(task.getId())));
        }
        return result;
    }

    private Task syncTaskStatus(Task task) {
        if (task.getLastJobId() == null || task.getLastJobId().isEmpty() || !SeatunnelClient.isActiveJobStatus(task.getLastJobStatus())) {
            return task;
        }
        try {
            Map<String, Object> info = seatunnelClient.fetchJobInfo(task.getLastJobId());
            String status = String.valueOf(info.get("jobStatus") == null ? task.getLastJobStatus() : info.get("jobStatus")).toUpperCase();
            String errorMsg = info.get("errorMsg") == null ? null : String.valueOf(info.get("errorMsg"));
            boolean finished = !SeatunnelClient.isActiveJobStatus(status);
            Instant finishedAt = finished ? TimeUtils.now() : null;
            Instant now = TimeUtils.now();
            task.setLastJobStatus(status);
            task.setLastErrorMsg(errorMsg);
            task.setUpdatedAt(now);
            taskRepository.save(task);

            List<TaskRun> runs = taskRunRepository.findByTaskIdOrderByStartedAtDesc(task.getId(), PageRequest.of(0, 50)).getContent();
            for (TaskRun run : runs) {
                if (task.getLastJobId().equals(run.getJobId())) {
                    run.setStatus(status);
                    run.setErrorMsg(errorMsg);
                    if (finished) {
                        run.setFinishedAt(finishedAt);
                    }
                    taskRunRepository.save(run);
                    break;
                }
            }
            return task;
        } catch (Exception e) {
            return task;
        }
    }

    private TaskRun syncRunStatus(TaskRun row) {
        if (!SeatunnelClient.isActiveJobStatus(row.getStatus())) {
            return row;
        }
        try {
            Map<String, Object> info = seatunnelClient.fetchJobInfo(row.getJobId());
            String status = String.valueOf(info.get("jobStatus") == null ? row.getStatus() : info.get("jobStatus")).toUpperCase();
            String errorMsg = info.get("errorMsg") == null ? null : String.valueOf(info.get("errorMsg"));
            boolean finished = !SeatunnelClient.isActiveJobStatus(status);
            row.setStatus(status);
            row.setErrorMsg(errorMsg);
            if (finished) {
                row.setFinishedAt(TimeUtils.now());
            }
            return taskRunRepository.save(row);
        } catch (Exception e) {
            return row;
        }
    }
}
