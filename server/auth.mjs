import { randomBytes, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { dbAll, dbGet, dbRun, nowIso, toBool } from './db.mjs'

export const SESSION_COOKIE = 'edp_session'
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function mapUser(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    username: row.username,
    role: row.role,
    isEnabled: toBool(row.is_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function hashPassword(password) {
  return bcrypt.hashSync(String(password), 10)
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compareSync(String(password), String(passwordHash))
}

export function seedDefaultAdmin() {
  const existing = dbGet('SELECT id FROM users WHERE username = ?', ['admin'])
  if (existing) return false
  const ts = nowIso()
  dbRun(
    `INSERT INTO users (username, password_hash, role, is_enabled, created_at, updated_at)
     VALUES (?, ?, 'admin', 1, ?, ?)`,
    ['admin', hashPassword('123456'), ts, ts],
  )
  return true
}

export function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  dbRun(
    `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
    [token, userId, expiresAt, nowIso()],
  )
  return { token, expiresAt }
}

export function destroySession(token) {
  if (!token) return
  dbRun('DELETE FROM sessions WHERE id = ?', [token])
}

export function cleanupExpiredSessions() {
  dbRun('DELETE FROM sessions WHERE expires_at < ?', [nowIso()])
}

export function getUserBySessionToken(token) {
  if (!token) return null
  cleanupExpiredSessions()
  const row = dbGet(
    `SELECT u.*
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at >= ? AND u.is_enabled = 1`,
    [token, nowIso()],
  )
  return mapUser(row)
}

export function authenticate(username, password) {
  const row = dbGet('SELECT * FROM users WHERE username = ?', [String(username || '').trim()])
  if (!row || !toBool(row.is_enabled)) {
    throw new Error('用户名或密码错误')
  }
  if (!verifyPassword(password, row.password_hash)) {
    throw new Error('用户名或密码错误')
  }
  const session = createSession(row.id)
  return { user: mapUser(row), session }
}

export function changePassword(userId, oldPassword, newPassword) {
  const row = dbGet('SELECT * FROM users WHERE id = ?', [userId])
  if (!row) throw new Error('用户不存在')
  if (!verifyPassword(oldPassword, row.password_hash)) {
    throw new Error('当前密码不正确')
  }
  const next = String(newPassword || '')
  if (next.length < 6) throw new Error('新密码至少 6 位')
  dbRun('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [
    hashPassword(next),
    nowIso(),
    userId,
  ])
}

export function parseCookies(header) {
  const result = {}
  if (!header) return result
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key) result[key] = decodeURIComponent(value)
  }
  return result
}

export function getSessionTokenFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie)
  return cookies[SESSION_COOKIE] || null
}

export function buildSessionCookie(token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
}

export function buildClearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function listUsers() {
  return dbAll('SELECT * FROM users ORDER BY id ASC').map(mapUser)
}

export function getUserById(id) {
  return mapUser(dbGet('SELECT * FROM users WHERE id = ?', [id]))
}

export function createUser({ username, password, role = 'user', isEnabled = true }) {
  const name = String(username || '').trim()
  if (!name) throw new Error('用户名不能为空')
  if (!/^[a-zA-Z0-9_\-.]{3,64}$/.test(name)) {
    throw new Error('用户名需为 3-64 位字母数字或 _-.')
  }
  const pwd = String(password || '')
  if (pwd.length < 6) throw new Error('密码至少 6 位')
  const nextRole = role === 'admin' ? 'admin' : 'user'
  const existing = dbGet('SELECT id FROM users WHERE username = ?', [name])
  if (existing) throw new Error('用户名已存在')
  const ts = nowIso()
  const row = dbGet(
    `INSERT INTO users (username, password_hash, role, is_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [name, hashPassword(pwd), nextRole, isEnabled ? 1 : 0, ts, ts],
  )
  return mapUser(row)
}

export function countEnabledAdmins(excludeUserId = null) {
  if (excludeUserId == null) {
    const row = dbGet(`SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND is_enabled = 1`)
    return Number(row?.c || 0)
  }
  const row = dbGet(
    `SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND is_enabled = 1 AND id != ?`,
    [excludeUserId],
  )
  return Number(row?.c || 0)
}

export function updateUser(id, payload, actorUserId) {
  const current = dbGet('SELECT * FROM users WHERE id = ?', [id])
  if (!current) throw new Error('用户不存在')

  const nextRole = payload.role === undefined ? current.role : payload.role === 'admin' ? 'admin' : 'user'
  const nextEnabled =
    payload.isEnabled === undefined ? toBool(current.is_enabled) : Boolean(payload.isEnabled)

  if (current.role === 'admin' && (nextRole !== 'admin' || !nextEnabled)) {
    if (countEnabledAdmins(id) < 1) {
      throw new Error('至少保留一名启用中的管理员')
    }
  }

  if (Number(id) === Number(actorUserId) && !nextEnabled) {
    throw new Error('不能禁用当前登录账号')
  }

  let passwordHash = current.password_hash
  if (payload.password != null && String(payload.password).length > 0) {
    if (String(payload.password).length < 6) throw new Error('密码至少 6 位')
    passwordHash = hashPassword(payload.password)
  }

  const row = dbGet(
    `UPDATE users SET
       role = ?,
       is_enabled = ?,
       password_hash = ?,
       updated_at = ?
     WHERE id = ?
     RETURNING *`,
    [nextRole, nextEnabled ? 1 : 0, passwordHash, nowIso(), id],
  )

  if (!nextEnabled) {
    dbRun('DELETE FROM sessions WHERE user_id = ?', [id])
  }

  return mapUser(row)
}
