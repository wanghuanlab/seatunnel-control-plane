import { Component, EventEmitter, Input, Output } from '@angular/core'
import { I18nService } from '../core/i18n.service'
import type { CronEditorConfig, CronPreset } from '../utils/cron'
import {
  CRON_PRESET_OPTIONS,
  buildCronExpression,
  defaultCronConfig,
  describeCronExpression,
  listTimezones,
  weekdayLabel,
} from '../utils/cron'

@Component({
  selector: 'app-cron-editor',
  template: `
    <div class="form-grid">
      <div class="form-row">
        <label>{{ i18n.t('schedule.frequency') }}</label>
        <div class="cron-preset-grid">
          <button
            *ngFor="let option of presets"
            type="button"
            class="cron-preset-card"
            [class.active]="config.preset === option.value"
            (click)="setPreset(option.value)"
          >
            <div class="cron-preset-title">{{ i18n.t(option.labelKey) }}</div>
            <div class="cron-preset-hint">{{ i18n.t(option.hintKey) }}</div>
          </button>
        </div>
      </div>

      <div class="form-row" *ngIf="config.preset === 'hourly'">
        <label for="cronMinute">{{ i18n.t('schedule.minuteOfHour') }}</label>
        <input id="cronMinute" type="number" min="0" max="59" [ngModel]="config.minute ?? 0" (ngModelChange)="update({ minute: +$event })" />
      </div>

      <div class="form-row cron-time-row" *ngIf="config.preset === 'daily' || config.preset === 'weekly' || config.preset === 'monthly'">
        <div>
          <label for="cronHour">{{ i18n.t('schedule.hour') }}</label>
          <input id="cronHour" type="number" min="0" max="23" [ngModel]="config.hour ?? 9" (ngModelChange)="update({ hour: +$event })" />
        </div>
        <div>
          <label for="cronMinuteOfHour">{{ i18n.t('schedule.minute') }}</label>
          <input id="cronMinuteOfHour" type="number" min="0" max="59" [ngModel]="config.minuteOfHour ?? 0" (ngModelChange)="update({ minuteOfHour: +$event })" />
        </div>
      </div>

      <div class="form-row" *ngIf="config.preset === 'weekly'">
        <label>{{ i18n.t('schedule.weekdays') }}</label>
        <div class="cron-weekday-grid">
          <label *ngFor="let day of weekdays" class="cron-weekday" [class.active]="hasWeekday(day)">
            <input type="checkbox" [checked]="hasWeekday(day)" (change)="toggleWeekday(day)" />
            {{ weekdayLabel(day, i18n.t) }}
          </label>
        </div>
      </div>

      <div class="form-row" *ngIf="config.preset === 'monthly'">
        <label for="cronDayOfMonth">{{ i18n.t('schedule.dayOfMonth') }}</label>
        <input id="cronDayOfMonth" type="number" min="1" max="31" [ngModel]="config.dayOfMonth ?? 1" (ngModelChange)="update({ dayOfMonth: +$event })" />
      </div>

      <div class="form-row" *ngIf="config.preset === 'custom'">
        <label for="cronCustom">{{ i18n.t('schedule.cronExpr') }}</label>
        <input id="cronCustom" class="mono" [ngModel]="config.customExpr || ''" (ngModelChange)="update({ customExpr: $event })" placeholder="0 9 * * 1-5" />
        <div class="cron-help">{{ i18n.t('schedule.cronHelp') }}</div>
      </div>

      <div class="form-row">
        <label for="cronTimezone">{{ i18n.t('schedule.timezone') }}</label>
        <select id="cronTimezone" [ngModel]="timezone" (ngModelChange)="timezoneChange.emit($event)">
          <option *ngFor="let tz of timezones" [ngValue]="tz">{{ tz }}</option>
        </select>
      </div>

      <div class="cron-preview">
        <div class="cron-preview-title">{{ i18n.t('schedule.preview') }}</div>
        <div>{{ preview }}</div>
        <div class="mono cron-preview-expr" *ngIf="cronExpr">{{ i18n.t('schedule.expr', { expr: cronExpr }) }}</div>
      </div>
    </div>
  `,
})
export class CronEditorComponent {
  @Input() config: CronEditorConfig = defaultCronConfig()
  @Input() timezone = 'Asia/Shanghai'
  @Output() configChange = new EventEmitter<CronEditorConfig>()
  @Output() timezoneChange = new EventEmitter<string>()

  presets = CRON_PRESET_OPTIONS
  weekdays = [0, 1, 2, 3, 4, 5, 6]
  weekdayLabel = weekdayLabel

  constructor(public i18n: I18nService) {}

  get timezones() {
    return listTimezones(this.timezone)
  }

  get preview() {
    try {
      return describeCronExpression(this.config, this.timezone, this.i18n.t)
    } catch (error) {
      return String(error)
    }
  }

  get cronExpr() {
    try {
      return buildCronExpression(this.config, this.i18n.t)
    } catch {
      return ''
    }
  }

  setPreset(preset: CronPreset) {
    this.configChange.emit({ ...defaultCronConfig(), ...this.config, preset })
  }

  update(patch: Partial<CronEditorConfig>) {
    this.configChange.emit({ ...this.config, ...patch })
  }

  hasWeekday(day: number) {
    return this.config.daysOfWeek?.includes(day) || false
  }

  toggleWeekday(day: number) {
    const current = this.config.daysOfWeek || []
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    this.update({ daysOfWeek: next.sort((a, b) => a - b) })
  }
}
