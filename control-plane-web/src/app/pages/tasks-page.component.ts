import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'
import { tasksApi } from '../api/tasksClient'
import { I18nService } from '../core/i18n.service'
import { PollingSource } from '../core/polling'
import type { Task } from '../types/tasks'
import { describeCronPeriod } from '../utils/cron'
import { formatTimestamp } from '../utils/format'

@Component({
  selector: 'app-tasks-page',
  templateUrl: './tasks-page.component.html',
})
export class TasksPageComponent implements OnInit, OnDestroy {
  autoRefresh = true
  message: string | null = null
  messageOk = false
  runningId: number | null = null
  tasks: PollingSource<Task[]>
  formatTimestamp = formatTimestamp

  constructor(public i18n: I18nService, private cdr: ChangeDetectorRef) {
    this.tasks = new PollingSource(() => tasksApi.list(true), () => this.cdr.markForCheck())
  }

  ngOnInit() {
    this.tasks.start(10000, this.autoRefresh)
  }

  ngOnDestroy() {
    this.tasks.destroy()
  }

  setAutoRefresh(value: boolean) {
    this.autoRefresh = value
    this.tasks.setEnabled(value)
  }

  scheduleOn(task: Task) {
    return Boolean(task.schedule?.enabled)
  }

  period(task: Task) {
    return this.scheduleOn(task) && task.schedule?.cronConfig
      ? describeCronPeriod(task.schedule.cronConfig, this.i18n.t)
      : null
  }

  async handleRun(task: Task) {
    if (!window.confirm(this.i18n.t('tasks.confirmRun', { name: task.name }))) return
    this.runningId = task.id
    this.message = null
    try {
      const result = await tasksApi.run(task.id)
      this.messageOk = true
      this.message = this.i18n.t('tasks.submitted', { name: result.submitResult.jobName, id: result.submitResult.jobId })
      await this.tasks.reload()
    } catch (error) {
      this.messageOk = false
      this.message = String(error)
    } finally {
      this.runningId = null
    }
  }

  async handleDelete(task: Task) {
    if (!window.confirm(this.i18n.t('tasks.confirmDelete', { name: task.name }))) return
    this.message = null
    try {
      await tasksApi.delete(task.id)
      await this.tasks.reload()
    } catch (error) {
      this.messageOk = false
      this.message = String(error)
    }
  }
}
