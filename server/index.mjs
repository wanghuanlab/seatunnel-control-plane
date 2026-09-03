import { createServer } from 'node:http'
import { existsSync, statSync, createReadStream } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkDbConnection, initSchema } from './db.mjs'
import { handleTasksApi } from './tasks-router.mjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PORT = Number(process.env.EDP_VIZ_PORT || 8800)
const SEATUNNEL_BASE = process.env.SEATUNNEL_API_BASE || 'http://127.0.0.1:8080'
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
  const url = `${SEATUNNEL_BASE}${targetPath}`
  const headers = { ...req.headers, host: new URL(SEATUNNEL_BASE).host }
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

  if (pathname.startsWith('/api/tasks')) {
    try {
      const handled = await handleTasksApi(req, res, pathname, url.searchParams)
      if (handled) return
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: String(error.message || error) }))
    }
    return
  }

  if (pathname.startsWith('/api/seatunnel')) {
    const targetPath = pathname.replace(/^\/api\/seatunnel/, '') + url.search
    const chunks = []
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      for await (const chunk of req) chunks.push(chunk)
    }
    const body = chunks.length ? Buffer.concat(chunks) : undefined
    await proxyToSeatunnel(req, res, targetPath, body)
    return
  }

  if (isProd && existsSync(WEB_DIST)) {
    serveStatic(pathname, res)
    return
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: 'ok', proxy: SEATUNNEL_BASE, mode: isProd ? 'production' : 'dev-proxy' }))
})

async function bootstrap() {
  try {
    await initSchema()
    await checkDbConnection()
    console.log('Task DB connected and schema ready')
  } catch (error) {
    console.warn('Task DB unavailable:', error.message)
    console.warn('Run: npm run init-db')
  }

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`EDP Visualization proxy listening on http://127.0.0.1:${PORT}`)
    console.log(`Forwarding /api/seatunnel/* -> ${SEATUNNEL_BASE}`)
    console.log(`Task API: /api/tasks/*`)
  })
}

bootstrap()
