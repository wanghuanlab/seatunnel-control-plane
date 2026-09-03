import { getPool } from './db.mjs'
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
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    lastRunAt: row.last_run_at?.toISOString?.() || row.last_run_at || null,
    lastJobId: row.last_job_id,
    lastJobStatus: row.last_job_status,
    lastErrorMsg: row.last_error_msg,
    isEnabled: row.is_enabled,
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
    startedAt: row.started_at?.toISOString?.() || row.started_at,
    finishedAt: row.finished_at?.toISOString?.() || row.finished_at || null,
  }
}

async function syncTaskStatus(client, taskRow) {
  if (!taskRow.last_job_id || !isActiveJobStatus(taskRow.last_job_status)) {
    return taskRow
  }

  try {
    const info = await fetchJobInfo(taskRow.last_job_id)
    const status = String(info.jobStatus || taskRow.last_job_status).toUpperCase()
    const errorMsg = info.errorMsg || null
    const finished = !isActiveJobStatus(status)

    await client.query(
      `UPDATE tasks SET last_job_status = $1, last_error_msg = $2, updated_at = NOW() WHERE id = $3`,
      [status, errorMsg, taskRow.id],
    )
    await client.query(
      `UPDATE task_runs SET status = $1, error_msg = $2, finished_at = CASE WHEN $3 THEN NOW() ELSE finished_at END
       WHERE task_id = $4 AND job_id = $5`,
      [status, errorMsg, finished, taskRow.id, taskRow.last_job_id],
    )

    return {
      ...taskRow,
      last_job_status: status,
      last_error_msg: errorMsg,
    }
  } catch (error) {
    return taskRow
  }
}

export async function listTasks({ sync = true } = {}) {
  const client = await getPool().connect()
  try {
    const { rows } = await client.query('SELECT * FROM tasks ORDER BY updated_at DESC')
    const synced = sync
      ? await Promise.all(rows.map((row) => syncTaskStatus(client, row)))
      : rows
    const tasks = synced.map(mapTask)
    return attachScheduleSummary(tasks)
  } finally {
    client.release()
  }
}

export async function getTask(id) {
  const client = await getPool().connect()
  try {
    const { rows } = await client.query('SELECT * FROM tasks WHERE id = $1', [id])
    if (!rows.length) return null
    const synced = await syncTaskStatus(client, rows[0])
    const [task] = await attachScheduleSummary([mapTask(synced)])
    return task
  } finally {
    client.release()
  }
}

export async function createTask(payload) {
  const client = await getPool().connect()
  try {
    const { rows } = await client.query(
      `INSERT INTO tasks (name, description, config_format, config_content, default_job_name, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        payload.name,
        payload.description || null,
        payload.configFormat || 'hocon',
        payload.configContent,
        payload.defaultJobName || null,
        payload.isEnabled !== false,
      ],
    )
    return mapTask(rows[0])
  } finally {
    client.release()
  }
}

export async function updateTask(id, payload) {
  const client = await getPool().connect()
  try {
    const { rows } = await client.query(
      `UPDATE tasks SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         config_format = COALESCE($4, config_format),
         config_content = COALESCE($5, config_content),
         default_job_name = COALESCE($6, default_job_name),
         is_enabled = COALESCE($7, is_enabled),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        payload.name ?? null,
        payload.description ?? null,
        payload.configFormat ?? null,
        payload.configContent ?? null,
        payload.defaultJobName ?? null,
        payload.isEnabled ?? null,
      ],
    )
    if (!rows.length) return null
    return mapTask(rows[0])
  } finally {
    client.release()
  }
}

export async function deleteTask(id) {
  const { rowCount } = await getPool().query('DELETE FROM tasks WHERE id = $1', [id])
  return rowCount > 0
}

export async function runTask(id) {
  const client = await getPool().connect()
  try {
    const { rows } = await client.query('SELECT * FROM tasks WHERE id = $1', [id])
    if (!rows.length) return null
    const task = rows[0]
    if (!task.is_enabled) {
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

    await client.query(
      `UPDATE tasks SET
         last_run_at = NOW(),
         last_job_id = $2,
         last_job_status = $3,
         last_error_msg = NULL,
         updated_at = NOW()
       WHERE id = $1`,
      [id, jobId, submittedStatus],
    )

    const { rows: runRows } = await client.query(
      `INSERT INTO task_runs (task_id, job_id, job_name, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, jobId, result.jobName || jobName, submittedStatus],
    )

    return {
      task: mapTask({
        ...task,
        last_run_at: new Date(),
        last_job_id: jobId,
        last_job_status: submittedStatus,
        last_error_msg: null,
        updated_at: new Date(),
      }),
      run: mapRun(runRows[0]),
      submitResult: result,
    }
  } finally {
    client.release()
  }
}

export async function listTaskRuns(taskId, limit = 20) {
  const client = await getPool().connect()
  try {
    const { rows } = await client.query(
      'SELECT * FROM task_runs WHERE task_id = $1 ORDER BY started_at DESC LIMIT $2',
      [taskId, limit],
    )

    const synced = await Promise.all(
      rows.map(async (row) => {
        if (!isActiveJobStatus(row.status)) return row
        try {
          const info = await fetchJobInfo(row.job_id)
          const status = String(info.jobStatus || row.status).toUpperCase()
          const errorMsg = info.errorMsg || null
          const finished = !isActiveJobStatus(status)
          await client.query(
            `UPDATE task_runs SET status = $1, error_msg = $2, finished_at = CASE WHEN $3 THEN NOW() ELSE finished_at END WHERE id = $4`,
            [status, errorMsg, finished, row.id],
          )
          return { ...row, status, error_msg: errorMsg, finished_at: finished ? new Date() : row.finished_at }
        } catch {
          return row
        }
      }),
    )

    return synced.map(mapRun)
  } finally {
    client.release()
  }
}
