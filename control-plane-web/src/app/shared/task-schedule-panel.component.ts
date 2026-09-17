import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core'
import { tasksApi } from '../api/tasksClient'
import { AsyncSource } from '../core/polling'
import { I18nService } from '../core/i18n.service'
import type { CronEditorConfig, TaskSchedule } from '../types/tasks'
import { defaultCronConfig } from '../utils/cron'
import { formatTimestamp } from '../utils/format'

@Component({
  selector: 'app-task-schedule-panel',
  template: `
    <section class="panel task-schedule-panel">
      <div class="panel-header">
        <h2 class="panel-title">{{ i18n.t('schedule.title') }}</h2>
        <label class="inline-check">
          <input type="checkbox" [(ngModel)]="enabled" />
          {{ i18n.t('schedule.enable') }}
        </label>
      </div>
      <div class="panel-body">
        <app-async-state [loading]="scheduleState.loading" [error]="scheduleState.error" [data]="scheduleState.data" [emptyText]="i18n.t('schedule.loadError')">
          <ng-template let-schedule>
            <div class="metric-grid" style="margin-bottom: 18px">
              <div class="metric-item">
                <div class="metric-key">{{ i18n.t('schedule.nextRun') }}</div>
                <div class="metric-value">{{ formatTimestamp(schedule.nextRunAt) }}</div>
              </div>
              <div class="metric-item">
                <div class="metric-key">{{ i18n.t('schedule.lastTrigger') }}</div>
                <div class="metric-value">{{ formatTimestamp(schedule.lastTriggerAt) }}</div>
              </div>
              <div class="metric-item">
                <div class="metric-key">{{ i18n.t('schedule.lastResult') }}</div>
                <div class="metric-value">{{ schedule.lastTriggerStatus || '—' }}</div>
              </div>
            </div>
            <div class="error" *ngIf="schedule.lastTriggerError" style="margin-bottom: 16px; padding: 12px">{{ schedule.lastTriggerError }}</div>
            <app-cron-editor [config]="config" [timezone]="timezone" (configChange)="config = $event" (timezoneChange)="timezone = $event"></app-cron-editor>
            <div class="actions" style="margin-top: 16px">
              <button class="btn primary" type="button" [disabled]="saving" (click)="save()">
                {{ saving ? i18n.t('schedule.saving') : i18n.t('schedule.save') }}
              </button>
            </div>
            <div *ngIf="message" [class.panel]="message.includes(i18n.t('schedule.saved'))" [class.error]="!message.includes(i18n.t('schedule.saved'))" style="margin-top: 16px; padding: 12px">
              {{ message }}
            </div>
          </ng-template>
        </app-async-state>
      </div>
    </section>
  `,
})
export class TaskSchedulePanelComponent implements OnChanges, OnDestroy {
  @Input() taskId!: number

  scheduleState = new AsyncSource<TaskSchedule>(() => tasksApi.getSchedule(this.taskId), () => this.cdr.markForCheck())
  enabled = false
  timezone = 'Asia/Shanghai'
  config: CronEditorConfig = defaultCronConfig()
  initialized = false
  saving = false
  message: string | null = null
  formatTimestamp = formatTimestamp

  constructor(public i18n: I18nService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.taskId) {
      this.initialized = false
      this.scheduleState.destroy()
      this.scheduleState = new AsyncSource<TaskSchedule>(() => tasksApi.getSchedule(this.taskId), () => {
        this.hydrate()
        this.cdr.markForCheck()
      })
    }
    this.hydrate()
  }

  ngOnDestroy() {
    this.scheduleState.destroy()
  }

  async save() {
    this.saving = true
    this.message = null
    try {
      const saved = await tasksApi.saveSchedule(this.taskId, { enabled: this.enabled, timezone: this.timezone, cronConfig: this.config })
      this.enabled = saved.enabled
      this.timezone = saved.timezone
      this.config = saved.cronConfig
      this.message = this.i18n.t('schedule.saved')
      await this.scheduleState.reload()
    } catch (error) {
      this.message = String(error)
    } finally {
      this.saving = false
    }
  }

  private hydrate() {
    if (!this.scheduleState.data || this.initialized) return
    const schedule = this.scheduleState.data
    this.enabled = schedule.enabled
    this.timezone = schedule.timezone
    this.config = schedule.cronConfig || defaultCronConfig()
    this.initialized = true
  }
}
