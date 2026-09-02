import type {
  CheckpointHistoryItem,
  CheckpointOverview,
  ClusterOverview,
  FinishedJobState,
  JobDetail,
  JobSummary,
  LogEntry,
  PaginatedJobList,
  PendingJobsResponse,
  SubmitJobResponse,
  SystemMonitoringNode,
} from '../types/api'

const BASE = '/api/seatunnel'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    ...init,
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload)
    throw new Error(message || `Request failed: ${response.status}`)
  }

  return payload as T
}

function unwrapJobList(payload: JobSummary[] | PaginatedJobList): JobSummary[] {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

export const seatunnelApi = {
  getOverview: (tags?: Record<string, string>) => {
    const params = new URLSearchParams(tags)
    const query = params.toString()
    return request<ClusterOverview>(`/overview${query ? `?${query}` : ''}`)
  },

  getRunningJobs: async (page = 1, rows = 50) =>
    unwrapJobList(await request<JobSummary[] | PaginatedJobList>(`/running-jobs?page=${page}&rows=${rows}`)),

  getPendingJobs: (options?: { jobId?: string; limit?: number; pretty?: boolean }) => {
    const params = new URLSearchParams()
    if (options?.jobId) params.set('jobId', options.jobId)
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.pretty) params.set('pretty', 'true')
    const query = params.toString()
    return request<PendingJobsResponse>(`/pending-jobs${query ? `?${query}` : ''}`)
  },

  getJobInfo: (jobId: string) => request<JobDetail>(`/job-info/${jobId}`),

  getFinishedJobs: async (state?: FinishedJobState, page = 1, rows = 50) => {
    const suffix = state ? `/${state}` : ''
    return unwrapJobList(
      await request<JobSummary[] | PaginatedJobList>(`/finished-jobs${suffix}?page=${page}&rows=${rows}`),
    )
  },

  getSystemMonitoring: () =>
    request<SystemMonitoringNode[]>('/system-monitoring-information'),

  submitJob: (body: unknown, params?: { jobId?: string; jobName?: string; format?: string }) => {
    const format = params?.format || 'json'
    const search = new URLSearchParams()
    if (params?.jobId) search.set('jobId', params.jobId)
    if (params?.jobName) search.set('jobName', params.jobName)
    if (format !== 'json') search.set('format', format)
    const query = search.toString()

    if (format === 'hocon' || format === 'sql') {
      const text = typeof body === 'string' ? body : String(body)
      return request<SubmitJobResponse>(`/submit-job${query ? `?${query}` : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': format === 'hocon' ? 'application/hocon' : 'text/plain',
        },
        body: text,
      })
    }

    return request<SubmitJobResponse>(`/submit-job${query ? `?${query}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  submitJobUpload: async (file: File, params?: { jobId?: string; jobName?: string }) => {
    const form = new FormData()
    form.append('config_file', file)
    const search = new URLSearchParams()
    if (params?.jobId) search.set('jobId', params.jobId)
    if (params?.jobName) search.set('jobName', params.jobName)
    const query = search.toString()
    const response = await fetch(`${BASE}/submit-job/upload${query ? `?${query}` : ''}`, {
      method: 'POST',
      body: form,
    })
    if (!response.ok) throw new Error(await response.text())
    return response.json() as Promise<SubmitJobResponse>
  },

  submitJobs: (jobs: Array<{ params?: { jobId?: string; jobName?: string }; body: unknown }>) =>
    request<SubmitJobResponse[]>('/submit-jobs', {
      method: 'POST',
      body: JSON.stringify(
        jobs.map(({ params, body }) => ({
          params: params || {},
          ...(typeof body === 'object' && body !== null ? body : {}),
        })),
      ),
    }),

  stopJob: (jobId: string | number, isStopWithSavePoint = false) =>
    request<{ jobId: string | number }>('/stop-job', {
      method: 'POST',
      body: JSON.stringify({ jobId, isStopWithSavePoint }),
    }),

  stopJobs: (jobs: Array<{ jobId: string | number; isStopWithSavePoint?: boolean }>) =>
    request<Array<{ jobId: string | number }>>('/stop-jobs', {
      method: 'POST',
      body: JSON.stringify(jobs),
    }),

  encryptConfig: (body: unknown) =>
    request<unknown>('/encrypt-config', { method: 'POST', body: JSON.stringify(body) }),

  updateTags: (tags: Record<string, string>) =>
    request<{ status: string; message: string }>('/update-tags', {
      method: 'POST',
      body: JSON.stringify(tags),
    }),

  getLogs: (jobId?: string, format: 'json' | 'html' = 'json') => {
    const path = jobId ? `/logs/${jobId}?format=${format}` : `/logs?format=${format}`
    return request<LogEntry[] | string>(path)
  },

  getLogContent: (logName: string) => fetch(`${BASE}/logs/${logName}`).then((r) => r.text()),

  getMetrics: () => request<string>('/metrics'),

  getOpenMetrics: () => request<string>('/openmetrics'),

  getCheckpointOverview: (jobId: string) =>
    request<CheckpointOverview>(`/jobs/checkpoints/${jobId}`),

  getCheckpointHistory: (
    jobId: string,
    options?: { pipelineId?: number; limit?: number; status?: string },
  ) => {
    const params = new URLSearchParams()
    if (options?.pipelineId != null) params.set('pipelineId', String(options.pipelineId))
    if (options?.limit != null) params.set('limit', String(options.limit))
    if (options?.status) params.set('status', options.status)
    const query = params.toString()
    return request<CheckpointHistoryItem[]>(
      `/jobs/checkpoints/history/${jobId}${query ? `?${query}` : ''}`,
    )
  },
}
