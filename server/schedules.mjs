import cronParser from 'cron-parser'
import { dbAll, dbGet, dbRun, nowIso, toBool, toIso } from './db.mjs'
import { buildCronExpression, defaultCronConfig, describeCronExpression } from './cron-utils.mjs'

function parseCronConfig(value) {
  if (value == null || value === '') return defaultCronConfig()
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return defaultCronConfig()
  }
}

function mapSchedule(row) {
  if (!row || row.task_id == null) return null
  const cronConfig = parseCronConfig(row.cron_config)
  return {
    taskId: Number(row.task_id),
    enabled: toBool(row.enabled),
    cronExpr: row.cron_expr,
    cronConfig,
    timezone: row.timezone || 'Asia/Shanghai',
    description: describeCronExpression(cronConfig, row.timezone || 'Asia/Shanghai'),
    nextRunAt: toIso(row.next_run_at),
    lastTriggerAt: toIso(row.last_trigger_at),
    lastTriggerStatus: row.last_trigger_status,
    lastTriggerError: row.last_trigger_error,
    updatedAt: toIso(row.updated_at),
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

function ensureScheduleRow(taskId) {
  const task = dbGet('SELECT id FROM tasks WHERE id = ?', [taskId])
  if (!task) return null

  const existing = dbGet('SELECT * FROM task_schedules WHERE task_id = ?', [taskId])
  if (existing) return existing

  const config = defaultCronConfig()
  const cronExpr = buildCronExpression(config)
  const nextRunAt = toIso(computeNextRunAt(cronExpr))
  return dbGet(
    `INSERT INTO task_schedules (task_id, enabled, cron_expr, cron_config, timezone, next_run_at, updated_at)
     VALUES (?, 0, ?, ?, 'Asia/Shanghai', ?, ?)
     RETURNING *`,
    [taskId, cronExpr, JSON.stringify(config), nextRunAt, nowIso()],
  )
}

export async function getTaskSchedule(taskId) {
  const row = ensureScheduleRow(taskId)
  if (!row) return null
  return mapSchedule(row)
}

export async function saveTaskSchedule(taskId, payload) {
  const existing = ensureScheduleRow(taskId)
  if (!existing) throw new Error('Task not found')
  const cronConfig = payload.cronConfig || defaultCronConfig()
  const cronExpr = buildCronExpression(cronConfig)
  const timezone = payload.timezone || 'Asia/Shanghai'
  const enabled = Boolean(payload.enabled)
  const nextRunAt = enabled ? toIso(computeNextRunAt(cronExpr, timezone)) : null

  const row = dbGet(
    `UPDATE task_schedules SET
       enabled = ?,
       cron_expr = ?,
       cron_config = ?,
       timezone = ?,
       next_run_at = ?,
       updated_at = ?
     WHERE task_id = ?
     RETURNING *`,
    [enabled ? 1 : 0, cronExpr, JSON.stringify(cronConfig), timezone, nextRunAt, nowIso(), taskId],
  )
  return mapSchedule(row)
}

export async function listEnabledSchedules() {
  return dbAll(
    `SELECT s.*, t.is_enabled AS task_enabled
     FROM task_schedules s
     JOIN tasks t ON t.id = s.task_id
     WHERE s.enabled = 1 AND t.is_enabled = 1`,
  )
}

export async function markScheduleTriggered(taskId, { status, error = null }) {
  const row = dbGet('SELECT cron_expr, timezone FROM task_schedules WHERE task_id = ?', [taskId])
  if (!row) return
  const nextRunAt = toIso(computeNextRunAt(row.cron_expr, row.timezone))
  dbRun(
    `UPDATE task_schedules SET
       last_trigger_at = ?,
       last_trigger_status = ?,
       last_trigger_error = ?,
       next_run_at = ?,
       updated_at = ?
     WHERE task_id = ?`,
    [nowIso(), status, error, nextRunAt, nowIso(), taskId],
  )
}

export async function attachScheduleSummary(tasks) {
  if (!tasks.length) return tasks
  const ids = tasks.map((t) => t.id)
  const placeholders = ids.map(() => '?').join(',')
  const rows = dbAll(
    `SELECT task_id, enabled, cron_expr, cron_config, timezone, next_run_at, last_trigger_at, last_trigger_status
     FROM task_schedules WHERE task_id IN (${placeholders})`,
    ids,
  )
  const map = new Map(rows.map((r) => [Number(r.task_id), mapSchedule(r)]))
  return tasks.map((task) => ({
    ...task,
    schedule: map.get(task.id) || null,
  }))
}
