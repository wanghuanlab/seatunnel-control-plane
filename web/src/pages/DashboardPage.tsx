import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { seatunnelApi } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../auth/AuthContext'
import { usePolling } from '../hooks/usePolling'
import { formatSystemNodeRole, formatTimestamp } from '../utils/format'
import type { WorkerResource } from '../types/api'

function toNum(value: string | number | null | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function usagePercent(value?: number): number | null {
  if (value == null || Number.isNaN(value)) return null
  const pct = value <= 1 ? value * 100 : value
  return Math.max(0, Math.min(100, pct))
}

function parsePercent(text?: string): number | null {
  if (!text) return null
  const match = String(text).match(/([\d.]+)\s*%/)
  if (!match) return null
  return Math.max(0, Math.min(100, Number(match[1])))
}

function ProgressBar({ value, label }: { value: number | null; label?: string }) {
  if (value == null) return <span className="muted">—</span>
  return (
    <div className="progress-wrap" title={label || `${value.toFixed(0)}%`}>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${value}%` }} />
      </div>
      <span className="progress-label">{value.toFixed(0)}%</span>
    </div>
  )
}

function normalizeWorkers(
  resource: { available: boolean; workers: WorkerResource[] } | null | undefined,
  snapshotWorkers: WorkerResource[] | undefined,
): WorkerResource[] {
  if (resource?.available && resource.workers?.length) return resource.workers
  return snapshotWorkers || []
}

export function DashboardPage() {
  const { health, isAdmin } = useAuth()
  const [tagKey, setTagKey] = useState('')
  const [tagValue, setTagValue] = useState('')
  const [showTagFilter, setShowTagFilter] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const tags = useMemo(() => {
    if (!tagKey.trim()) return undefined
    return { [tagKey.trim()]: tagValue.trim() }
  }, [tagKey, tagValue])

  const overview = usePolling(() => seatunnelApi.getOverview(tags), [tagKey, tagValue], 10000, autoRefresh)
  const nodes = usePolling(() => seatunnelApi.getSystemMonitoring(), [], 15000, autoRefresh)
  const pending = usePolling(() => seatunnelApi.getPendingJobs({ limit: 5 }), [], 10000, autoRefresh)
  const running = usePolling(() => seatunnelApi.getRunningJobs(1, 5), [], 10000, autoRefresh)
  const workersRes = usePolling(() => seatunnelApi.getResourceWorkers(), [], 15000, autoRefresh)

  const reloadAll = () => {
    overview.reload()
    nodes.reload()
    pending.reload()
    running.reload()
    workersRes.reload()
  }

  const workerList = normalizeWorkers(
    workersRes.data || undefined,
    pending.data?.clusterSnapshot.workers as WorkerResource[] | undefined,
  )

  const totalSlot = toNum(overview.data?.totalSlot)
  const freeSlot = toNum(overview.data?.unassignedSlot)
  const usedSlot = Math.max(0, totalSlot - freeSlot)
  const slotPct = totalSlot > 0 ? (usedSlot / totalSlot) * 100 : null
  const pendingCount = toNum(overview.data?.pendingJobs) || pending.data?.queueSummary.size || 0
  const failedCount = toNum(overview.data?.failedJobs)

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">总览</h1>
          <p className="page-desc">集群健康、节点与资源、运行中作业与 Pending 积压的一站式视图。</p>
        </div>
        <div className="actions">
          <label className="inline-check">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            自动刷新
          </label>
          <button className="btn" type="button" onClick={() => setShowTagFilter((v) => !v)}>
            {showTagFilter ? '收起 Tag 筛选' : 'Tag 筛选'}
          </button>
          <button className="btn" type="button" onClick={reloadAll}>刷新</button>
        </div>
      </header>

      {health && (!health.configured || !health.reachable) && (
        <div className="config-banner" style={{ marginBottom: 16 }}>
          <div>{health.message}</div>
          {isAdmin ? <Link className="btn" to="/settings">去系统设置</Link> : <span className="muted">请联系管理员</span>}
        </div>
      )}

      {showTagFilter && (
        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-header"><h2 className="panel-title">Tag 筛选（高级）</h2></div>
          <div className="panel-body form-grid" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
            <div className="form-row">
              <label htmlFor="tagKey">Tag Key</label>
              <input id="tagKey" placeholder="zone" value={tagKey} onChange={(e) => setTagKey(e.target.value)} />
            </div>
            <div className="form-row">
              <label htmlFor="tagValue">Tag Value</label>
              <input id="tagValue" placeholder="az1" value={tagValue} onChange={(e) => setTagValue(e.target.value)} />
            </div>
            <button className="btn primary" type="button" onClick={() => overview.reload()}>应用</button>
          </div>
          <div className="cron-help" style={{ padding: '0 18px 14px' }}>
            仅影响 `/overview` 中的 Worker / Slot 汇总；作业计数仍为全集群。
          </div>
        </section>
      )}

      <AsyncState loading={overview.loading && !overview.data} error={overview.error} data={overview.data} emptyText="无法获取集群概览">
        {(ov) => (
          <>
            <section className="health-strip">
              <div className="health-item">
                <div className="health-key">引擎版本</div>
                <div className="health-value mono">{ov.projectVersion}</div>
              </div>
              <div className="health-item">
                <div className="health-key">连接</div>
                <div className={`health-value ${health?.reachable ? 'ok' : 'warn'}`}>
                  {health?.reachable ? '正常' : health?.configured ? '异常' : '未配置'}
                </div>
              </div>
              <div className="health-item">
                <div className="health-key">Pending</div>
                <div className={`health-value ${pendingCount > 0 ? 'warn' : 'ok'}`}>{pendingCount}</div>
              </div>
              <div className="health-item">
                <div className="health-key">失败作业</div>
                <div className={`health-value ${failedCount > 0 ? 'warn' : ''}`}>{failedCount}</div>
              </div>
            </section>

            <section className="grid stats" style={{ marginTop: 16 }}>
              <div className="stat-card">
                <div className="stat-label">Worker 节点</div>
                <div className="stat-value">{ov.workers}</div>
                <div className="stat-foot">资源快照 {workerList.length} 台</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">运行中作业</div>
                <div className="stat-value">{ov.runningJobs}</div>
                <div className="stat-foot">Pending {ov.pendingJobs}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">已完成</div>
                <div className="stat-value">{ov.finishedJobs}</div>
                <div className="stat-foot">失败 {ov.failedJobs} · 取消 {ov.cancelledJobs}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Slot</div>
                <div className="stat-value">{totalSlot > 0 ? `${usedSlot}/${totalSlot}` : ov.totalSlot}</div>
                <div className="stat-foot">
                  {totalSlot > 0 ? (
                    <ProgressBar value={slotPct} label={`已用 ${usedSlot} / 总量 ${totalSlot}`} />
                  ) : (
                    <>未分配 {ov.unassignedSlot}（dynamic-slot 时常为 0）</>
                  )}
                </div>
              </div>
            </section>

            <div className="overview-grid" style={{ marginTop: 16 }}>
              <section className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">节点</h2>
                  <Link className="btn" to="/system">系统监控</Link>
                </div>
                <div className="panel-body">
                  <AsyncState loading={nodes.loading && !nodes.data} error={nodes.error} data={nodes.data} emptyText="暂无节点监控数据">
                    {(list) => (
                      <div className="table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>角色</th>
                              <th>地址</th>
                              <th>堆使用</th>
                              <th>系统负载</th>
                              <th>线程</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((node, index) => (
                              <tr key={`${node.host}-${node.port}-${index}`}>
                                <td>{formatSystemNodeRole(node.isMaster)}</td>
                                <td className="mono">{node.host}:{node.port}</td>
                                <td><ProgressBar value={parsePercent(node['heap.memory.used/max'])} label={node['heap.memory.used/max']} /></td>
                                <td><ProgressBar value={parsePercent(node['load.system'])} label={node['load.system']} /></td>
                                <td>{node['thread.count'] || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </AsyncState>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">Worker 资源</h2>
                  <Link className="btn" to="/pending">Pending</Link>
                </div>
                <div className="panel-body">
                  {workersRes.loading && !workerList.length ? (
                    <div className="loading">加载中…</div>
                  ) : workerList.length === 0 ? (
                    <div className="empty">暂无 Worker 资源数据</div>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>地址</th>
                            <th>Slot</th>
                            <th>CPU</th>
                            <th>内存</th>
                            <th>运行 Job</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workerList.map((worker) => (
                            <tr key={worker.address}>
                              <td className="mono">
                                {worker.address}
                                {worker.dynamicSlot ? <div className="muted" style={{ fontSize: 12 }}>dynamic-slot</div> : null}
                              </td>
                              <td>
                                {worker.dynamicSlot
                                  ? `${worker.freeSlots} free`
                                  : `${(worker.usedSlots ?? Math.max(0, worker.totalSlots - worker.freeSlots))}/${worker.totalSlots}`}
                              </td>
                              <td><ProgressBar value={usagePercent(worker.cpuUsage)} /></td>
                              <td><ProgressBar value={usagePercent(worker.memUsage)} /></td>
                              <td className="mono">{(worker.runningJobIds || []).join(', ') || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="overview-grid" style={{ marginTop: 16 }}>
              <section className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">运行中作业</h2>
                  <Link className="btn" to="/jobs">全部作业</Link>
                </div>
                <div className="panel-body">
                  <AsyncState loading={running.loading && !running.data} error={running.error} data={running.data} emptyText="当前没有运行中的作业">
                    {(jobs) => (
                      <div className="table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Job</th>
                              <th>状态</th>
                              <th>创建时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jobs.map((job) => (
                              <tr key={job.jobId}>
                                <td>
                                  <Link to={`/jobs/${job.jobId}`}>{job.jobName || job.jobId}</Link>
                                  <div className="mono muted" style={{ fontSize: 12 }}>{job.jobId}</div>
                                </td>
                                <td><StatusBadge status={job.jobStatus} /></td>
                                <td>{formatTimestamp(job.createTime)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </AsyncState>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">Pending 积压</h2>
                  <Link className="btn" to="/pending">查看队列</Link>
                </div>
                <div className="panel-body">
                  <AsyncState loading={pending.loading && !pending.data} error={pending.error} data={pending.data} emptyText="无法获取 Pending 信息">
                    {(payload) => (
                      <>
                        <div className="metric-grid" style={{ marginBottom: 12 }}>
                          <div className="metric-item">
                            <div className="metric-key">队列长度</div>
                            <div className="metric-value">{payload.queueSummary.size}</div>
                          </div>
                          <div className="metric-item">
                            <div className="metric-key">策略</div>
                            <div className="metric-value">{payload.queueSummary.scheduleStrategy}</div>
                          </div>
                          <div className="metric-item">
                            <div className="metric-key">缺 Slot 的 TaskGroup</div>
                            <div className="metric-value">{payload.queueSummary.lackingTaskGroups}</div>
                          </div>
                        </div>
                        {payload.pendingJobs.length === 0 ? (
                          <div className="empty">当前无 Pending 作业</div>
                        ) : (
                          <div className="table-wrap">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Job</th>
                                  <th>等待</th>
                                  <th>原因</th>
                                </tr>
                              </thead>
                              <tbody>
                                {payload.pendingJobs.map((job) => (
                                  <tr key={job.jobId}>
                                    <td>
                                      <Link to={`/jobs/${job.jobId}`}>{job.jobName || job.jobId}</Link>
                                    </td>
                                    <td>{Math.round((job.waitDurationMs || 0) / 1000)}s</td>
                                    <td>{job.failureReason || job.failureMessage || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </AsyncState>
                </div>
              </section>
            </div>

            <div className="engine-meta">
              Git {ov.gitCommitAbbrev} · 版本 {ov.projectVersion}
              {tags ? ` · Tag 筛选 ${tagKey}=${tagValue}` : ''}
            </div>
          </>
        )}
      </AsyncState>
    </>
  )
}
