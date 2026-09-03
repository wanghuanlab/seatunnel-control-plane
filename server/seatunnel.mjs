import { getSeatunnelBase } from './settings.mjs'

const ACTIVE_STATUSES = new Set(['RUNNING', 'PENDING', 'RESTORE', 'SUBMITTED'])

export function isActiveJobStatus(status) {
  return ACTIVE_STATUSES.has(String(status || '').toUpperCase())
}

function requireBase() {
  const base = getSeatunnelBase()
  if (!base) {
    throw new Error('尚未配置 SeaTunnel API Base，请管理员在「系统设置」中配置')
  }
  return base
}

export async function submitJobToSeatunnel({ configFormat, configContent, jobName }) {
  const SEATUNNEL_BASE = requireBase()
  const format = configFormat || 'hocon'
  const params = new URLSearchParams()
  if (jobName) params.set('jobName', jobName)
  if (format !== 'json') params.set('format', format)
  const query = params.toString()

  let headers = { Accept: 'application/json' }
  let body

  if (format === 'hocon' || format === 'sql') {
    headers['Content-Type'] = format === 'hocon' ? 'application/hocon' : 'text/plain'
    body = configContent
  } else {
    headers['Content-Type'] = 'application/json'
    body = typeof configContent === 'string' ? configContent : JSON.stringify(configContent)
  }

  const response = await fetch(`${SEATUNNEL_BASE}/submit-job${query ? `?${query}` : ''}`, {
    method: 'POST',
    headers,
    body,
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(text || `SeaTunnel submit failed: ${response.status}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(text || 'Invalid SeaTunnel submit response')
  }
}

export async function fetchJobInfo(jobId) {
  const SEATUNNEL_BASE = requireBase()
  const response = await fetch(`${SEATUNNEL_BASE}/job-info/${jobId}`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `job-info failed: ${response.status}`)
  }
  return response.json()
}
