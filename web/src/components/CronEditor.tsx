import { useMemo } from 'react'
import type { CronEditorConfig, CronPreset } from '../utils/cron'
import {
  CRON_PRESET_OPTIONS,
  buildCronExpression,
  defaultCronConfig,
  describeCronExpression,
  listTimezones,
  weekdayLabel,
} from '../utils/cron'
import { useI18n } from '../i18n'

interface Props {
  config: CronEditorConfig
  timezone: string
  onConfigChange: (config: CronEditorConfig) => void
  onTimezoneChange: (timezone: string) => void
}

export function CronEditor({ config, timezone, onConfigChange, onTimezoneChange }: Props) {
  const { t } = useI18n()
  const timezones = useMemo(() => listTimezones(timezone), [timezone])

  const setPreset = (preset: CronPreset) => {
    onConfigChange({ ...defaultCronConfig(), ...config, preset })
  }

  const update = (patch: Partial<CronEditorConfig>) => {
    onConfigChange({ ...config, ...patch })
  }

  const toggleWeekday = (day: number) => {
    const current = config.daysOfWeek || []
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    update({ daysOfWeek: next.sort((a, b) => a - b) })
  }

  let preview = describeCronExpression(config, timezone, t)
  let cronExpr = ''
  try {
    cronExpr = buildCronExpression(config, t)
  } catch (error) {
    preview = String(error)
  }

  return (
    <div className="form-grid">
      <div className="form-row">
        <label>{t('schedule.frequency')}</label>
        <div className="cron-preset-grid">
          {CRON_PRESET_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`cron-preset-card${config.preset === option.value ? ' active' : ''}`}
              onClick={() => setPreset(option.value)}
            >
              <div className="cron-preset-title">{t(option.labelKey)}</div>
              <div className="cron-preset-hint">{t(option.hintKey)}</div>
            </button>
          ))}
        </div>
      </div>

      {config.preset === 'hourly' && (
        <div className="form-row">
          <label htmlFor="cronMinute">{t('schedule.minuteOfHour')}</label>
          <input
            id="cronMinute"
            type="number"
            min={0}
            max={59}
            value={config.minute ?? 0}
            onChange={(e) => update({ minute: Number(e.target.value) })}
          />
        </div>
      )}

      {(config.preset === 'daily' || config.preset === 'weekly' || config.preset === 'monthly') && (
        <div className="form-row cron-time-row">
          <div>
            <label htmlFor="cronHour">{t('schedule.hour')}</label>
            <input
              id="cronHour"
              type="number"
              min={0}
              max={23}
              value={config.hour ?? 9}
              onChange={(e) => update({ hour: Number(e.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="cronMinuteOfHour">{t('schedule.minute')}</label>
            <input
              id="cronMinuteOfHour"
              type="number"
              min={0}
              max={59}
              value={config.minuteOfHour ?? 0}
              onChange={(e) => update({ minuteOfHour: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {config.preset === 'weekly' && (
        <div className="form-row">
          <label>{t('schedule.weekdays')}</label>
          <div className="cron-weekday-grid">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <label key={day} className={`cron-weekday${config.daysOfWeek?.includes(day) ? ' active' : ''}`}>
                <input
                  type="checkbox"
                  checked={config.daysOfWeek?.includes(day) || false}
                  onChange={() => toggleWeekday(day)}
                />
                {weekdayLabel(day, t)}
              </label>
            ))}
          </div>
        </div>
      )}

      {config.preset === 'monthly' && (
        <div className="form-row">
          <label htmlFor="cronDayOfMonth">{t('schedule.dayOfMonth')}</label>
          <input
            id="cronDayOfMonth"
            type="number"
            min={1}
            max={31}
            value={config.dayOfMonth ?? 1}
            onChange={(e) => update({ dayOfMonth: Number(e.target.value) })}
          />
        </div>
      )}

      {config.preset === 'custom' && (
        <div className="form-row">
          <label htmlFor="cronCustom">{t('schedule.cronExpr')}</label>
          <input
            id="cronCustom"
            className="mono"
            value={config.customExpr || ''}
            onChange={(e) => update({ customExpr: e.target.value })}
            placeholder="0 9 * * 1-5"
          />
          <div className="cron-help">{t('schedule.cronHelp')}</div>
        </div>
      )}

      <div className="form-row">
        <label htmlFor="cronTimezone">{t('schedule.timezone')}</label>
        <select id="cronTimezone" value={timezone} onChange={(e) => onTimezoneChange(e.target.value)}>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      <div className="cron-preview">
        <div className="cron-preview-title">{t('schedule.preview')}</div>
        <div>{preview}</div>
        {cronExpr && <div className="mono cron-preview-expr">{t('schedule.expr', { expr: cronExpr })}</div>}
      </div>
    </div>
  )
}
