import { useMemo, useState } from 'react'
import {
  ArrowRight,
  ClockCountdown,
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
import { useI18n } from '../i18n'

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
  const { t } = useI18n()
  const [tagKey, setTagKey] = useState('')
  const [tagValue, setTagValue] = useState('')
  const [appliedTagKey, setAppliedTagKey] = useState('')
  const [appliedTagValue, setAppliedTagValue] = useState('')
  const [showTagFilter, setShowTagFilter] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const tags = useMemo(
    () => (appliedTagKey.trim() ? { [appliedTagKey.trim()]: appliedTagValue.trim() } : undefined),
    [appliedTagKey, appliedTagValue],
  )
  const overview = usePolling(() => seatunnelApi.getOverview(tags), [appliedTagKey, appliedTagValue], 10000, autoRefresh)
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
  const runningJobs = running.data?.data || []
  const runningCount = running.data?.total ?? runningJobs.length

  return <div className="workspace-page">
    <header className="workspace-header">
      <div><div className="eyebrow"><span className="eyebrow-pulse" /> {t('dashboard.eyebrow')}</div><h1 className="workspace-title">{t('dashboard.title')}</h1><p>{t('dashboard.desc')}</p></div>
      <div className="workspace-actions">
        <label className="refresh-toggle"><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} /><span /> {t('app.autoRefreshShort')}</label>
        <button className="btn ghost compact" type="button" onClick={() => setShowTagFilter((value) => !value)}>{t('dashboard.filter')}</button>
        <button className="icon-button" type="button" onClick={reloadAll} aria-label={t('dashboard.refreshAria')}><RocketLaunch size={18} /></button>
      </div>
    </header>

    {showTagFilter && <section className="filter-drawer"><div><span className="filter-title">{t('dashboard.filterTitle')}</span><span className="filter-help">{t('dashboard.filterHelp')}</span></div><label><span>{t('dashboard.tagKey')}</span><input placeholder="zone" value={tagKey} onChange={(event) => setTagKey(event.target.value)} /></label><label><span>{t('dashboard.tagValue')}</span><input placeholder="az1" value={tagValue} onChange={(event) => setTagValue(event.target.value)} /></label><button className="btn primary compact" type="button" onClick={() => {
      if (tagKey === appliedTagKey && tagValue === appliedTagValue) overview.reload()
      else {
        setAppliedTagKey(tagKey)
        setAppliedTagValue(tagValue)
      }
    }}>{t('dashboard.applyFilter')}</button></section>}

    <AsyncState loading={overview.loading && !overview.data} error={overview.error} data={overview.data} refreshing={overview.refreshing} emptyText={t('dashboard.emptyOverview')}>
      {(cluster) => <>
        <section className="signal-strip" aria-label={t('dashboard.clusterAria')}>
          <div className="signal-health"><span className={`health-orb${health?.reachable ? ' healthy' : ''}`} /><div><span>{t('dashboard.connection')}</span><strong>{health?.reachable ? t('dashboard.healthy') : t('dashboard.needsAttention')}</strong></div></div>
          <div className="signal-metric"><span>{t('dashboard.runningJobs')}</span><strong>{cluster.runningJobs}</strong><small>{t('dashboard.runningHint')}</small></div>
          <div className={`signal-metric ${pendingCount ? 'attention' : ''}`}><span>{t('dashboard.queuePressure')}</span><strong>{pendingCount}</strong><small>{pendingCount ? t('dashboard.waitingSlots') : t('dashboard.queueClear')}</small></div>
          <div className={`signal-metric ${failedCount ? 'danger' : ''}`}><span>{t('dashboard.failedJobs')}</span><strong>{failedCount}</strong><small>{t('dashboard.failedHint')}</small></div>
          <div className="signal-metric"><span>{t('dashboard.engine')}</span><strong className="version-value">{cluster.projectVersion}</strong><small>Git {cluster.gitCommitAbbrev}</small></div>
        </section>

        <section className="workflow-board">
          <div className="workflow-board-header"><div><div className="section-kicker">{t('dashboard.pathKicker')}</div><h2>{t('dashboard.workflow')}</h2><p>{t('dashboard.workflowHint')}</p></div><div className="workflow-legend"><span><i className="legend-dot scheduled" />{t('dashboard.scheduled')}</span><span><i className="legend-dot running" />{t('dashboard.running')}</span><span><i className="legend-dot pending" />{t('dashboard.pending')}</span></div></div>
          <div className="workflow-lanes">
            <FlowLane icon={<ClockCountdown size={20} />} title={t('dashboard.laneSchedule')} count={schedules.length} status={t('dashboard.laneScheduleStatus')}>
              {schedules.length ? schedules.map((task) => <FlowNode key={task.id} tone="scheduled" title={task.name} subtitle={task.schedule?.description || t('dashboard.onSchedule')} to={`/tasks/${task.id}`} />) : <Link className="flow-empty" to="/tasks/new"><span className="plus-mark">+</span> {t('dashboard.noSchedules')}</Link>}
            </FlowLane>
            <FlowLane icon={<PlayCircle size={20} />} title={t('dashboard.laneRunning')} count={runningCount} status={t('dashboard.laneRunningStatus')}>
              {runningJobs.length ? runningJobs.map((job) => <FlowNode key={job.jobId} tone="running" title={job.jobName || t('app.jobFallback', { id: job.jobId })} subtitle={t('dashboard.runningSince', { time: formatTimestamp(job.createTime) })} to={`/jobs/${job.jobId}`} live />) : <div className="flow-empty quiet">{t('dashboard.noRunning')}</div>}
            </FlowLane>
            <FlowLane icon={<Queue size={20} />} title={t('dashboard.lanePending')} count={pending.data?.pendingJobs.length || 0} status={t('dashboard.lanePendingStatus')}>
              {pending.data?.pendingJobs.length ? pending.data.pendingJobs.map((job) => <FlowNode key={job.jobId} tone="pending" title={job.jobName || t('app.jobFallback', { id: job.jobId })} subtitle={`${Math.round(job.waitDurationMs / 1000)}s · ${job.failureReason || t('dashboard.waitingSchedule')}`} to={`/jobs/${job.jobId}`} />) : <div className="flow-empty quiet">{t('dashboard.noPending')}</div>}
            </FlowLane>
          </div>
        </section>

        <div className="operations-grid">
          <section className="data-surface capacity-surface"><div className="surface-header"><div><div className="section-kicker">{t('dashboard.capacityKicker')}</div><h2>{t('dashboard.capacity')}</h2></div><Link to="/system">{t('dashboard.resourceMonitor')} <ArrowRight size={15} /></Link></div><div className="capacity-summary"><div className="capacity-ring"><span>{totalSlot > 0 ? Math.round((usedSlot / totalSlot) * 100) : 0}%</span><small>{t('dashboard.slotUse')}</small></div><div className="capacity-list"><div><span><Gauge size={16} /> Worker</span><strong>{cluster.workers}</strong><small>{t('dashboard.onlineNodes')}</small></div><div><span>{t('dashboard.assignedSlots')}</span><strong>{totalSlot > 0 ? `${usedSlot} / ${totalSlot}` : 'dynamic'}</strong><small>{totalSlot > 0 ? t('dashboard.slotsFree', { count: freeSlot }) : t('dashboard.dynamicSlots')}</small></div><div><span>{t('dashboard.finishedJobs')}</span><strong>{completedCount}</strong><small>{t('dashboard.cumulative')}</small></div></div></div><div className="worker-mini-list">{workerList.slice(0, 4).map((worker) => <div key={worker.address}><span className="worker-state" /><code>{worker.address}</code><span>{worker.dynamicSlot ? 'dynamic-slot' : `${worker.freeSlots}/${worker.totalSlots} free`}</span><Progress value={usagePercent(worker.cpuUsage)} /></div>)}{!workerList.length && <div className="data-empty">{t('dashboard.noWorkers')}</div>}</div></section>
          <section className="data-surface job-surface"><div className="surface-header"><div><div className="section-kicker">{t('dashboard.eventsKicker')}</div><h2>{t('dashboard.jobStatus')}</h2></div><Link to="/jobs">{t('dashboard.allJobs')} <ArrowRight size={15} /></Link></div><div className="job-ledger"><div className="job-ledger-head"><span>{t('dashboard.colJob')}</span><span>{t('app.status')}</span><span>{t('dashboard.colSubmitted')}</span><span /></div>{runningJobs.slice(0, 4).map((job) => <JobLedgerRow key={job.jobId} job={job} />)}{!runningJobs.length && <div className="job-ledger-empty"><PlayCircle size={22} /><div><strong>{t('dashboard.quietTitle')}</strong><span>{t('dashboard.quietHint')}</span></div><Link to="/submit">{t('nav.submit')} <ArrowRight size={15} /></Link></div>}</div>{pendingCount > 0 && <Link className="attention-callout" to="/pending"><WarningCircle size={18} /><span><strong>{t('dashboard.pendingAlert', { count: pendingCount })}</strong><small>{t('dashboard.pendingAlertHint')}</small></span><ArrowRight size={16} /></Link>}</section>
        </div>

        <section className="data-surface node-surface"><div className="surface-header"><div><div className="section-kicker">{t('dashboard.nodesKicker')}</div><h2>{t('dashboard.nodeHealth')}</h2></div><span className="surface-meta">{t('dashboard.nodeMeta', { count: nodes.data?.length || 0 })}</span></div><AsyncState loading={nodes.loading && !nodes.data} error={nodes.error} data={nodes.data} refreshing={nodes.refreshing} emptyText={t('dashboard.noNodes')}>{(list) => <div className="node-ledger">{list.map((node, index) => <div className="node-row" key={`${node.host}-${node.port}-${index}`}><span className="node-role"><i />{formatSystemNodeRole(node.isMaster, t)}</span><code>{node.host}:{node.port}</code><div><span className="node-label">{t('dashboard.heap')}</span><Progress value={parsePercent(node['heap.memory.used/max'])} /></div><div><span className="node-label">{t('dashboard.sysLoad')}</span><Progress value={parsePercent(node['load.system'])} /></div><span className="node-threads">{node['thread.count'] || '—'} <small>{t('dashboard.threads')}</small></span><button className="row-menu" type="button" aria-label={t('dashboard.nodeActions')}><DotsThree size={20} weight="bold" /></button></div>)}</div>}</AsyncState></section>
      </>}
    </AsyncState>
  </div>
}

function JobLedgerRow({ job }: { job: JobSummary }) {
  const { t } = useI18n()
  return <Link className="job-ledger-row" to={`/jobs/${job.jobId}`}><span><strong>{job.jobName || t('app.jobFallback', { id: job.jobId })}</strong><code>{job.jobId}</code></span><StatusBadge status={job.jobStatus} /><span className="job-ledger-time">{formatTimestamp(job.createTime)}</span><ArrowRight size={16} /></Link>
}
