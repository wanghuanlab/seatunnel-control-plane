import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'
import { seatunnelApi } from '../api/client'
import { I18nService } from '../core/i18n.service'
import { PollingSource } from '../core/polling'
import type { PendingJobsResponse } from '../types/api'
import { formatDuration } from '../utils/format'

@Component({
  selector: 'app-pending-page',
  templateUrl: './pending-page.component.html',
})
export class PendingPageComponent implements OnInit, OnDestroy {
  autoRefresh = true
  pending: PollingSource<PendingJobsResponse>
  formatDuration = formatDuration

  constructor(public i18n: I18nService, private cdr: ChangeDetectorRef) {
    this.pending = new PollingSource(() => seatunnelApi.getPendingJobs({ pretty: true }), () => this.cdr.markForCheck())
  }

  ngOnInit() {
    this.pending.start(10000, this.autoRefresh)
  }

  ngOnDestroy() {
    this.pending.destroy()
  }

  setAutoRefresh(value: boolean) {
    this.autoRefresh = value
    this.pending.setEnabled(value)
  }

  jobTitle(job: { jobName: string; jobId: number }) {
    return job.jobName || this.i18n.t('app.jobFallback', { id: job.jobId })
  }
}
