import { dbAll, dbGet, dbRun, nowIso, toBool, toIso } from './db.mjs'
import { attachScheduleSummary } from './schedules.mjs'
import { fetchJobInfo, isActiveJobStatus, submitJobToSeatunnel } from './seatunnel.mjs'

function mapTask(row) {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    configFormat: row.config_format,
    configContent: row.config_content,
    defaultJobName: row.default_job_name,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    lastRunAt: toIso(row.last_run_at),
    lastJobId: row.last_job_id,
    lastJobStatus: row.last_job_status,
    lastErrorMsg: row.last_error_msg,
    isEnabled: toBool(row.is_enabled),
  }
}

function mapRun(row) {
  return {
    id: Number(row.id),
    taskId: Number(row.task_id),
    jobId: row.job_id,
    jobName: row.job_name,
    status: row.status,
    errorMsg: row.error_msg,
    startedAt: toIso(row.started_at),
    finishedAt: toIso(row.finished_at),
  }
}

async function syncTaskStatus(taskRow) {
  if (!taskRow.last_job_id || !isActiveJobStatus(taskRow.last_job_status)) {
    return taskRow
  }

  try {
    const info = await fetchJobInfo(taskRow.last_job_id)
    const status = String(info.jobStatus || taskRow.last_job_status).toUpperCase()
    const errorMsg = info.errorMsg || null
    const finished = !isActiveJobStatus(status)
    const finishedAt = finished ? nowIso() : null

    dbRun(
      `UPDATE tasks SET last_job_status = ?, last_error_msg = ?, updated_at = ? WHERE id = ?`,
      [status, errorMsg, nowIso(), taskRow.id],
    )
    dbRun(
      `UPDATE task_runs SET status = ?, error_msg = ?, finished_at = CASE WHEN ? = 1 THEN ? ELSE finished_at END
       WHERE task_id = ? AND job_id = ?`,
      [status, errorMsg, finished ? 1 : 0, finishedAt, taskRow.id, taskRow.last_job_id],
    )

    return {
      ...taskRow,
      last_job_status: status,
      last_error_msg: errorMsg,
    }
  } catch {
    return taskRow
  }
}

export async function listTasks({ sync = true } = {}) {
  const rows = dbAll('SELECT * FROM tasks ORDER BY updated_at DESC')
  const synced = sync
    ? await Promise.all(rows.map((row) => syncTaskStatus(row)))
    : rows
  return attachScheduleSummary(synced.map(mapTask))
}

export async function getTask(id) {
  const row = dbGet('SELECT * FROM tasks WHERE id = ?', [id])
  if (!row) return null
  const synced = await syncTaskStatus(row)
  const [task] = await attachScheduleSummary([mapTask(synced)])
  return task
}

export async function createTask(payload) {
  const ts = nowIso()
  const row = dbGet(
    `INSERT INTO tasks (name, description, config_format, config_content, default_job_name, is_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [
      payload.name,
      payload.description || null,
      payload.configFormat || 'hocon',
      payload.configContent,
      payload.defaultJobName || null,
      payload.isEnabled !== false ? 1 : 0,
      ts,
      ts,
    ],
  )
  return mapTask(row)
}

export async function updateTask(id, payload) {
  const row = dbGet(
    `UPDATE tasks SET
       name = COALESCE(?, name),
       description = COALESCE(?, description),
       config_format = COALESCE(?, config_format),
       config_content = COALESCE(?, config_content),
       default_job_name = COALESCE(?, default_job_name),
       is_enabled = COALESCE(?, is_enabled),
       updated_at = ?
     WHERE id = ?
     RETURNING *`,
    [
      payload.name ?? null,
      payload.description ?? null,
      payload.configFormat ?? null,
      payload.configContent ?? null,
      payload.defaultJobName ?? null,
      payload.isEnabled === undefined ? null : payload.isEnabled ? 1 : 0,
      nowIso(),
      id,
    ],
  )
  if (!row) return null
  return mapTask(row)
}

export async function deleteTask(id) {
  const result = dbRun('DELETE FROM tasks WHERE id = ?', [id])
  return result.changes > 0
}

export async function runTask(id) {
  const task = dbGet('SELECT * FROM tasks WHERE id = ?', [id])
  if (!task) return null
  if (!toBool(task.is_enabled)) {
    throw new Error('任务已禁用，无法运行')
  }

  const jobName = task.default_job_name || `${task.name}_${Date.now()}`
  const result = await submitJobToSeatunnel({
    configFormat: task.config_format,
    configContent: task.config_content,
    jobName,
  })

  const jobId = String(result.jobId)
  const submittedStatus = 'SUBMITTED'
  const ts = nowIso()

  dbRun(
    `UPDATE tasks SET
       last_run_at = ?,
       last_job_id = ?,
       last_job_status = ?,
       last_error_msg = NULL,
       updated_at = ?
     WHERE id = ?`,
    [ts, jobId, submittedStatus, ts, id],
  )

  const runRow = dbGet(
    `INSERT INTO task_runs (task_id, job_id, job_name, status, started_at)
     VALUES (?, ?, ?, ?, ?)
     RETURNING *`,
    [id, jobId, result.jobName || jobName, submittedStatus, ts],
  )

  return {
    task: mapTask({
      ...task,
      last_run_at: ts,
      last_job_id: jobId,
      last_job_status: submittedStatus,
      last_error_msg: null,
      updated_at: ts,
    }),
    run: mapRun(runRow),
    submitResult: result,
  }
}

export async function listTaskRuns(taskId, { page = 1, rows = 20 } = {}) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeRows = Math.min(200, Math.max(1, Number(rows) || 20))
  const total = Number(dbGet('SELECT COUNT(*) AS c FROM task_runs WHERE task_id = ?', [taskId])?.c || 0)
  const offset = (safePage - 1) * safeRows
  const list = dbAll(
    'SELECT * FROM task_runs WHERE task_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?',
    [taskId, safeRows, offset],
  )

  const synced = await Promise.all(
    list.map(async (row) => {
      if (!isActiveJobStatus(row.status)) return row
      try {
        const info = await fetchJobInfo(row.job_id)
        const status = String(info.jobStatus || row.status).toUpperCase()
        const errorMsg = info.errorMsg || null
        const finished = !isActiveJobStatus(status)
        const finishedAt = finished ? nowIso() : row.finished_at
        dbRun(
          `UPDATE task_runs SET status = ?, error_msg = ?, finished_at = CASE WHEN ? = 1 THEN ? ELSE finished_at END WHERE id = ?`,
          [status, errorMsg, finished ? 1 : 0, finishedAt, row.id],
        )
        return { ...row, status, error_msg: errorMsg, finished_at: finished ? finishedAt : row.finished_at }
      } catch {
        return row
      }
    }),
  )

  return {
    data: synced.map(mapRun),
    total,
    page: safePage,
    rows: safeRows,
  }
}
