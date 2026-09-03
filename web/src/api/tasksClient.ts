import type { RunTaskResult, Task, TaskPayload, TaskRun } from '../types/tasks'

const BASE = '/api/tasks'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    ...init,
  })

  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : JSON.stringify(payload))
  }
  return payload as T
}

export const tasksApi = {
  list: (sync = true) => request<Task[]>(`${sync ? '' : '?sync=false'}`),

  get: (id: number) => request<Task>(`/${id}`),

  create: (body: TaskPayload) => request<Task>('', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: number, body: Partial<TaskPayload>) =>
    request<Task>(`/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (id: number) => request<void>(`/${id}`, { method: 'DELETE' }),

  run: (id: number) => request<RunTaskResult>(`/${id}/run`, { method: 'POST' }),

  runs: (id: number) => request<TaskRun[]>(`/${id}/runs`),
}
