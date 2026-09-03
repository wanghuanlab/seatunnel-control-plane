import type { RunTaskResult, Task, TaskPayload, TaskRun, TaskSchedule, TaskSchedulePayload } from '../types/tasks'
import { apiRequest } from './http'

const BASE = '/api/tasks'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(`${BASE}${path}`, init)
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

  getSchedule: (id: number) => request<TaskSchedule>(`/${id}/schedule`),

  saveSchedule: (id: number, body: TaskSchedulePayload) =>
    request<TaskSchedule>(`/${id}/schedule`, { method: 'PUT', body: JSON.stringify(body) }),
}
