import { mkdirSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DEFAULT_DB_PATH = join(__dirname, '../data/edp-visualization.sqlite')

let db

export function getDbPath() {
  const configured = process.env.EDP_SQLITE_PATH
  if (!configured) return DEFAULT_DB_PATH
  return isAbsolute(configured) ? configured : join(process.cwd(), configured)
}

export function getDb() {
  if (!db) {
    const path = getDbPath()
    mkdirSync(dirname(path), { recursive: true })
    db = new Database(path)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.pragma('busy_timeout = 5000')
  }
  return db
}

export function dbAll(sql, params = []) {
  return getDb().prepare(sql).all(...params)
}

export function dbGet(sql, params = []) {
  return getDb().prepare(sql).get(...params)
}

export function dbRun(sql, params = []) {
  return getDb().prepare(sql).run(...params)
}

export function nowIso() {
  return new Date().toISOString()
}

export function toIso(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  return String(value)
}

export function toBool(value) {
  return value === true || value === 1 || value === '1'
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  config_format TEXT NOT NULL DEFAULT 'hocon',
  config_content TEXT NOT NULL,
  default_job_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_run_at TEXT,
  last_job_id TEXT,
  last_job_status TEXT NOT NULL DEFAULT 'IDLE',
  last_error_msg TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS task_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  job_name TEXT,
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  error_msg TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_runs_task_id ON task_runs(task_id, started_at DESC);

CREATE TABLE IF NOT EXISTS task_schedules (
  task_id INTEGER PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 0,
  cron_expr TEXT NOT NULL DEFAULT '0 9 * * *',
  cron_config TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  next_run_at TEXT,
  last_trigger_at TEXT,
  last_trigger_status TEXT,
  last_trigger_error TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_schedules_enabled ON task_schedules(enabled, next_run_at);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`

export function initSchema() {
  getDb().exec(SCHEMA_SQL)
}

export function checkDbConnection() {
  dbGet('SELECT 1 AS ok')
  return true
}
