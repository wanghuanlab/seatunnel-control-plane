import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { tasksApi } from '../api/tasksClient'
import { I18nService } from '../core/i18n.service'
import { PollingSource } from '../core/polling'
import type { PaginatedTaskRuns, Task } from '../types/tasks'
import { formatTimestamp } from '../utils/format'

type DetailTab = 'basic' | 'schedule' | 'runs'

@Component({
  selector: 'app-task-detail-page',
  templateUrl: './task-detail-page.component.html',
})
export class TaskDetailPageComponent implements OnInit, OnDestroy {
  taskId = 0
  tab: DetailTab = 'basic'
  autoRefresh = true
  running = false
  message: string | null = null
  runsPage = 1
  runsPageSize = 20
  task: PollingSource<Task>
  runs: PollingSource<PaginatedTaskRuns>
  formatTimestamp = formatTimestamp

  constructor(
    public i18n: I18nService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    const tick = () => this.cdr.markForCheck()
    this.task = new PollingSource(() => tasksApi.get(this.taskId), tick)
    this.runs = new PollingSource(() => tasksApi.runs(this.taskId, this.runsPage, this.runsPageSize), tick)
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.taskId = Number(params.get('id'))
      this.runsPage = 1
      this.task.setLoader(() => tasksApi.get(this.taskId))
      this.runs.setLoader(() => tasksApi.runs(this.taskId, this.runsPage, this.runsPageSize))
    })
    this.route.queryParamMap.subscribe((params) => {
      const value = params.get('tab')
      this.tab = value === 'schedule' || value === 'runs' ? value : 'basic'
      this.syncPolling()
    })
    this.task.start(10000, this.autoRefresh && this.tab !== 'schedule')
    this.runs.start(10000, this.autoRefresh && this.tab === 'runs')
  }

  ngOnDestroy() {
    this.task.destroy()
    this.runs.destroy()
  }

  get runRows() {
    return Array.isArray(this.runs.data?.data) ? this.runs.data.data : []
  }

  get runsTotal() {
    return this.runs.data?.total ?? this.runRows.length
  }

  get submittedOk() {
    return this.message ? /submitted|已提交/i.test(this.message) : false
  }

  setTab(next: DetailTab) {
    void this.router.navigate([], { queryParams: next === 'basic' ? {} : { tab: next }, queryParamsHandling: '', replaceUrl: true })
  }

  setAutoRefresh(value: boolean) {
    this.autoRefresh = value
    this.syncPolling()
  }

  setRunsPage(page: number) {
    this.runsPage = page
    this.runs.setLoader(() => tasksApi.runs(this.taskId, this.runsPage, this.runsPageSize))
  }

  setRunsPageSize(size: number) {
    this.runsPageSize = size
    this.runsPage = 1
    this.runs.setLoader(() => tasksApi.runs(this.taskId, this.runsPage, this.runsPageSize))
  }

  async handleRun() {
    if (!this.task.data) return
    if (!window.confirm(this.i18n.t('tasks.confirmRun', { name: this.task.data.name }))) return
    this.running = true
    this.message = null
    try {
      const result = await tasksApi.run(this.taskId)
      this.message = this.i18n.t('tasks.submitted', { name: result.submitResult.jobName, id: result.submitResult.jobId })
      this.runsPage = 1
      await Promise.all([this.task.reload(), this.runs.reload()])
    } catch (error) {
      this.message = String(error)
    } finally {
      this.running = false
    }
  }

  async handleDelete() {
    if (!this.task.data) return
    if (!window.confirm(this.i18n.t('tasks.confirmDelete', { name: this.task.data.name }))) return
    await tasksApi.delete(this.taskId)
    await this.router.navigate(['/tasks'])
  }

  private syncPolling() {
    this.task.setEnabled(this.autoRefresh && this.tab !== 'schedule')
    this.runs.setEnabled(this.autoRefresh && this.tab === 'runs')
  }
}
