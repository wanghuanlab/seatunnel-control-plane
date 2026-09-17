import type { PaginatedTaskRuns, RunTaskResult, Task, TaskPayload, TaskRun, TaskSchedule, TaskSchedulePayload } from '../types/tasks'
import { apiRequest } from './http'

const BASE = '/api/tasks'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(`${BASE}${path}`, init)
}

function normalizeRunsPage(payload: TaskRun[] | PaginatedTaskRuns): PaginatedTaskRuns {
  if (Array.isArray(payload)) return { data: payload, total: payload.length }
  if (payload && Array.isArray(payload.data)) {
    return {
      data: payload.data,
      total: Number.isFinite(payload.total) ? payload.total : payload.data.length,
      page: payload.page,
      rows: payload.rows,
    }
  }
  return { data: [], total: 0 }
}

export const tasksApi = {
  list: (sync = true) => request<Task[]>(`${sync ? '' : '?sync=false'}`),

  get: (id: number) => request<Task>(`/${id}`),

  create: (body: TaskPayload) => request<Task>('', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: number, body: Partial<TaskPayload>) =>
    request<Task>(`/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (id: number) => request<void>(`/${id}`, { method: 'DELETE' }),

  run: (id: number) => request<RunTaskResult>(`/${id}/run`, { method: 'POST' }),

  runs: async (id: number, page = 1, rows = 20) =>
    normalizeRunsPage(await request<TaskRun[] | PaginatedTaskRuns>(`/${id}/runs?page=${page}&rows=${rows}`)),

  getSchedule: (id: number) => request<TaskSchedule>(`/${id}/schedule`),

  saveSchedule: (id: number, body: TaskSchedulePayload) =>
    request<TaskSchedule>(`/${id}/schedule`, { method: 'PUT', body: JSON.stringify(body) }),
}
