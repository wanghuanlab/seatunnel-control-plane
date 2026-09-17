import { Component, EventEmitter, Input, Output } from '@angular/core'
import { I18nService } from '../core/i18n.service'
import type { JobSummary } from '../types/api'
import { formatTimestamp, getMetricReadWrite } from '../utils/format'

@Component({
  selector: 'app-job-table',
  template: `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th class="select-column" *ngIf="selectable">
              <input
                [attr.aria-label]="i18n.t('jobs.selectAll')"
                type="checkbox"
                [checked]="allSelected"
                (change)="toggleAll.emit($any($event.target).checked)"
              />
            </th>
            <th>{{ i18n.t('jobs.colId') }}</th>
            <th>{{ i18n.t('jobs.colName') }}</th>
            <th>{{ i18n.t('jobs.colStatus') }}</th>
            <th>{{ i18n.t('jobs.colCreated') }}</th>
            <th>{{ i18n.t('jobs.colIO') }}</th>
            <th *ngIf="showActions">{{ i18n.t('app.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let job of rows">
            <td *ngIf="selectable">
              <input
                type="checkbox"
                [checked]="selectedIds.includes(job.jobId)"
                (change)="toggle.emit({ jobId: job.jobId, checked: $any($event.target).checked })"
              />
            </td>
            <td class="mono"><a [routerLink]="['/jobs', job.jobId]">{{ job.jobId }}</a></td>
            <td>{{ job.jobName || '—' }}</td>
            <td><app-status-badge [status]="job.jobStatus"></app-status-badge></td>
            <td>{{ formatTimestamp(job.createTime) }}</td>
            <td class="mono">{{ io(job).read }} / {{ io(job).write }}</td>
            <td *ngIf="showActions">
              <button class="btn danger compact" type="button" (click)="stop.emit(job.jobId)">
                {{ i18n.t('jobs.stop') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class JobTableComponent {
  @Input() jobs: JobSummary[] = []
  @Input() showActions = false
  @Input() selectable = false
  @Input() selectedIds: string[] = []
  @Output() toggle = new EventEmitter<{ jobId: string; checked: boolean }>()
  @Output() toggleAll = new EventEmitter<boolean>()
  @Output() stop = new EventEmitter<string>()

  formatTimestamp = formatTimestamp

  constructor(public i18n: I18nService) {}

  get rows() {
    return Array.isArray(this.jobs) ? this.jobs : []
  }

  get allSelected() {
    return this.rows.length > 0 && this.rows.every((job) => this.selectedIds.includes(job.jobId))
  }

  io(job: JobSummary) {
    return getMetricReadWrite(job.metrics as Record<string, unknown> | string | undefined)
  }
}
