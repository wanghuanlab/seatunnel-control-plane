export interface ClusterOverview {
  projectVersion: string
  gitCommitAbbrev: string
  totalSlot: string
  unassignedSlot: string
  workers: string
  runningJobs: string
  pendingJobs: string
  finishedJobs: string
  failedJobs: string
  cancelledJobs: string
}

export interface JobMetrics {
  SourceReceivedCount?: string
  SourceReceivedQPS?: string
  SinkWriteCount?: string
  SinkWriteQPS?: string
  SinkCommittedCount?: string
  IntermediateQueueSize?: string
  [key: string]: string | Record<string, string> | undefined
}

export interface JobDagVertex {
  vertexId: number
  type: string
  vertexName: string
  tablePaths: string[]
}

export interface JobDag {
  jobId: string
  envOptions: unknown[]
  vertexInfoMap: JobDagVertex[]
  pipelineEdges: Record<string, unknown>
}

export interface JobSummary {
  jobId: string
  jobName: string
  jobStatus: string
  createTime: string
  finishTime?: string
  finishedTime?: string
  errorMsg?: string | null
  jobDag?: JobDag
  metrics?: JobMetrics | string
  pluginJarsUrls?: string[]
  isStartWithSavePoint?: boolean
  envOptions?: Record<string, unknown>
}

export interface JobDetail extends JobSummary {
  finishedTime?: string
}

export interface PendingJobsResponse {
  queueSummary: {
    size: number
    scheduleStrategy: string
    oldestEnqueueTimestamp?: number
    newestEnqueueTimestamp?: number
    lackingTaskGroups: number
  }
  clusterSnapshot: {
    totalSlots: number
    freeSlots: number
    assignedSlots: number
    workerCount: number
    workers: Array<{
      address: string
      tags: Record<string, string>
      totalSlots: number
      freeSlots: number
      dynamicSlot: boolean
      cpuUsage?: number
      memUsage?: number
      runningJobIds: number[]
    }>
  }
  pendingJobs: Array<{
    jobId: number
    jobName: string
    jobStatus: string
    waitDurationMs: number
    lackingTaskGroups: number
    failureReason?: string
    failureMessage?: string
  }>
}

export interface SystemMonitoringNode {
  isMaster?: string
  host?: string
  port?: string
  processors: string
  'physical.memory.total': string
  'physical.memory.free': string
  'heap.memory.used': string
  'heap.memory.total': string
  'heap.memory.max': string
  'heap.memory.used/total': string
  'heap.memory.used/max': string
  'load.process': string
  'load.system': string
  'thread.count': string
  [key: string]: string | undefined
}

export interface LogEntry {
  node: string
  logLink: string
  logName: string
}

export interface SubmitJobResponse {
  jobId: number | string
  jobName: string
}

export interface CheckpointOverview {
  jobId: string
  updatedAt?: number
  pipelines?: Array<{
    pipelineId: number
    counts?: Record<string, number>
    latestCompleted?: Record<string, unknown>
    latestFailed?: Record<string, unknown>
    inProgress?: Array<Record<string, unknown>>
    history?: Array<{ pipelineId: number; checkpoint: Record<string, unknown> }>
  }>
}

export interface CheckpointHistoryItem {
  pipelineId: number
  checkpoint: Record<string, unknown>
}

export type FinishedJobState = 'FINISHED' | 'CANCELED' | 'FAILED' | 'SAVEPOINT_DONE' | 'UNKNOWABLE'

export interface PaginatedJobList {
  data: JobSummary[]
  total: number
}
