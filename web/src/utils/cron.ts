import type { Translate } from '../i18n'

export type CronPreset = 'every_minute' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'

export interface CronEditorConfig {
  preset: CronPreset
  minute?: number
  hour?: number
  minuteOfHour?: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  customExpr?: string
}

export const CRON_PRESET_OPTIONS: Array<{ value: CronPreset; labelKey: string; hintKey: string }> = [
  { value: 'every_minute', labelKey: 'schedule.presetEveryMinute', hintKey: 'schedule.presetEveryMinuteHint' },
  { value: 'hourly', labelKey: 'schedule.presetHourly', hintKey: 'schedule.presetHourlyHint' },
  { value: 'daily', labelKey: 'schedule.presetDaily', hintKey: 'schedule.presetDailyHint' },
  { value: 'weekly', labelKey: 'schedule.presetWeekly', hintKey: 'schedule.presetWeeklyHint' },
  { value: 'monthly', labelKey: 'schedule.presetMonthly', hintKey: 'schedule.presetMonthlyHint' },
  { value: 'custom', labelKey: 'schedule.presetCustom', hintKey: 'schedule.presetCustomHint' },
]

export const TIMEZONE_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: 'Asia/Shanghai', labelKey: 'schedule.tzShanghai' },
  { value: 'Asia/Hong_Kong', labelKey: 'schedule.tzHongKong' },
  { value: 'UTC', labelKey: 'schedule.tzUtc' },
]

export function defaultCronConfig(): CronEditorConfig {
  return {
    preset: 'daily',
    hour: 9,
    minuteOfHour: 0,
    daysOfWeek: [1, 2, 3, 4, 5],
    dayOfMonth: 1,
    minute: 0,
    customExpr: '0 9 * * *',
  }
}

export function buildCronExpression(config: CronEditorConfig, t?: Translate): string {
  const preset = config.preset || 'daily'
  const tr = t ?? ((key: string, vars?: Record<string, string | number>) => key.replace(/\{(\w+)\}/g, (_, name) => String(vars?.[name] ?? '')))

  if (preset === 'custom') {
    const expr = String(config.customExpr || '').trim()
    if (!expr) throw new Error(tr('schedule.errNeedCron'))
    return expr
  }

  if (preset === 'every_minute') return '* * * * *'

  if (preset === 'hourly') {
    const minute = clamp(Number(config.minute ?? 0), 0, 59, tr('schedule.labelMinute'), tr)
    return `${minute} * * * *`
  }

  const minute = clamp(Number(config.minuteOfHour ?? 0), 0, 59, tr('schedule.labelMinute'), tr)
  const hour = clamp(Number(config.hour ?? 9), 0, 23, tr('schedule.labelHour'), tr)

  if (preset === 'daily') return `${minute} ${hour} * * *`

  if (preset === 'weekly') {
    const days = Array.isArray(config.daysOfWeek) ? [...new Set(config.daysOfWeek.map(Number))] : [1]
    if (!days.length) throw new Error(tr('schedule.errNeedWeekday'))
    return `${minute} ${hour} * * ${days.sort((a, b) => a - b).join(',')}`
  }

  if (preset === 'monthly') {
    const dom = clamp(Number(config.dayOfMonth ?? 1), 1, 31, tr('schedule.labelDay'), tr)
    return `${minute} ${hour} ${dom} * *`
  }

  throw new Error(tr('schedule.errUnsupported', { preset }))
}

export function describeCronExpression(config: CronEditorConfig, timezone = 'Asia/Shanghai', t?: Translate): string {
    const tr = t ?? ((key: string) => key)
  try {
    const expr = buildCronExpression(config, t)
    const time = `${pad(config.hour ?? 9)}:${pad(config.minuteOfHour ?? 0)}`
    if (config.preset === 'every_minute') return tr('schedule.describeEveryMinute', { tz: timezone })
    if (config.preset === 'hourly') return tr('schedule.describeHourly', { tz: timezone, minute: config.minute ?? 0 })
    if (config.preset === 'daily') return tr('schedule.describeDaily', { tz: timezone, time })
    if (config.preset === 'weekly') {
      const sep = document.documentElement.dataset.locale === 'zh' ? '、' : ', '
      const days = (config.daysOfWeek || [1]).map((day) => weekdayLabel(day, t)).join(sep)
      return tr('schedule.describeWeekly', { tz: timezone, days, time })
    }
    if (config.preset === 'monthly') {
      return tr('schedule.describeMonthly', { tz: timezone, day: config.dayOfMonth ?? 1, time })
    }
    if (config.preset === 'custom') return tr('schedule.describeCustom', { tz: timezone, expr })
    return `Cron: ${expr}`
  } catch (error) {
    return String(error)
  }
}

export function weekdayLabel(day: number, t?: Translate): string {
  if (t) return t(`schedule.weekday${day}`)
  return String(day)
}

function clamp(value: number, min: number, max: number, label: string, t?: Translate): number {
  if (Number.isNaN(value) || value < min || value > max) {
    const message = t
      ? t('schedule.errRange', { label, min, max })
      : `${label} must be between ${min} and ${max}`
    throw new Error(message)
  }
  return value
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
