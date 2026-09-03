import type { Translate } from '../i18n'

const DISPLAY_TIME_ZONE = 'Asia/Shanghai'

function parseTimestamp(value?: string | number | null): Date | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const trimmed = String(value).trim()
  if (!trimmed) return null

  const numeric = Number(trimmed)
  if (!Number.isNaN(numeric) && /^\d+$/.test(trimmed) && trimmed.length >= 12) {
    const date = new Date(numeric)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatTimestamp(value?: string | number | null): string {
  const date = parseTimestamp(value)
  if (!date) return '—'

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: DISPLAY_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}

export function formatDuration(ms?: number): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.floor(ms / 60_000)} m ${Math.round((ms % 60_000) / 1000)} s`
}

export function jobStatusTone(status?: string): 'running' | 'success' | 'warning' | 'danger' | 'muted' {
  const normalized = (status || '').toUpperCase()
  if (['RUNNING', 'PENDING', 'RESTORE', 'SUBMITTED'].includes(normalized)) return 'running'
  if (normalized === 'IDLE') return 'muted'
  if (['FINISHED', 'SAVEPOINT_DONE'].includes(normalized)) return 'success'
  if (['CANCELLED', 'CANCELED'].includes(normalized)) return 'warning'
  if (['FAILED', 'UNKNOWABLE'].includes(normalized)) return 'danger'
  return 'muted'
}

export interface MetricEntry {
  group: string
  groupKey: MetricGroup
  label: string
  detail?: string
  value: string
}

type MetricGroup = 'source' | 'transform' | 'sink' | 'other'

const METRIC_META: Record<string, { group: MetricGroup }> = {
  SourceReceivedCount: { group: 'source' },
  TableSourceReceivedCount: { group: 'source' },
  SourceReceivedQPS: { group: 'source' },
  TableSourceReceivedQPS: { group: 'source' },
  SourceReceivedBytes: { group: 'source' },
  TableSourceReceivedBytes: { group: 'source' },
  SourceReceivedBytesPerSeconds: { group: 'source' },
  TableSourceReceivedBytesPerSeconds: { group: 'source' },
  IntermediateQueueSize: { group: 'transform' },
  SinkWriteCount: { group: 'sink' },
  TableSinkWriteCount: { group: 'sink' },
  SinkWriteQPS: { group: 'sink' },
  TableSinkWriteQPS: { group: 'sink' },
  SinkWriteBytes: { group: 'sink' },
  TableSinkWriteBytes: { group: 'sink' },
  SinkWriteBytesPerSeconds: { group: 'sink' },
  TableSinkWriteBytesPerSeconds: { group: 'sink' },
  SinkCommittedCount: { group: 'sink' },
  TableSinkCommittedCount: { group: 'sink' },
  SinkCommittedQPS: { group: 'sink' },
  TableSinkCommittedQPS: { group: 'sink' },
  SinkCommittedBytes: { group: 'sink' },
  TableSinkCommittedBytes: { group: 'sink' },
  SinkCommittedBytesPerSeconds: { group: 'sink' },
  TableSinkCommittedBytesPerSeconds: { group: 'sink' },
}

/** Table* 指标若有对应顶层标量，详情页只展示顶层，避免重复 */
const METRIC_SCALAR_PREFERENCE: Record<string, string> = {
  TableSourceReceivedCount: 'SourceReceivedCount',
  TableSourceReceivedQPS: 'SourceReceivedQPS',
  TableSourceReceivedBytes: 'SourceReceivedBytes',
  TableSourceReceivedBytesPerSeconds: 'SourceReceivedBytesPerSeconds',
  TableSinkWriteCount: 'SinkWriteCount',
  TableSinkWriteQPS: 'SinkWriteQPS',
  TableSinkWriteBytes: 'SinkWriteBytes',
  TableSinkWriteBytesPerSeconds: 'SinkWriteBytesPerSeconds',
  TableSinkCommittedCount: 'SinkCommittedCount',
  TableSinkCommittedQPS: 'SinkCommittedQPS',
  TableSinkCommittedBytes: 'SinkCommittedBytes',
  TableSinkCommittedBytesPerSeconds: 'SinkCommittedBytesPerSeconds',
}

const GROUP_ORDER: MetricGroup[] = ['source', 'transform', 'sink', 'other']

function normalizeMetricsInput(metrics?: Record<string, unknown> | string): Record<string, unknown> {
  if (!metrics) return {}
  if (typeof metrics === 'string') {
    try {
      return JSON.parse(metrics) as Record<string, unknown>
    } catch {
      return { raw: metrics }
    }
  }
  return metrics
}

function simplifyScope(scope: string): string | undefined {
  const optional = scope.match(/^Optional\[(.+)\]$/)
  if (optional) return optional[1]

  const plugin = scope.match(/^(?:Source|Sink|Transform)\[\d+\]\.(.+)$/)
  if (plugin) {
    const full = plugin[1]
    const parts = full.split('.')
    return parts[parts.length - 1] || full
  }

  if (scope === 'default.default.default') return undefined
  return scope
}

function pickNestedValue(nested: Record<string, unknown>): { value: string; detail?: string } {
  const entries = Object.entries(nested).map(([scope, raw]) => ({
    scope,
    value: String(raw),
    numeric: Number(raw),
  }))

  const ranked = [...entries].sort((a, b) => {
    const score = (scope: string, numeric: number) => {
      let points = 0
      if (!Number.isNaN(numeric) && numeric > 0) points += 4
      if (scope.startsWith('Optional[')) points += 3
      if (/^(Source|Sink|Transform)\[\d+\]\./.test(scope)) points += 2
      if (scope === 'default.default.default') points -= 2
      return points
    }
    return score(b.scope, b.numeric) - score(a.scope, a.numeric)
  })

  const best = ranked[0]
  if (!best) return { value: '—' }
  return {
    value: best.value,
    detail: simplifyScope(best.scope),
  }
}

function formatMetricValue(value: unknown): { value: string; detail?: string } {
  if (typeof value === 'string' || typeof value === 'number') {
    return { value: String(value) }
  }
  if (value && typeof value === 'object') {
    return pickNestedValue(value as Record<string, unknown>)
  }
  return { value: '—' }
}

function metricMeta(key: string): { group: MetricGroup } {
  return METRIC_META[key] || { group: 'other' }
}

export function formatMetricEntries(
  metrics?: Record<string, unknown> | string,
  t?: Translate,
  locale = 'en',
): MetricEntry[] {
  const source = normalizeMetricsInput(metrics)
  const entries: MetricEntry[] = []

  for (const [key, rawValue] of Object.entries(source)) {
    const scalarKey = METRIC_SCALAR_PREFERENCE[key]
    if (scalarKey && source[scalarKey] != null && typeof source[scalarKey] !== 'object') {
      continue
    }

    const meta = metricMeta(key)
    const formatted = formatMetricValue(rawValue)
    const label = t ? t(`metrics.${key}`) : key
    entries.push({
      groupKey: meta.group,
      group: t ? t(`metrics.groups.${meta.group}`) : meta.group,
      label: label.startsWith('metrics.') ? key.replace(/([A-Z])/g, ' $1').trim() : label,
      detail: formatted.detail,
      value: formatMetricNumber(formatted.value, locale),
    })
  }

  return entries.sort((a, b) => {
    const groupDiff = GROUP_ORDER.indexOf(a.groupKey) - GROUP_ORDER.indexOf(b.groupKey)
    if (groupDiff !== 0) return groupDiff
    return a.label.localeCompare(b.label, locale === 'zh' ? 'zh-CN' : 'en')
  })
}

export function formatMetricNumber(value: string, locale = 'en'): string {
  const num = Number(value)
  const tag = locale === 'zh' ? 'zh-CN' : 'en-US'
  if (Number.isNaN(num)) return value
  if (Number.isInteger(num)) return num.toLocaleString(tag)
  if (Math.abs(num) >= 1000) return num.toLocaleString(tag, { maximumFractionDigits: 2 })
  return num.toLocaleString(tag, { maximumFractionDigits: 4 })
}

/** 作业列表「读取/写入」摘要 */
export function getMetricReadWrite(metrics?: Record<string, unknown> | string): { read: string; write: string } {
  const source = normalizeMetricsInput(metrics)

  const read = pickMetricByKeys(source, ['SourceReceivedCount', 'TableSourceReceivedCount'])
  const write = pickMetricByKeys(source, ['SinkWriteCount', 'SinkCommittedCount', 'TableSinkWriteCount'])

  return { read, write }
}

function pickMetricByKeys(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key]
    if (value == null) continue
    const formatted = formatMetricValue(value)
    if (formatted.value !== '—' && formatted.value !== '0' && formatted.value !== '0.0') {
      return formatMetricNumber(formatted.value)
    }
  }
  for (const key of keys) {
    const value = source[key]
    if (value == null) continue
    return formatMetricNumber(formatMetricValue(value).value)
  }
  return '—'
}

/** @deprecated 保留兼容；优先使用 formatMetricEntries */
export function parseMetrics(metrics?: Record<string, unknown> | string): Record<string, string> {
  const entries = formatMetricEntries(metrics)
  const result: Record<string, string> = {}
  for (const entry of entries) {
    const key = entry.detail ? `${entry.label} · ${entry.detail}` : entry.label
    result[key] = entry.value
  }
  return result
}

export interface SystemMetricEntry {
  group: string
  groupKey: SysGroup
  label: string
  value: string
  rawKey: string
}

type SysGroup = 'cpu' | 'heap' | 'gc' | 'thread' | 'cluster' | 'executor' | 'ops' | 'other'

const SYSTEM_METRIC_META: Record<string, SysGroup> = {
  processors: 'cpu',
  'physical.memory.total': 'cpu',
  'physical.memory.free': 'cpu',
  'swap.space.total': 'cpu',
  'swap.space.free': 'cpu',
  'load.process': 'cpu',
  'load.system': 'cpu',
  'load.systemAverage': 'cpu',
  'heap.memory.used': 'heap',
  'heap.memory.free': 'heap',
  'heap.memory.total': 'heap',
  'heap.memory.max': 'heap',
  'heap.memory.used/total': 'heap',
  'heap.memory.used/max': 'heap',
  'minor.gc.count': 'gc',
  'minor.gc.time': 'gc',
  'major.gc.count': 'gc',
  'major.gc.time': 'gc',
  'unknown.gc.count': 'gc',
  'unknown.gc.time': 'gc',
  'thread.count': 'thread',
  'thread.peakCount': 'thread',
  'cluster.timeDiff': 'cluster',
  'connection.count': 'cluster',
  'connection.active.count': 'cluster',
  'client.connection.count': 'cluster',
  'clientEndpoint.count': 'cluster',
  'event.q.size': 'cluster',
  'proxy.count': 'cluster',
  'operations.completed.count': 'ops',
  'operations.running.count': 'ops',
  'operations.pending.invocations.count': 'ops',
  'operations.pending.invocations.percentage': 'ops',
}

const SYSTEM_GROUP_ORDER: SysGroup[] = ['cpu', 'heap', 'gc', 'thread', 'cluster', 'executor', 'ops', 'other']
const SYSTEM_HIDDEN_KEYS = new Set(['isMaster', 'host', 'port'])

function systemMetricMeta(key: string): { group: SysGroup; executorKey?: string } {
  if (SYSTEM_METRIC_META[key]) return { group: SYSTEM_METRIC_META[key] }
  const executorMatch = key.match(/^executor\.q\.(.+)\.size$/)
  if (executorMatch) return { group: 'executor', executorKey: executorMatch[1] }
  return { group: 'other' }
}

export function formatSystemMetricEntries(
  node: Record<string, string | undefined>,
  t?: Translate,
  locale = 'en',
): SystemMetricEntry[] {
  const entries: SystemMetricEntry[] = []

  for (const [key, rawValue] of Object.entries(node)) {
    if (SYSTEM_HIDDEN_KEYS.has(key) || rawValue == null || rawValue === '') continue
    const meta = systemMetricMeta(key)
    let label: string
    if (meta.executorKey) {
      const queueName = t ? t(`sysMetrics.exec.${meta.executorKey}`) : meta.executorKey
      const resolved = queueName.startsWith('sysMetrics.') ? meta.executorKey : queueName
      label = t ? t('sysMetrics.queue', { name: resolved }) : `Queue · ${resolved}`
    } else {
      const translated = t ? t(`sysMetrics.${key}`) : key
      label = translated.startsWith('sysMetrics.') ? key : translated
    }
    entries.push({
      groupKey: meta.group,
      group: t ? t(`sysMetrics.groups.${meta.group}`) : meta.group,
      label,
      value: String(rawValue),
      rawKey: key,
    })
  }

  return entries.sort((a, b) => {
    const groupDiff = SYSTEM_GROUP_ORDER.indexOf(a.groupKey) - SYSTEM_GROUP_ORDER.indexOf(b.groupKey)
    if (groupDiff !== 0) return groupDiff
    return a.label.localeCompare(b.label, locale === 'zh' ? 'zh-CN' : 'en')
  })
}

export function formatSystemNodeRole(isMaster?: string, t?: Translate): string {
  if (t) return isMaster === 'true' ? t('system.master') : t('system.worker')
  return isMaster === 'true' ? 'Master' : 'Worker'
}
