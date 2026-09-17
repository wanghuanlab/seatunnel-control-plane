import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { seatunnelApi } from '../api/client'
import { AsyncSource } from '../core/polling'
import { I18nService } from '../core/i18n.service'
import type { CheckpointHistoryItem, CheckpointOverview, JobDetail } from '../types/api'
import { formatMetricEntries, formatTimestamp } from '../utils/format'

@Component({
  selector: 'app-job-detail-page',
  templateUrl: './job-detail-page.component.html',
})
export class JobDetailPageComponent implements OnInit, OnDestroy {
  jobId = ''
  job: AsyncSource<JobDetail>
  checkpoints: AsyncSource<CheckpointOverview>
  history: AsyncSource<CheckpointHistoryItem[]>
  formatTimestamp = formatTimestamp

  constructor(public i18n: I18nService, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {
    const tick = () => this.cdr.markForCheck()
    this.job = new AsyncSource(() => seatunnelApi.getJobInfo(this.jobId), tick)
    this.checkpoints = new AsyncSource(() => seatunnelApi.getCheckpointOverview(this.jobId), tick)
    this.history = new AsyncSource(() => seatunnelApi.getCheckpointHistory(this.jobId, { limit: 10 }), tick)
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.jobId = params.get('jobId') || ''
      this.job.destroy()
      this.checkpoints.destroy()
      this.history.destroy()
      const tick = () => this.cdr.markForCheck()
      this.job = new AsyncSource(() => seatunnelApi.getJobInfo(this.jobId), tick)
      this.checkpoints = new AsyncSource(() => seatunnelApi.getCheckpointOverview(this.jobId), tick)
      this.history = new AsyncSource(() => seatunnelApi.getCheckpointHistory(this.jobId, { limit: 10 }), tick)
    })
  }

  ngOnDestroy() {
    this.job.destroy()
    this.checkpoints.destroy()
    this.history.destroy()
  }

  metricGroups(detail: JobDetail) {
    const metrics = formatMetricEntries(detail.metrics as Record<string, unknown> | string | undefined, this.i18n.t, this.i18n.locale)
    return metrics.reduce<Record<string, typeof metrics>>((acc, item) => {
      acc[item.group] = acc[item.group] || []
      acc[item.group].push(item)
      return acc
    }, {})
  }

  metricEntries(detail: JobDetail) {
    return formatMetricEntries(detail.metrics as Record<string, unknown> | string | undefined, this.i18n.t, this.i18n.locale)
  }

  historyRows(items: CheckpointHistoryItem[] | null) {
    return Array.isArray(items) ? items : []
  }

  async handleStop() {
    if (!window.confirm(this.i18n.t('jobs.confirmStop', { id: this.jobId }))) return
    await seatunnelApi.stopJob(this.jobId)
    await this.job.reload()
  }

  checkpointValue(item: CheckpointHistoryItem, key: string) {
    return String(item.checkpoint[key] ?? '—')
  }
}
