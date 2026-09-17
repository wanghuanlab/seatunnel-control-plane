import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'
import { seatunnelApi } from '../api/client'
import { I18nService } from '../core/i18n.service'
import { PollingSource } from '../core/polling'
import type { LogEntry } from '../types/api'

@Component({
  selector: 'app-logs-page',
  templateUrl: './logs-page.component.html',
})
export class LogsPageComponent implements OnInit, OnDestroy {
  jobIdInput = ''
  jobId = ''
  content: string | null = null
  autoRefresh = false
  logs: PollingSource<LogEntry[]>

  constructor(public i18n: I18nService, private cdr: ChangeDetectorRef) {
    this.logs = new PollingSource(async () => {
      const result = await seatunnelApi.getLogs(this.jobId || undefined, 'json')
      return Array.isArray(result) ? result as LogEntry[] : []
    }, () => this.cdr.markForCheck())
  }

  ngOnInit() {
    this.logs.start(15000, this.autoRefresh)
  }

  ngOnDestroy() {
    this.logs.destroy()
  }

  setAutoRefresh(value: boolean) {
    this.autoRefresh = value
    this.logs.setEnabled(value)
  }

  applyFilter() {
    const next = this.jobIdInput.trim()
    if (next === this.jobId) {
      this.logs.reload()
      return
    }
    this.jobId = next
    this.logs.setLoader(async () => {
      const result = await seatunnelApi.getLogs(this.jobId || undefined, 'json')
      return Array.isArray(result) ? result as LogEntry[] : []
    })
  }

  async openLog(logName: string) {
    this.content = await seatunnelApi.getLogContent(logName)
  }
}
