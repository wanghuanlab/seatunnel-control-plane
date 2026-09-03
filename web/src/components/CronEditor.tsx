import type { CronEditorConfig, CronPreset } from '../utils/cron'
import {
  CRON_PRESET_OPTIONS,
  TIMEZONE_OPTIONS,
  buildCronExpression,
  defaultCronConfig,
  describeCronExpression,
  weekdayLabel,
} from '../utils/cron'

interface Props {
  config: CronEditorConfig
  timezone: string
  onConfigChange: (config: CronEditorConfig) => void
  onTimezoneChange: (timezone: string) => void
}

export function CronEditor({ config, timezone, onConfigChange, onTimezoneChange }: Props) {
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

  let preview = describeCronExpression(config, timezone)
  let cronExpr = ''
  try {
    cronExpr = buildCronExpression(config)
  } catch (error) {
    preview = String(error)
  }

  return (
    <div className="form-grid">
      <div className="form-row">
        <label>执行频率</label>
        <div className="cron-preset-grid">
          {CRON_PRESET_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`cron-preset-card${config.preset === option.value ? ' active' : ''}`}
              onClick={() => setPreset(option.value)}
            >
              <div className="cron-preset-title">{option.label}</div>
              <div className="cron-preset-hint">{option.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {config.preset === 'hourly' && (
        <div className="form-row">
          <label htmlFor="cronMinute">在每小时的第几分钟执行</label>
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
            <label htmlFor="cronHour">小时 (0-23)</label>
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
            <label htmlFor="cronMinuteOfHour">分钟 (0-59)</label>
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
          <label>选择星期</label>
          <div className="cron-weekday-grid">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <label key={day} className={`cron-weekday${config.daysOfWeek?.includes(day) ? ' active' : ''}`}>
                <input
                  type="checkbox"
                  checked={config.daysOfWeek?.includes(day) || false}
                  onChange={() => toggleWeekday(day)}
                />
                {weekdayLabel(day)}
              </label>
            ))}
          </div>
        </div>
      )}

      {config.preset === 'monthly' && (
        <div className="form-row">
          <label htmlFor="cronDayOfMonth">每月第几天 (1-31)</label>
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
          <label htmlFor="cronCustom">Cron 表达式（分 时 日 月 星期）</label>
          <input
            id="cronCustom"
            className="mono"
            value={config.customExpr || ''}
            onChange={(e) => update({ customExpr: e.target.value })}
            placeholder="0 9 * * 1-5"
          />
          <div className="cron-help">示例：每天 9:00 → <code>0 9 * * *</code>；工作日 9:00 → <code>0 9 * * 1-5</code></div>
        </div>
      )}

      <div className="form-row">
        <label htmlFor="cronTimezone">时区</label>
        <select id="cronTimezone" value={timezone} onChange={(e) => onTimezoneChange(e.target.value)}>
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      <div className="cron-preview">
        <div className="cron-preview-title">调度说明</div>
        <div>{preview}</div>
        {cronExpr && <div className="mono cron-preview-expr">表达式：{cronExpr}</div>}
      </div>
    </div>
  )
}
