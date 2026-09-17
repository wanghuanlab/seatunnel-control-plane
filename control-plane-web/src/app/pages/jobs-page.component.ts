import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'
import { seatunnelApi } from '../api/client'
import { I18nService } from '../core/i18n.service'
import { PollingSource } from '../core/polling'
import type { FinishedJobState, JobSummary, PaginatedJobList } from '../types/api'

const FINISHED_STATES: Array<FinishedJobState | 'ALL'> = ['ALL', 'FINISHED', 'FAILED', 'CANCELED', 'SAVEPOINT_DONE', 'UNKNOWABLE']

@Component({
  selector: 'app-jobs-page',
  templateUrl: './jobs-page.component.html',
})
export class JobsPageComponent implements OnInit, OnDestroy {
  tab: 'running' | 'finished' = 'running'
  finishedState: FinishedJobState | 'ALL' = 'ALL'
  selectedIds: string[] = []
  autoRefresh = true
  runningPage = 1
  finishedPage = 1
  pageSize = 20
  finishedStates = FINISHED_STATES
  running: PollingSource<PaginatedJobList>
  finished: PollingSource<PaginatedJobList>

  constructor(public i18n: I18nService, private cdr: ChangeDetectorRef) {
    const tick = () => this.cdr.markForCheck()
    this.running = new PollingSource(() => seatunnelApi.getRunningJobs(this.runningPage, this.pageSize), tick)
    this.finished = new PollingSource(
      () => seatunnelApi.getFinishedJobs(this.finishedState === 'ALL' ? undefined : this.finishedState, this.finishedPage, this.pageSize),
      tick,
    )
  }

  ngOnInit() {
    this.running.start(10000, this.autoRefresh && this.tab === 'running')
    this.finished.start(15000, this.autoRefresh && this.tab === 'finished')
  }

  ngOnDestroy() {
    this.running.destroy()
    this.finished.destroy()
  }

  get active() {
    return this.tab === 'running' ? this.running : this.finished
  }

  get page() {
    return this.tab === 'running' ? this.runningPage : this.finishedPage
  }

  get jobs(): JobSummary[] {
    return Array.isArray(this.active.data?.data) ? this.active.data.data : []
  }

  get total() {
    return this.active.data?.total ?? this.jobs.length
  }

  setTab(tab: 'running' | 'finished') {
    this.tab = tab
    this.selectedIds = []
    this.syncPolling()
  }

  setFinishedState(state: FinishedJobState | 'ALL') {
    this.finishedState = state
    this.finishedPage = 1
    this.finished.setLoader(() => seatunnelApi.getFinishedJobs(this.finishedState === 'ALL' ? undefined : this.finishedState, this.finishedPage, this.pageSize))
  }

  setAutoRefresh(value: boolean) {
    this.autoRefresh = value
    this.syncPolling()
  }

  setPage(page: number) {
    if (this.tab === 'running') {
      this.runningPage = page
      this.selectedIds = []
      this.running.setLoader(() => seatunnelApi.getRunningJobs(this.runningPage, this.pageSize))
    } else {
      this.finishedPage = page
      this.finished.setLoader(() => seatunnelApi.getFinishedJobs(this.finishedState === 'ALL' ? undefined : this.finishedState, this.finishedPage, this.pageSize))
    }
  }

  setPageSize(size: number) {
    this.pageSize = size
    this.runningPage = 1
    this.finishedPage = 1
    this.selectedIds = []
    this.running.setLoader(() => seatunnelApi.getRunningJobs(this.runningPage, this.pageSize))
    this.finished.setLoader(() => seatunnelApi.getFinishedJobs(this.finishedState === 'ALL' ? undefined : this.finishedState, this.finishedPage, this.pageSize))
  }

  async handleStop(jobId: string) {
    if (!window.confirm(this.i18n.t('jobs.confirmStop', { id: jobId }))) return
    await seatunnelApi.stopJob(jobId)
    await this.running.reload()
    this.selectedIds = this.selectedIds.filter((id) => id !== jobId)
  }

  async handleBatchStop() {
    if (!this.selectedIds.length) return
    if (!window.confirm(this.i18n.t('jobs.confirmBatchStop', { count: this.selectedIds.length }))) return
    await seatunnelApi.stopJobs(this.selectedIds.map((jobId) => ({ jobId })))
    await this.running.reload()
    this.selectedIds = []
  }

  toggleSelection(event: { jobId: string; checked: boolean }) {
    this.selectedIds = event.checked
      ? [...new Set([...this.selectedIds, event.jobId])]
      : this.selectedIds.filter((id) => id !== event.jobId)
  }

  toggleAll(checked: boolean) {
    this.selectedIds = checked ? this.jobs.map((job) => job.jobId) : []
  }

  private syncPolling() {
    this.running.setEnabled(this.autoRefresh && this.tab === 'running')
    this.finished.setEnabled(this.autoRefresh && this.tab === 'finished')
  }
}
