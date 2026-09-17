import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'
import { seatunnelApi } from '../api/client'
import { tasksApi } from '../api/tasksClient'
import { AuthService } from '../core/auth.service'
import { I18nService } from '../core/i18n.service'
import { PollingSource } from '../core/polling'
import type { ClusterOverview, JobSummary, PendingJobsResponse, SystemMonitoringNode, WorkerResource, WorkerResourcesResponse } from '../types/api'
import type { Task } from '../types/tasks'
import { describeCronPeriod } from '../utils/cron'
import { elapsedMsSince, formatElapsed, formatSystemNodeRole, formatTimestamp } from '../utils/format'

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  tagKey = ''
  tagValue = ''
  appliedTagKey = ''
  appliedTagValue = ''
  showTagFilter = false
  autoRefresh = true

  overview: PollingSource<ClusterOverview>
  nodes: PollingSource<SystemMonitoringNode[]>
  pending: PollingSource<PendingJobsResponse>
  running: PollingSource<{ data: JobSummary[]; total: number }>
  workersRes: PollingSource<WorkerResourcesResponse | null>
  tasks: PollingSource<Task[]>

  formatTimestamp = formatTimestamp
  formatElapsed = formatElapsed
  elapsedMsSince = elapsedMsSince
  describeCronPeriod = describeCronPeriod
  formatSystemNodeRole = formatSystemNodeRole

  constructor(public auth: AuthService, public i18n: I18nService, private cdr: ChangeDetectorRef) {
    const tick = () => this.cdr.markForCheck()
    this.overview = new PollingSource(() => seatunnelApi.getOverview(this.tags), tick)
    this.nodes = new PollingSource(() => seatunnelApi.getSystemMonitoring(), tick)
    this.pending = new PollingSource(() => seatunnelApi.getPendingJobs({ limit: 5 }), tick)
    this.running = new PollingSource(() => seatunnelApi.getRunningJobs(1, 5), tick)
    this.workersRes = new PollingSource(() => seatunnelApi.getResourceWorkers(), tick)
    this.tasks = new PollingSource(() => tasksApi.list(false), tick)
  }

  ngOnInit() {
    this.overview.start(10000, this.autoRefresh)
    this.nodes.start(15000, this.autoRefresh)
    this.pending.start(10000, this.autoRefresh)
    this.running.start(10000, this.autoRefresh)
    this.workersRes.start(15000, this.autoRefresh)
    this.tasks.start(30000, this.autoRefresh)
  }

  ngOnDestroy() {
    ;[this.overview, this.nodes, this.pending, this.running, this.workersRes, this.tasks].forEach((source) => source.destroy())
  }

  get tags() {
    return this.appliedTagKey.trim() ? { [this.appliedTagKey.trim()]: this.appliedTagValue.trim() } : undefined
  }

  get workerList(): WorkerResource[] {
    const data = this.workersRes.data
    if (data?.available && data.workers.length) return data.workers
    return (this.pending.data?.clusterSnapshot.workers as WorkerResource[] | undefined) || []
  }

  get schedules() {
    return (this.tasks.data || []).filter((task) => task.isEnabled && task.schedule?.enabled).slice(0, 4)
  }

  get totalSlot() {
    return this.toNum(this.overview.data?.totalSlot)
  }

  get freeSlot() {
    return this.toNum(this.overview.data?.unassignedSlot)
  }

  get usedSlot() {
    return Math.max(0, this.totalSlot - this.freeSlot)
  }

  get pendingCount() {
    return this.toNum(this.overview.data?.pendingJobs) || this.pending.data?.queueSummary.size || 0
  }

  get completedCount() {
    return this.toNum(this.overview.data?.finishedJobs)
  }

  get failedCount() {
    return this.toNum(this.overview.data?.failedJobs)
  }

  get runningJobs() {
    return this.running.data?.data || []
  }

  get runningCount() {
    return this.running.data?.total ?? this.runningJobs.length
  }

  toNum(value: string | number | null | undefined) {
    const result = Number(value)
    return Number.isFinite(result) ? result : 0
  }

  usagePercent(value?: number): number | null {
    if (value == null || Number.isNaN(value)) return null
    return Math.max(0, Math.min(100, value <= 1 ? value * 100 : value))
  }

  parsePercent(value?: string): number | null {
    const match = String(value || '').match(/([\d.]+)\s*%/)
    return match ? Math.max(0, Math.min(100, Number(match[1]))) : null
  }

  jobTitle(job: JobSummary) {
    return job.jobName || this.i18n.t('app.jobFallback', { id: job.jobId })
  }

  applyFilter() {
    if (this.tagKey === this.appliedTagKey && this.tagValue === this.appliedTagValue) {
      this.overview.reload()
      return
    }
    this.appliedTagKey = this.tagKey
    this.appliedTagValue = this.tagValue
    this.overview.setLoader(() => seatunnelApi.getOverview(this.tags))
  }

  setAutoRefresh(value: boolean) {
    this.autoRefresh = value
    ;[this.overview, this.nodes, this.pending, this.running, this.workersRes, this.tasks].forEach((source) => source.setEnabled(value))
  }

  reloadAll() {
    ;[this.overview, this.nodes, this.pending, this.running, this.workersRes, this.tasks].forEach((source) => source.reload())
  }

  scheduleCycle(task: Task) {
    return task.schedule?.cronConfig
      ? describeCronPeriod(task.schedule.cronConfig, this.i18n.t)
      : (task.schedule?.description || this.i18n.t('dashboard.onSchedule'))
  }

  nowMinus(waitDurationMs?: number) {
    return Date.now() - (Number(waitDurationMs) || 0)
  }
}
