export type TaskConfigFormat = 'json' | 'hocon' | 'sql'

export type CronPreset = 'every_minute' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'

export interface CronEditorConfig {
  preset: CronPreset
  minute?: number
  hour?: number
  minuteOfHour?: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  customExpr?: string
}

export interface TaskScheduleSummary {
  taskId: number
  enabled: boolean
  cronExpr: string
  cronConfig: CronEditorConfig
  timezone: string
  description: string
  nextRunAt: string | null
  lastTriggerAt: string | null
  lastTriggerStatus: string | null
}

export type TaskSchedule = TaskScheduleSummary & {
  lastTriggerError: string | null
  updatedAt: string
}

export interface TaskSchedulePayload {
  enabled: boolean
  timezone: string
  cronConfig: CronEditorConfig
}

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
  schedule: TaskScheduleSummary | null
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

export interface PaginatedTaskRuns {
  data: TaskRun[]
  total: number
  page?: number
  rows?: number
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
