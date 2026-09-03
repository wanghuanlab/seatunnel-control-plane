const SEATUNNEL_BASE = process.env.SEATUNNEL_API_BASE || 'http://127.0.0.1:8080'

const ACTIVE_STATUSES = new Set(['RUNNING', 'PENDING', 'RESTORE', 'SUBMITTED'])

export function isActiveJobStatus(status) {
  return ACTIVE_STATUSES.has(String(status || '').toUpperCase())
}

export async function submitJobToSeatunnel({ configFormat, configContent, jobName }) {
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
  const response = await fetch(`${SEATUNNEL_BASE}/job-info/${jobId}`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `job-info failed: ${response.status}`)
  }
  return response.json()
}
