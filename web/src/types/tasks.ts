export type TaskConfigFormat = 'json' | 'hocon' | 'sql'

export interface Task {
  id: number
  name: string
  description: string | null
  configFormat: TaskConfigFormat
  configContent: string
  defaultJobName: string | null
  createdAt: string
  updatedAt: string
  lastRunAt: string | null
  lastJobId: string | null
  lastJobStatus: string
  lastErrorMsg: string | null
  isEnabled: boolean
}

export interface TaskRun {
  id: number
  taskId: number
  jobId: string
  jobName: string | null
  status: string
  errorMsg: string | null
  startedAt: string
  finishedAt: string | null
}

export interface TaskPayload {
  name: string
  description?: string
  configFormat: TaskConfigFormat
  configContent: string
  defaultJobName?: string
  isEnabled?: boolean
}

export interface RunTaskResult {
  task: Task
  run: TaskRun
  submitResult: { jobId: string | number; jobName: string }
}
