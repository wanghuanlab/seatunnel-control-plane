export function formatTimestamp(value?: string | number | null): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'number') {
    return new Date(value).toLocaleString('zh-CN')
  }
  const numeric = Number(value)
  if (!Number.isNaN(numeric) && String(numeric).length >= 12) {
    return new Date(numeric).toLocaleString('zh-CN')
  }
  return value
}

export function formatDuration(ms?: number): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.floor(ms / 60_000)} m ${Math.round((ms % 60_000) / 1000)} s`
}

export function jobStatusTone(status?: string): 'running' | 'success' | 'warning' | 'danger' | 'muted' {
  const normalized = (status || '').toUpperCase()
  if (['RUNNING', 'PENDING', 'RESTORE'].includes(normalized)) return 'running'
  if (['FINISHED', 'SAVEPOINT_DONE'].includes(normalized)) return 'success'
  if (['CANCELLED', 'CANCELED'].includes(normalized)) return 'warning'
  if (['FAILED', 'UNKNOWABLE'].includes(normalized)) return 'danger'
  return 'muted'
}

export interface MetricEntry {
  group: string
  label: string
  detail?: string
  value: string
}

const METRIC_META: Record<string, { label: string; group: string }> = {
  SourceReceivedCount: { label: '接收条数', group: '数据源' },
  TableSourceReceivedCount: { label: '接收条数', group: '数据源' },
  SourceReceivedQPS: { label: '接收速率 (条/秒)', group: '数据源' },
  TableSourceReceivedQPS: { label: '接收速率 (条/秒)', group: '数据源' },
  SourceReceivedBytes: { label: '接收字节数', group: '数据源' },
  TableSourceReceivedBytes: { label: '接收字节数', group: '数据源' },
  SourceReceivedBytesPerSeconds: { label: '接收吞吐 (字节/秒)', group: '数据源' },
  TableSourceReceivedBytesPerSeconds: { label: '接收吞吐 (字节/秒)', group: '数据源' },
  IntermediateQueueSize: { label: '中间队列积压', group: '数据转换' },
  SinkWriteCount: { label: '写入条数', group: '数据写入' },
  TableSinkWriteCount: { label: '写入条数', group: '数据写入' },
  SinkWriteQPS: { label: '写入速率 (条/秒)', group: '数据写入' },
  TableSinkWriteQPS: { label: '写入速率 (条/秒)', group: '数据写入' },
  SinkWriteBytes: { label: '写入字节数', group: '数据写入' },
  TableSinkWriteBytes: { label: '写入字节数', group: '数据写入' },
  SinkWriteBytesPerSeconds: { label: '写入吞吐 (字节/秒)', group: '数据写入' },
  TableSinkWriteBytesPerSeconds: { label: '写入吞吐 (字节/秒)', group: '数据写入' },
  SinkCommittedCount: { label: '提交条数', group: '数据写入' },
  TableSinkCommittedCount: { label: '提交条数', group: '数据写入' },
  SinkCommittedQPS: { label: '提交速率 (条/秒)', group: '数据写入' },
  TableSinkCommittedQPS: { label: '提交速率 (条/秒)', group: '数据写入' },
  SinkCommittedBytes: { label: '提交字节数', group: '数据写入' },
  TableSinkCommittedBytes: { label: '提交字节数', group: '数据写入' },
  SinkCommittedBytesPerSeconds: { label: '提交吞吐 (字节/秒)', group: '数据写入' },
  TableSinkCommittedBytesPerSeconds: { label: '提交吞吐 (字节/秒)', group: '数据写入' },
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

const GROUP_ORDER = ['数据源', '数据转换', '数据写入', '其他']

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

function metricMeta(key: string): { label: string; group: string } {
  if (METRIC_META[key]) return METRIC_META[key]
  return {
    label: key.replace(/([A-Z])/g, ' $1').trim(),
    group: '其他',
  }
}

export function formatMetricEntries(metrics?: Record<string, unknown> | string): MetricEntry[] {
  const source = normalizeMetricsInput(metrics)
  const entries: MetricEntry[] = []

  for (const [key, rawValue] of Object.entries(source)) {
    const scalarKey = METRIC_SCALAR_PREFERENCE[key]
    if (scalarKey && source[scalarKey] != null && typeof source[scalarKey] !== 'object') {
      continue
    }

    const meta = metricMeta(key)
    const formatted = formatMetricValue(rawValue)
    entries.push({
      group: meta.group,
      label: meta.label,
      detail: formatted.detail,
      value: formatMetricNumber(formatted.value),
    })
  }

  return entries.sort((a, b) => {
    const groupDiff = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
    if (groupDiff !== 0) return groupDiff
    return a.label.localeCompare(b.label, 'zh-CN')
  })
}

export function formatMetricNumber(value: string): string {
  const num = Number(value)
  if (Number.isNaN(num)) return value
  if (Number.isInteger(num)) return num.toLocaleString('zh-CN')
  if (Math.abs(num) >= 1000) return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 4 })
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
  label: string
  value: string
  rawKey: string
}

const SYSTEM_METRIC_META: Record<string, { label: string; group: string }> = {
  processors: { label: 'CPU 核心数', group: 'CPU 与内存' },
  'physical.memory.total': { label: '物理内存总量', group: 'CPU 与内存' },
  'physical.memory.free': { label: '物理内存可用', group: 'CPU 与内存' },
  'swap.space.total': { label: 'Swap 总量', group: 'CPU 与内存' },
  'swap.space.free': { label: 'Swap 可用', group: 'CPU 与内存' },
  'load.process': { label: '进程 CPU 负载', group: 'CPU 与内存' },
  'load.system': { label: '系统 CPU 负载', group: 'CPU 与内存' },
  'load.systemAverage': { label: '系统平均负载', group: 'CPU 与内存' },
  'heap.memory.used': { label: '堆内存已用', group: '堆内存' },
  'heap.memory.free': { label: '堆内存可用', group: '堆内存' },
  'heap.memory.total': { label: '堆内存总量', group: '堆内存' },
  'heap.memory.max': { label: '堆内存上限', group: '堆内存' },
  'heap.memory.used/total': { label: '堆内存使用率 (占已分配)', group: '堆内存' },
  'heap.memory.used/max': { label: '堆内存使用率 (占上限)', group: '堆内存' },
  'minor.gc.count': { label: 'Minor GC 次数', group: '垃圾回收' },
  'minor.gc.time': { label: 'Minor GC 耗时', group: '垃圾回收' },
  'major.gc.count': { label: 'Major GC 次数', group: '垃圾回收' },
  'major.gc.time': { label: 'Major GC 耗时', group: '垃圾回收' },
  'unknown.gc.count': { label: '其他 GC 次数', group: '垃圾回收' },
  'unknown.gc.time': { label: '其他 GC 耗时', group: '垃圾回收' },
  'thread.count': { label: '当前线程数', group: '线程' },
  'thread.peakCount': { label: '峰值线程数', group: '线程' },
  'cluster.timeDiff': { label: '集群时钟偏差', group: '集群与连接' },
  'connection.count': { label: '连接总数', group: '集群与连接' },
  'connection.active.count': { label: '活跃连接数', group: '集群与连接' },
  'client.connection.count': { label: '客户端连接数', group: '集群与连接' },
  'clientEndpoint.count': { label: '客户端端点数', group: '集群与连接' },
  'event.q.size': { label: '事件队列长度', group: '集群与连接' },
  'proxy.count': { label: '代理对象数', group: '集群与连接' },
  'operations.completed.count': { label: '已完成操作数', group: '操作统计' },
  'operations.running.count': { label: '运行中操作数', group: '操作统计' },
  'operations.pending.invocations.count': { label: '待处理调用数', group: '操作统计' },
  'operations.pending.invocations.percentage': { label: '待处理调用占比', group: '操作统计' },
}

const EXECUTOR_QUEUE_LABELS: Record<string, string> = {
  async: '异步',
  client: '客户端',
  'client.query': '客户端查询',
  'client.blocking': '客户端阻塞',
  query: '查询',
  scheduled: '定时任务',
  io: 'IO',
  system: '系统',
  operations: '操作',
  priorityOperation: '优先操作',
  mapLoad: 'Map 加载',
  mapLoadAllKeys: 'Map 全量加载',
  cluster: '集群',
  response: '响应',
}

const SYSTEM_GROUP_ORDER = [
  'CPU 与内存',
  '堆内存',
  '垃圾回收',
  '线程',
  '集群与连接',
  '执行器队列',
  '操作统计',
  '其他',
]

const SYSTEM_HIDDEN_KEYS = new Set(['isMaster', 'host', 'port'])

function systemMetricMeta(key: string): { label: string; group: string } {
  if (SYSTEM_METRIC_META[key]) return SYSTEM_METRIC_META[key]

  const executorMatch = key.match(/^executor\.q\.(.+)\.size$/)
  if (executorMatch) {
    const queueKey = executorMatch[1]
    const queueLabel = EXECUTOR_QUEUE_LABELS[queueKey] || queueKey
    return { label: queueLabel, group: '执行器队列' }
  }

  return { label: key, group: '其他' }
}

export function formatSystemMetricEntries(node: Record<string, string | undefined>): SystemMetricEntry[] {
  const entries: SystemMetricEntry[] = []

  for (const [key, rawValue] of Object.entries(node)) {
    if (SYSTEM_HIDDEN_KEYS.has(key) || rawValue == null || rawValue === '') continue
    const meta = systemMetricMeta(key)
    entries.push({
      group: meta.group,
      label: meta.group === '执行器队列' ? `队列 · ${meta.label}` : meta.label,
      value: String(rawValue),
      rawKey: key,
    })
  }

  return entries.sort((a, b) => {
    const groupDiff = SYSTEM_GROUP_ORDER.indexOf(a.group) - SYSTEM_GROUP_ORDER.indexOf(b.group)
    if (groupDiff !== 0) return groupDiff
    return a.label.localeCompare(b.label, 'zh-CN')
  })
}

export function formatSystemNodeRole(isMaster?: string): string {
  return isMaster === 'true' ? '主节点 (Master)' : '工作节点 (Worker)'
}
