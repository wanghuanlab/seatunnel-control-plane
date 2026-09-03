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

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export const CRON_PRESET_OPTIONS: Array<{ value: CronPreset; label: string; hint: string }> = [
  { value: 'every_minute', label: '每分钟', hint: '适合测试，生产环境慎用' },
  { value: 'hourly', label: '每小时', hint: '在每小时的指定分钟执行' },
  { value: 'daily', label: '每天', hint: '每天在固定时刻执行' },
  { value: 'weekly', label: '每周', hint: '选择星期几 + 时刻' },
  { value: 'monthly', label: '每月', hint: '每月固定日期 + 时刻' },
  { value: 'custom', label: '高级自定义', hint: '直接编辑 Cron 表达式' },
]

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Shanghai', label: '中国标准时间 (Asia/Shanghai)' },
  { value: 'Asia/Hong_Kong', label: '香港 (Asia/Hong_Kong)' },
  { value: 'UTC', label: 'UTC' },
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

export function buildCronExpression(config: CronEditorConfig): string {
  const preset = config.preset || 'daily'

  if (preset === 'custom') {
    const expr = String(config.customExpr || '').trim()
    if (!expr) throw new Error('请填写 Cron 表达式')
    return expr
  }

  if (preset === 'every_minute') return '* * * * *'

  if (preset === 'hourly') {
    const minute = clamp(Number(config.minute ?? 0), 0, 59, '分钟')
    return `${minute} * * * *`
  }

  const minute = clamp(Number(config.minuteOfHour ?? 0), 0, 59, '分钟')
  const hour = clamp(Number(config.hour ?? 9), 0, 23, '小时')

  if (preset === 'daily') return `${minute} ${hour} * * *`

  if (preset === 'weekly') {
    const days = Array.isArray(config.daysOfWeek) ? [...new Set(config.daysOfWeek.map(Number))] : [1]
    if (!days.length) throw new Error('请至少选择一个星期')
    return `${minute} ${hour} * * ${days.sort((a, b) => a - b).join(',')}`
  }

  if (preset === 'monthly') {
    const dom = clamp(Number(config.dayOfMonth ?? 1), 1, 31, '日期')
    return `${minute} ${hour} ${dom} * *`
  }

  throw new Error(`不支持的调度类型: ${preset}`)
}

export function describeCronExpression(config: CronEditorConfig, timezone = 'Asia/Shanghai'): string {
  try {
    const expr = buildCronExpression(config)
    if (config.preset === 'every_minute') return `在 ${timezone} 时区，每分钟执行一次`
    if (config.preset === 'hourly') return `在 ${timezone} 时区，每小时的第 ${config.minute ?? 0} 分钟执行`
    if (config.preset === 'daily') {
      return `在 ${timezone} 时区，每天 ${pad(config.hour ?? 9)}:${pad(config.minuteOfHour ?? 0)} 执行`
    }
    if (config.preset === 'weekly') {
      const days = (config.daysOfWeek || [1]).map((d) => WEEKDAY_LABELS[d]).join('、')
      return `在 ${timezone} 时区，每周 ${days} 的 ${pad(config.hour ?? 9)}:${pad(config.minuteOfHour ?? 0)} 执行`
    }
    if (config.preset === 'monthly') {
      return `在 ${timezone} 时区，每月 ${config.dayOfMonth ?? 1} 日 ${pad(config.hour ?? 9)}:${pad(config.minuteOfHour ?? 0)} 执行`
    }
    if (config.preset === 'custom') return `在 ${timezone} 时区，按表达式执行：${expr}`
    return `Cron: ${expr}`
  } catch (error) {
    return String(error)
  }
}

export function weekdayLabel(day: number): string {
  return WEEKDAY_LABELS[day] || String(day)
}

function clamp(value: number, min: number, max: number, label: string): number {
  if (Number.isNaN(value) || value < min || value > max) {
    throw new Error(`${label}需在 ${min}-${max} 之间`)
  }
  return value
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
