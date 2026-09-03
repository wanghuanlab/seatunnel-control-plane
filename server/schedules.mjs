import cronParser from 'cron-parser'
import { getPool } from './db.mjs'
import { buildCronExpression, defaultCronConfig, describeCronExpression } from './cron-utils.mjs'

function mapSchedule(row) {
  if (!row || row.task_id == null) return null
  const cronConfig = row.cron_config || defaultCronConfig()
  return {
    taskId: Number(row.task_id),
    enabled: row.enabled,
    cronExpr: row.cron_expr,
    cronConfig,
    timezone: row.timezone || 'Asia/Shanghai',
    description: describeCronExpression(cronConfig, row.timezone || 'Asia/Shanghai'),
    nextRunAt: row.next_run_at?.toISOString?.() || row.next_run_at || null,
    lastTriggerAt: row.last_trigger_at?.toISOString?.() || row.last_trigger_at || null,
    lastTriggerStatus: row.last_trigger_status,
    lastTriggerError: row.last_trigger_error,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  }
}

export function computeNextRunAt(cronExpr, timezone = 'Asia/Shanghai') {
  try {
    const interval = cronParser.parseExpression(cronExpr, {
      currentDate: new Date(),
      tz: timezone,
    })
    return interval.next().toDate()
  } catch {
    return null
  }
}

async function ensureScheduleRow(client, taskId) {
  const taskCheck = await client.query('SELECT id FROM tasks WHERE id = $1', [taskId])
  if (!taskCheck.rowCount) return null

  const existing = await client.query('SELECT * FROM task_schedules WHERE task_id = $1', [taskId])
  if (existing.rowCount) return existing.rows[0]

  const config = defaultCronConfig()
  const cronExpr = buildCronExpression(config)
  const nextRunAt = computeNextRunAt(cronExpr)
  const { rows } = await client.query(
    `INSERT INTO task_schedules (task_id, enabled, cron_expr, cron_config, timezone, next_run_at)
     VALUES ($1, FALSE, $2, $3::jsonb, 'Asia/Shanghai', $4)
     RETURNING *`,
    [taskId, cronExpr, JSON.stringify(config), nextRunAt],
  )
  return rows[0]
}

export async function getTaskSchedule(taskId) {
  const client = await getPool().connect()
  try {
    const row = await ensureScheduleRow(client, taskId)
    if (!row) return null
    return mapSchedule(row)
  } finally {
    client.release()
  }
}

export async function saveTaskSchedule(taskId, payload) {
  const client = await getPool().connect()
  try {
    const row = await ensureScheduleRow(client, taskId)
    if (!row) throw new Error('Task not found')
    const cronConfig = payload.cronConfig || defaultCronConfig()
    const cronExpr = buildCronExpression(cronConfig)
    const timezone = payload.timezone || 'Asia/Shanghai'
    const enabled = Boolean(payload.enabled)
    const nextRunAt = enabled ? computeNextRunAt(cronExpr, timezone) : null

    const { rows } = await client.query(
      `UPDATE task_schedules SET
         enabled = $2,
         cron_expr = $3,
         cron_config = $4::jsonb,
         timezone = $5,
         next_run_at = $6,
         updated_at = NOW()
       WHERE task_id = $1
       RETURNING *`,
      [taskId, enabled, cronExpr, JSON.stringify(cronConfig), timezone, nextRunAt],
    )
    return mapSchedule(rows[0])
  } finally {
    client.release()
  }
}

export async function listEnabledSchedules() {
  const { rows } = await getPool().query(
    `SELECT s.*, t.is_enabled AS task_enabled
     FROM task_schedules s
     JOIN tasks t ON t.id = s.task_id
     WHERE s.enabled = TRUE AND t.is_enabled = TRUE`,
  )
  return rows
}

export async function markScheduleTriggered(taskId, { status, error = null }) {
  const client = await getPool().connect()
  try {
    const { rows } = await client.query('SELECT cron_expr, timezone FROM task_schedules WHERE task_id = $1', [taskId])
    if (!rows.length) return
    const nextRunAt = computeNextRunAt(rows[0].cron_expr, rows[0].timezone)
    await client.query(
      `UPDATE task_schedules SET
         last_trigger_at = NOW(),
         last_trigger_status = $2,
         last_trigger_error = $3,
         next_run_at = $4,
         updated_at = NOW()
       WHERE task_id = $1`,
      [taskId, status, error, nextRunAt],
    )
  } finally {
    client.release()
  }
}

export async function attachScheduleSummary(tasks) {
  if (!tasks.length) return tasks
  const ids = tasks.map((t) => t.id)
  const { rows } = await getPool().query(
    `SELECT task_id, enabled, cron_expr, cron_config, timezone, next_run_at, last_trigger_at, last_trigger_status
     FROM task_schedules WHERE task_id = ANY($1::bigint[])`,
    [ids],
  )
  const map = new Map(rows.map((r) => [Number(r.task_id), mapSchedule(r)]))
  return tasks.map((task) => ({
    ...task,
    schedule: map.get(task.id) || null,
  }))
}
