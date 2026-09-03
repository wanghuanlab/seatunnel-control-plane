import pg from 'pg'

const { Pool } = pg

let pool

export function getDbConfig() {
  return {
    host: process.env.EDP_DB_HOST || 'localhost',
    port: Number(process.env.EDP_DB_PORT || 5360),
    database: process.env.EDP_DB_NAME || 'edp_visualization',
    user: process.env.EDP_DB_USER || 'postgres',
    password: process.env.EDP_DB_PASSWORD || 'Postgres@90115007',
  }
}

export function getPool() {
  if (!pool) {
    pool = new Pool(getDbConfig())
  }
  return pool
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config_format VARCHAR(16) NOT NULL DEFAULT 'hocon',
  config_content TEXT NOT NULL,
  default_job_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_run_at TIMESTAMPTZ,
  last_job_id VARCHAR(64),
  last_job_status VARCHAR(32) NOT NULL DEFAULT 'IDLE',
  last_error_msg TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS task_runs (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  job_id VARCHAR(64) NOT NULL,
  job_name VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
  error_msg TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_runs_task_id ON task_runs(task_id, started_at DESC);

CREATE TABLE IF NOT EXISTS task_schedules (
  task_id BIGINT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  cron_expr VARCHAR(128) NOT NULL DEFAULT '0 9 * * *',
  cron_config JSONB NOT NULL DEFAULT '{"preset":"daily","hour":9,"minuteOfHour":0,"daysOfWeek":[1,2,3,4,5],"dayOfMonth":1,"minute":0,"customExpr":"0 9 * * *"}'::jsonb,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
  next_run_at TIMESTAMPTZ,
  last_trigger_at TIMESTAMPTZ,
  last_trigger_status VARCHAR(32),
  last_trigger_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_schedules_enabled ON task_schedules(enabled, next_run_at);
`

export async function initSchema() {
  const client = await getPool().connect()
  try {
    await client.query(SCHEMA_SQL)
  } finally {
    client.release()
  }
}

export async function checkDbConnection() {
  const client = await getPool().connect()
  try {
    await client.query('SELECT 1')
    return true
  } finally {
    client.release()
  }
}
