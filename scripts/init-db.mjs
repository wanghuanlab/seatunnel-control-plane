#!/usr/bin/env node
import { seedDefaultAdmin } from '../server/auth.mjs'
import { checkDbConnection, getDbPath, initSchema } from '../server/db.mjs'

function main() {
  initSchema()
  const seeded = seedDefaultAdmin()
  checkDbConnection()
  console.log('SQLite schema initialized.')
  console.log('DB path:', getDbPath())
  if (seeded) console.log('Default admin created: admin / 123456')
  else console.log('Admin user already exists')
}

try {
  main()
} catch (error) {
  console.error('init-db failed:', error.message)
  process.exit(1)
}
