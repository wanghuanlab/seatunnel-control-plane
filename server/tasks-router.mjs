import {
  createTask,
  deleteTask,
  getTask,
  listTaskRuns,
  listTasks,
  runTask,
  updateTask,
} from './tasks.mjs'

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      if (!chunks.length) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

export async function handleTasksApi(req, res, pathname, searchParams) {
  const runMatch = pathname.match(/^\/api\/tasks\/(\d+)\/run$/)
  if (runMatch && req.method === 'POST') {
    try {
      const result = await runTask(Number(runMatch[1]))
      if (!result) {
        sendJson(res, 404, { error: 'Task not found' })
        return true
      }
      sendJson(res, 200, result)
    } catch (error) {
      sendJson(res, 400, { error: String(error.message || error) })
    }
    return true
  }

  const runsMatch = pathname.match(/^\/api\/tasks\/(\d+)\/runs$/)
  if (runsMatch && req.method === 'GET') {
    const runs = await listTaskRuns(Number(runsMatch[1]))
    sendJson(res, 200, runs)
    return true
  }

  const itemMatch = pathname.match(/^\/api\/tasks\/(\d+)$/)
  if (itemMatch) {
    const id = Number(itemMatch[1])
    if (req.method === 'GET') {
      const task = await getTask(id)
      if (!task) {
        sendJson(res, 404, { error: 'Task not found' })
        return true
      }
      sendJson(res, 200, task)
      return true
    }
    if (req.method === 'PUT') {
      try {
        const body = await readJsonBody(req)
        const task = await updateTask(id, body)
        if (!task) {
          sendJson(res, 404, { error: 'Task not found' })
          return true
        }
        sendJson(res, 200, task)
      } catch (error) {
        sendJson(res, 400, { error: String(error.message || error) })
      }
      return true
    }
    if (req.method === 'DELETE') {
      const ok = await deleteTask(id)
      if (!ok) {
        sendJson(res, 404, { error: 'Task not found' })
        return true
      }
      res.writeHead(204)
      res.end()
      return true
    }
  }

  if (pathname === '/api/tasks' && req.method === 'GET') {
    const sync = searchParams.get('sync') !== 'false'
    const tasks = await listTasks({ sync })
    sendJson(res, 200, tasks)
    return true
  }

  if (pathname === '/api/tasks' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req)
      if (!body.name?.trim() || !body.configContent?.trim()) {
        sendJson(res, 400, { error: 'name and configContent are required' })
        return true
      }
      const task = await createTask(body)
      sendJson(res, 201, task)
    } catch (error) {
      sendJson(res, 400, { error: String(error.message || error) })
    }
    return true
  }

  return false
}
