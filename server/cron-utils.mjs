/** @typedef {'every_minute' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'} CronPreset */

/**
 * @typedef {Object} CronEditorConfig
 * @property {CronPreset} preset
 * @property {number} [minute]
 * @property {number} [hour]
 * @property {number} [minuteOfHour]
 * @property {number[]} [daysOfWeek]
 * @property {number} [dayOfMonth]
 * @property {string} [customExpr]
 */

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function buildCronExpression(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('无效的调度配置')
  }

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

  if (preset === 'daily') {
    return `${minute} ${hour} * * *`
  }

  if (preset === 'weekly') {
    const days = Array.isArray(config.daysOfWeek) ? [...new Set(config.daysOfWeek.map(Number))] : [1]
    if (!days.length) throw new Error('请至少选择一个星期')
    for (const d of days) {
      if (d < 0 || d > 6) throw new Error('星期取值无效')
    }
    return `${minute} ${hour} * * ${days.sort((a, b) => a - b).join(',')}`
  }

  if (preset === 'monthly') {
    const dom = clamp(Number(config.dayOfMonth ?? 1), 1, 31, '日期')
    return `${minute} ${hour} ${dom} * *`
  }

  throw new Error(`不支持的调度类型: ${preset}`)
}

export function describeCronExpression(config, timezone = 'Asia/Shanghai') {
  try {
    const expr = buildCronExpression(config)
    return describeRawCron(expr, timezone, config)
  } catch (error) {
    return String(error.message || error)
  }
}

export function describeRawCron(expr, timezone = 'Asia/Shanghai', config) {
  if (config?.preset === 'every_minute') return `在 ${timezone} 时区，每分钟执行一次`
  if (config?.preset === 'hourly') {
    return `在 ${timezone} 时区，每小时的第 ${config.minute ?? 0} 分钟执行`
  }
  if (config?.preset === 'daily') {
    return `在 ${timezone} 时区，每天 ${pad(config.hour ?? 9)}:${pad(config.minuteOfHour ?? 0)} 执行`
  }
  if (config?.preset === 'weekly') {
    const days = (config.daysOfWeek || [1]).map((d) => WEEKDAY_LABELS[d]).join('、')
    return `在 ${timezone} 时区，每周 ${days} 的 ${pad(config.hour ?? 9)}:${pad(config.minuteOfHour ?? 0)} 执行`
  }
  if (config?.preset === 'monthly') {
    return `在 ${timezone} 时区，每月 ${config.dayOfMonth ?? 1} 日 ${pad(config.hour ?? 9)}:${pad(config.minuteOfHour ?? 0)} 执行`
  }
  if (config?.preset === 'custom') {
    return `在 ${timezone} 时区，按 Cron 表达式执行：${expr}`
  }
  return `Cron: ${expr}`
}

export function defaultCronConfig() {
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

function clamp(value, min, max, label) {
  if (Number.isNaN(value) || value < min || value > max) {
    throw new Error(`${label}需在 ${min}-${max} 之间`)
  }
  return value
}

function pad(n) {
  return String(n).padStart(2, '0')
}
