import {
  authenticate,
  buildClearSessionCookie,
  buildSessionCookie,
  changePassword,
  createUser,
  destroySession,
  getSessionTokenFromRequest,
  getUserBySessionToken,
  listUsers,
  updateUser,
} from './auth.mjs'
import { readJsonBody, sendJson } from './http-utils.mjs'
import { getSeatunnelSettings, getSettingsHealth, saveSeatunnelBase } from './settings.mjs'

export function requireAuth(req, res) {
  const token = getSessionTokenFromRequest(req)
  const user = getUserBySessionToken(token)
  if (!user) {
    sendJson(res, 401, { error: '未登录或会话已过期' })
    return null
  }
  return { user, token }
}

export function requireAdmin(req, res) {
  const auth = requireAuth(req, res)
  if (!auth) return null
  if (auth.user.role !== 'admin') {
    sendJson(res, 403, { error: '需要管理员权限' })
    return null
  }
  return auth
}

export async function handleAuthApi(req, res, pathname) {
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req)
      const { user, session } = authenticate(body.username, body.password)
      sendJson(res, 200, { user }, {
        'Set-Cookie': buildSessionCookie(session.token, session.expiresAt),
      })
    } catch (error) {
      sendJson(res, 401, { error: String(error.message || error) })
    }
    return true
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = getSessionTokenFromRequest(req)
    destroySession(token)
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': buildClearSessionCookie() })
    return true
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const auth = requireAuth(req, res)
    if (!auth) return true
    sendJson(res, 200, { user: auth.user })
    return true
  }

  if (pathname === '/api/auth/change-password' && req.method === 'POST') {
    const auth = requireAuth(req, res)
    if (!auth) return true
    try {
      const body = await readJsonBody(req)
      changePassword(auth.user.id, body.oldPassword, body.newPassword)
      sendJson(res, 200, { ok: true })
    } catch (error) {
      sendJson(res, 400, { error: String(error.message || error) })
    }
    return true
  }

  return false
}

export async function handleSettingsApi(req, res, pathname) {
  if (pathname === '/api/settings/health' && req.method === 'GET') {
    const auth = requireAuth(req, res)
    if (!auth) return true
    try {
      const health = await getSettingsHealth()
      sendJson(res, 200, health)
    } catch (error) {
      sendJson(res, 500, { error: String(error.message || error) })
    }
    return true
  }

  if (pathname === '/api/settings/seatunnel') {
    if (req.method === 'GET') {
      const auth = requireAdmin(req, res)
      if (!auth) return true
      sendJson(res, 200, await getSeatunnelSettings())
      return true
    }
    if (req.method === 'PUT') {
      const auth = requireAdmin(req, res)
      if (!auth) return true
      try {
        const body = await readJsonBody(req)
        const saved = await saveSeatunnelBase(body.apiBase)
        sendJson(res, 200, saved)
      } catch (error) {
        sendJson(res, 400, {
          error: String(error.message || error),
          probe: error.probe || null,
        })
      }
      return true
    }
  }

  return false
}

export async function handleUsersApi(req, res, pathname) {
  if (pathname === '/api/users' && req.method === 'GET') {
    const auth = requireAdmin(req, res)
    if (!auth) return true
    sendJson(res, 200, listUsers())
    return true
  }

  if (pathname === '/api/users' && req.method === 'POST') {
    const auth = requireAdmin(req, res)
    if (!auth) return true
    try {
      const body = await readJsonBody(req)
      const user = createUser(body)
      sendJson(res, 201, user)
    } catch (error) {
      sendJson(res, 400, { error: String(error.message || error) })
    }
    return true
  }

  const match = pathname.match(/^\/api\/users\/(\d+)$/)
  if (match && req.method === 'PUT') {
    const auth = requireAdmin(req, res)
    if (!auth) return true
    try {
      const body = await readJsonBody(req)
      const user = updateUser(Number(match[1]), body, auth.user.id)
      sendJson(res, 200, user)
    } catch (error) {
      sendJson(res, 400, { error: String(error.message || error) })
    }
    return true
  }

  return false
}
