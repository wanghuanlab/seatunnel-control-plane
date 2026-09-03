import { createServer } from 'node:http'
import { existsSync, statSync, createReadStream } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleAuthApi, handleSettingsApi, handleUsersApi, requireAuth } from './api-auth.mjs'
import { seedDefaultAdmin } from './auth.mjs'
import { checkDbConnection, getDbPath, initSchema } from './db.mjs'
import { sendJson } from './http-utils.mjs'
import { reloadScheduler } from './scheduler.mjs'
import { getSeatunnelBase } from './settings.mjs'
import { handleTasksApi } from './tasks-router.mjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PREFERRED_PORT = Number(process.env.EDP_VIZ_PORT || 8800)
const WEB_DIST = join(__dirname, '../web/dist')
const isProd = process.env.NODE_ENV === 'production'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

async function proxyToSeatunnel(req, res, targetPath, body) {
  const base = getSeatunnelBase()
  if (!base) {
    sendJson(res, 503, {
      error: '尚未配置 SeaTunnel API Base，请管理员在「系统设置」中配置',
    })
    return
  }

  const url = `${base}${targetPath}`
  const headers = { ...req.headers, host: new URL(base).host }
  delete headers['content-length']

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body: body && req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
      duplex: body ? 'half' : undefined,
    })

    res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()))
    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.end(buffer)
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'SeaTunnel API unreachable', detail: String(error) }))
  }
}

function serveStatic(pathname, res) {
  let filePath = join(WEB_DIST, pathname === '/' ? 'index.html' : pathname)
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(WEB_DIST, 'index.html')
  }
  if (!existsSync(filePath)) {
    res.writeHead(404)
    res.end('Not found')
    return
  }
  const ext = extname(filePath)
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  createReadStream(filePath).pipe(res)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const pathname = url.pathname

  try {
    if (pathname.startsWith('/api/auth')) {
      const handled = await handleAuthApi(req, res, pathname)
      if (handled) return
      sendJson(res, 404, { error: 'Not found' })
      return
    }

    if (pathname.startsWith('/api/settings')) {
      const handled = await handleSettingsApi(req, res, pathname)
      if (handled) return
      sendJson(res, 404, { error: 'Not found' })
      return
    }

    if (pathname.startsWith('/api/users')) {
      const handled = await handleUsersApi(req, res, pathname)
      if (handled) return
      sendJson(res, 404, { error: 'Not found' })
      return
    }

    if (pathname.startsWith('/api/tasks')) {
      if (!requireAuth(req, res)) return
      const handled = await handleTasksApi(req, res, pathname, url.searchParams)
      if (handled) return
      sendJson(res, 404, { error: 'Not found' })
      return
    }

    if (pathname.startsWith('/api/seatunnel')) {
      if (!requireAuth(req, res)) return
      const targetPath = pathname.replace(/^\/api\/seatunnel/, '') + url.search
      const chunks = []
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        for await (const chunk of req) chunks.push(chunk)
      }
      const body = chunks.length ? Buffer.concat(chunks) : undefined
      await proxyToSeatunnel(req, res, targetPath, body)
      return
    }
  } catch (error) {
    sendJson(res, 500, { error: String(error.message || error) })
    return
  }

  if (isProd && existsSync(WEB_DIST)) {
    serveStatic(pathname, res)
    return
  }

  sendJson(res, 200, {
    status: 'ok',
    proxy: getSeatunnelBase(),
    mode: isProd ? 'production' : 'dev-proxy',
  })
})

function listen(port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening)
      reject(error)
    }
    const onListening = () => {
      server.off('error', onError)
      resolve(port)
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, '127.0.0.1')
  })
}

async function listenWithFallback(startPort) {
  let port = startPort
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      return await listen(port)
    } catch (error) {
      if (error?.code !== 'EADDRINUSE') throw error
      console.warn(`Port ${port} in use, trying ${port + 1}`)
      port += 1
    }
  }
  throw new Error(`Unable to bind API server near port ${startPort}`)
}

async function bootstrap() {
  try {
    initSchema()
    const seeded = seedDefaultAdmin()
    checkDbConnection()
    console.log(`Task SQLite ready: ${getDbPath()}`)
    if (seeded) console.log('Default admin user created: admin / 123456')
    const base = getSeatunnelBase()
    if (!base) {
      console.warn('SeaTunnel API Base 未配置，请登录后在「系统设置」中填写')
    } else {
      console.log(`SeaTunnel API Base: ${base}`)
    }
    await reloadScheduler()
  } catch (error) {
    console.warn('Task DB unavailable:', error.message)
  }

  const port = await listenWithFallback(PREFERRED_PORT)
  console.log(`EDP Visualization proxy listening on http://127.0.0.1:${port}`)
  console.log(`Task API: /api/tasks/*`)
  console.log(`Auth API: /api/auth/*`)
}

bootstrap()
