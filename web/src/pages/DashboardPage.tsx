import { useMemo, useState } from 'react'
import {
  ArrowRight,
  ClockCountdown,
  CloudArrowUp,
  DotsThree,
  Gauge,
  PlayCircle,
  Queue,
  RocketLaunch,
  WarningCircle,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { seatunnelApi } from '../api/client'
import { tasksApi } from '../api/tasksClient'
import { AsyncState } from '../components/AsyncState'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../auth/AuthContext'
import { usePolling } from '../hooks/usePolling'
import type { JobSummary, WorkerResource } from '../types/api'
import type { Task } from '../types/tasks'
import { formatSystemNodeRole, formatTimestamp } from '../utils/format'

function toNum(value: string | number | null | undefined): number {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

function usagePercent(value?: number): number | null {
  if (value == null || Number.isNaN(value)) return null
  return Math.max(0, Math.min(100, value <= 1 ? value * 100 : value))
}

function parsePercent(value?: string): number | null {
  const match = String(value || '').match(/([\d.]+)\s*%/)
  return match ? Math.max(0, Math.min(100, Number(match[1]))) : null
}

function Progress({ value }: { value: number | null }) {
  if (value == null) return <span className="data-muted">—</span>
  return <div className="meter" title={`${value.toFixed(0)}%`}><div className="meter-track"><i style={{ width: `${value}%` }} /></div><span>{value.toFixed(0)}%</span></div>
}

function FlowNode({ title, subtitle, tone, to, live = false }: {
  title: string
  subtitle: string
  tone: 'scheduled' | 'running' | 'pending'
  to?: string
  live?: boolean
}) {
  const body = <><div className="flow-node-title">{title}</div><div className="flow-node-subtitle">{subtitle}</div>{live && <span className="flow-live-dot" />}</>
  return to ? <Link className={`flow-node ${tone}`} to={to}>{body}</Link> : <div className={`flow-node ${tone}`}>{body}</div>
}

function FlowLane({ icon, title, count, status, children }: {
  icon: React.ReactNode
  title: string
  count: number
  status: string
  children: React.ReactNode
}) {
  return <div className="flow-lane"><div className="flow-lane-label"><span className="flow-lane-icon">{icon}</span><div><strong>{title}</strong><span>{count} {status}</span></div></div><div className="flow-lane-track">{children}</div></div>
}

function getScheduledTasks(tasks: Task[] | null) {
  return (tasks || []).filter((task) => task.isEnabled && task.schedule?.enabled).slice(0, 4)
}

export function DashboardPage() {
  const { health } = useAuth()
  const [tagKey, setTagKey] = useState('')
  const [tagValue, setTagValue] = useState('')
  const [showTagFilter, setShowTagFilter] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const tags = useMemo(() => (tagKey.trim() ? { [tagKey.trim()]: tagValue.trim() } : undefined), [tagKey, tagValue])
  const overview = usePolling(() => seatunnelApi.getOverview(tags), [tagKey, tagValue], 10000, autoRefresh)
  const nodes = usePolling(() => seatunnelApi.getSystemMonitoring(), [], 15000, autoRefresh)
  const pending = usePolling(() => seatunnelApi.getPendingJobs({ limit: 5 }), [], 10000, autoRefresh)
  const running = usePolling(() => seatunnelApi.getRunningJobs(1, 5), [], 10000, autoRefresh)
  const workersRes = usePolling(() => seatunnelApi.getResourceWorkers(), [], 15000, autoRefresh)
  const tasks = usePolling(() => tasksApi.list(false), [], 30000, autoRefresh)
  const reloadAll = () => [overview, nodes, pending, running, workersRes, tasks].forEach((source) => source.reload())
  const workerList = workersRes.data?.available && workersRes.data.workers.length
    ? workersRes.data.workers
    : (pending.data?.clusterSnapshot.workers as WorkerResource[] | undefined) || []
  const schedules = getScheduledTasks(tasks.data)
  const totalSlot = toNum(overview.data?.totalSlot)
  const freeSlot = toNum(overview.data?.unassignedSlot)
  const usedSlot = Math.max(0, totalSlot - freeSlot)
  const pendingCount = toNum(overview.data?.pendingJobs) || pending.data?.queueSummary.size || 0
  const completedCount = toNum(overview.data?.finishedJobs)
  const failedCount = toNum(overview.data?.failedJobs)

  return <div className="workspace-page">
    <header className="workspace-header">
      <div><div className="eyebrow"><span className="eyebrow-pulse" /> 实时运行面</div><h1 className="workspace-title">工作台</h1><p>从任务排程到集群容量，快速判断下一步该做什么。</p></div>
      <div className="workspace-actions">
        <label className="refresh-toggle"><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} /><span /> 自动刷新 · 10s</label>
        <button className="btn ghost compact" type="button" onClick={() => setShowTagFilter((value) => !value)}>集群筛选</button>
        <button className="icon-button" type="button" onClick={reloadAll} aria-label="刷新工作台"><RocketLaunch size={18} /></button>
      </div>
    </header>

    {showTagFilter && <section className="filter-drawer"><div><span className="filter-title">按 Worker Tag 查看</span><span className="filter-help">只影响概览中的节点与 Slot 汇总</span></div><label><span>Tag Key</span><input placeholder="zone" value={tagKey} onChange={(event) => setTagKey(event.target.value)} /></label><label><span>Tag Value</span><input placeholder="az1" value={tagValue} onChange={(event) => setTagValue(event.target.value)} /></label><button className="btn primary compact" type="button" onClick={() => overview.reload()}>应用筛选</button></section>}

    <AsyncState loading={overview.loading && !overview.data} error={overview.error} data={overview.data} emptyText="无法读取集群概览">
      {(cluster) => <>
        <section className="signal-strip" aria-label="集群即时状态">
          <div className="signal-health"><span className={`health-orb${health?.reachable ? ' healthy' : ''}`} /><div><span>集群连接</span><strong>{health?.reachable ? '运行正常' : '需要关注'}</strong></div></div>
          <div className="signal-metric"><span>运行中作业</span><strong>{cluster.runningJobs}</strong><small>实时作业视图</small></div>
          <div className={`signal-metric ${pendingCount ? 'attention' : ''}`}><span>队列压力</span><strong>{pendingCount}</strong><small>{pendingCount ? '等待资源分配' : '当前队列畅通'}</small></div>
          <div className={`signal-metric ${failedCount ? 'danger' : ''}`}><span>失败作业</span><strong>{failedCount}</strong><small>历史累计</small></div>
          <div className="signal-metric"><span>引擎版本</span><strong className="version-value">{cluster.projectVersion}</strong><small>Git {cluster.gitCommitAbbrev}</small></div>
          <Link to="/submit" className="btn primary signal-cta"><CloudArrowUp size={18} weight="bold" /> 提交作业</Link>
        </section>

        <section className="workflow-board">
          <div className="workflow-board-header"><div><div className="section-kicker">任务路径</div><h2>工作流视图</h2><p>按运行状态组织任务与作业，所有节点均可继续下钻。</p></div><div className="workflow-legend"><span><i className="legend-dot scheduled" />已排程</span><span><i className="legend-dot running" />运行中</span><span><i className="legend-dot pending" />等待中</span></div></div>
          <div className="workflow-lanes">
            <FlowLane icon={<ClockCountdown size={20} />} title="定时计划" count={schedules.length} status="项已启用">
              {schedules.length ? schedules.map((task) => <FlowNode key={task.id} tone="scheduled" title={task.name} subtitle={task.schedule?.description || '按计划触发'} to={`/tasks/${task.id}`} />) : <Link className="flow-empty" to="/tasks/new"><span className="plus-mark">+</span> 还没有启用的定时任务</Link>}
            </FlowLane>
            <FlowLane icon={<PlayCircle size={20} />} title="运行中" count={running.data?.length || 0} status="个作业">
              {running.data?.length ? running.data.map((job) => <FlowNode key={job.jobId} tone="running" title={job.jobName || `作业 ${job.jobId}`} subtitle={`已运行 · ${formatTimestamp(job.createTime)}`} to={`/jobs/${job.jobId}`} live />) : <div className="flow-empty quiet">当前没有运行中的作业</div>}
            </FlowLane>
            <FlowLane icon={<Queue size={20} />} title="等待队列" count={pending.data?.pendingJobs.length || 0} status="个待处理">
              {pending.data?.pendingJobs.length ? pending.data.pendingJobs.map((job) => <FlowNode key={job.jobId} tone="pending" title={job.jobName || `作业 ${job.jobId}`} subtitle={`${Math.round(job.waitDurationMs / 1000)}s · ${job.failureReason || '等待调度'}`} to={`/jobs/${job.jobId}`} />) : <div className="flow-empty quiet">队列畅通，暂无 Pending 作业</div>}
            </FlowLane>
          </div>
        </section>

        <div className="operations-grid">
          <section className="data-surface capacity-surface"><div className="surface-header"><div><div className="section-kicker">集群余量</div><h2>资源容量</h2></div><Link to="/system">资源监控 <ArrowRight size={15} /></Link></div><div className="capacity-summary"><div className="capacity-ring"><span>{totalSlot > 0 ? Math.round((usedSlot / totalSlot) * 100) : 0}%</span><small>Slot 使用</small></div><div className="capacity-list"><div><span><Gauge size={16} /> Worker</span><strong>{cluster.workers}</strong><small>在线节点</small></div><div><span>已分配 Slot</span><strong>{totalSlot > 0 ? `${usedSlot} / ${totalSlot}` : 'dynamic'}</strong><small>{totalSlot > 0 ? `${freeSlot} 个可用` : '动态分配模式'}</small></div><div><span>完成作业</span><strong>{completedCount}</strong><small>累计记录</small></div></div></div><div className="worker-mini-list">{workerList.slice(0, 4).map((worker) => <div key={worker.address}><span className="worker-state" /><code>{worker.address}</code><span>{worker.dynamicSlot ? 'dynamic-slot' : `${worker.freeSlots}/${worker.totalSlots} free`}</span><Progress value={usagePercent(worker.cpuUsage)} /></div>)}{!workerList.length && <div className="data-empty">暂未获取到 Worker 资源快照</div>}</div></section>
          <section className="data-surface job-surface"><div className="surface-header"><div><div className="section-kicker">实时事件</div><h2>作业状态</h2></div><Link to="/jobs">全部作业 <ArrowRight size={15} /></Link></div><div className="job-ledger"><div className="job-ledger-head"><span>作业</span><span>状态</span><span>提交时间</span><span /></div>{(running.data || []).slice(0, 4).map((job) => <JobLedgerRow key={job.jobId} job={job} />)}{!running.data?.length && <div className="job-ledger-empty"><PlayCircle size={22} /><div><strong>运行面很安静</strong><span>新提交的作业会在这里显示实时状态与跳转入口。</span></div><Link to="/submit">提交作业 <ArrowRight size={15} /></Link></div>}</div>{pendingCount > 0 && <Link className="attention-callout" to="/pending"><WarningCircle size={18} /><span><strong>发现 {pendingCount} 个作业等待资源</strong><small>查看 TaskGroup 分配与阻塞作业诊断</small></span><ArrowRight size={16} /></Link>}</section>
        </div>

        <section className="data-surface node-surface"><div className="surface-header"><div><div className="section-kicker">运行节点</div><h2>节点健康快照</h2></div><span className="surface-meta">{nodes.data?.length || 0} 台节点 · 每 15 秒更新</span></div><AsyncState loading={nodes.loading && !nodes.data} error={nodes.error} data={nodes.data} emptyText="暂无节点监控数据">{(list) => <div className="node-ledger">{list.map((node, index) => <div className="node-row" key={`${node.host}-${node.port}-${index}`}><span className="node-role"><i />{formatSystemNodeRole(node.isMaster)}</span><code>{node.host}:{node.port}</code><div><span className="node-label">堆内存</span><Progress value={parsePercent(node['heap.memory.used/max'])} /></div><div><span className="node-label">系统负载</span><Progress value={parsePercent(node['load.system'])} /></div><span className="node-threads">{node['thread.count'] || '—'} <small>threads</small></span><button className="row-menu" type="button" aria-label="节点操作"><DotsThree size={20} weight="bold" /></button></div>)}</div>}</AsyncState></section>
      </>}
    </AsyncState>
  </div>
}

function JobLedgerRow({ job }: { job: JobSummary }) {
  return <Link className="job-ledger-row" to={`/jobs/${job.jobId}`}><span><strong>{job.jobName || `作业 ${job.jobId}`}</strong><code>{job.jobId}</code></span><StatusBadge status={job.jobStatus} /><span className="job-ledger-time">{formatTimestamp(job.createTime)}</span><ArrowRight size={16} /></Link>
}
