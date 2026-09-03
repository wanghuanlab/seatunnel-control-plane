#!/usr/bin/env node
import pg from 'pg'

const adminConfig = {
  host: process.env.EDP_DB_HOST || 'localhost',
  port: Number(process.env.EDP_DB_PORT || 5360),
  database: process.env.EDP_DB_ADMIN_DB || 'postgres',
  user: process.env.EDP_DB_USER || 'postgres',
  password: process.env.EDP_DB_PASSWORD || 'Postgres@90115007',
}

const targetDb = process.env.EDP_DB_NAME || 'edp_visualization'

async function main() {
  const admin = new pg.Client(adminConfig)
  await admin.connect()

  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb])
  if (!exists.rowCount) {
    await admin.query(`CREATE DATABASE "${targetDb}"`)
    console.log(`Created database: ${targetDb}`)
  } else {
    console.log(`Database already exists: ${targetDb}`)
  }
  await admin.end()

  const { initSchema, getDbConfig } = await import('../server/db.mjs')
  process.env.EDP_DB_NAME = targetDb
  await initSchema()
  console.log('Schema initialized.')
  console.log('DB config:', { ...getDbConfig(), password: '***' })
}

main().catch((error) => {
  console.error('init-db failed:', error.message)
  process.exit(1)
})
