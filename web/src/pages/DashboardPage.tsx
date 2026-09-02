import { useMemo, useState } from 'react'
import { seatunnelApi } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { usePolling } from '../hooks/usePolling'

export function DashboardPage() {
  const [tagKey, setTagKey] = useState('')
  const [tagValue, setTagValue] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const tags = useMemo(() => {
    if (!tagKey.trim()) return undefined
    return { [tagKey.trim()]: tagValue.trim() }
  }, [tagKey, tagValue])

  const { data, error, loading, reload } = usePolling(
    () => seatunnelApi.getOverview(tags),
    [tagKey, tagValue],
    10000,
    autoRefresh,
  )

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">集群概览</h1>
          <p className="page-desc">基于 SeaTunnel Zeta REST API V2 `/overview`，支持 tag 过滤与 10 秒自动刷新。</p>
        </div>
        <div className="actions">
          <label className="inline-check">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            自动刷新
          </label>
          <button className="btn" type="button" onClick={() => reload()}>刷新</button>
        </div>
      </header>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header"><h2 className="panel-title">Tag 过滤</h2></div>
        <div className="panel-body form-grid" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
          <div className="form-row">
            <label htmlFor="tagKey">Tag Key</label>
            <input id="tagKey" placeholder="zone" value={tagKey} onChange={(e) => setTagKey(e.target.value)} />
          </div>
          <div className="form-row">
            <label htmlFor="tagValue">Tag Value</label>
            <input id="tagValue" placeholder="az1" value={tagValue} onChange={(e) => setTagValue(e.target.value)} />
          </div>
          <button className="btn primary" type="button" onClick={() => reload()}>应用</button>
        </div>
      </section>

      <AsyncState loading={loading} error={error} data={data} emptyText="无法获取集群概览">
        {(overview) => (
          <>
            <section className="grid stats">
              <div className="stat-card">
                <div className="stat-label">Workers</div>
                <div className="stat-value">{overview.workers}</div>
                <div className="stat-foot">版本 {overview.projectVersion}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Running Jobs</div>
                <div className="stat-value">{overview.runningJobs}</div>
                <div className="stat-foot">Pending {overview.pendingJobs}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Finished</div>
                <div className="stat-value">{overview.finishedJobs}</div>
                <div className="stat-foot">Failed {overview.failedJobs}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Slots</div>
                <div className="stat-value">{overview.totalSlot}</div>
                <div className="stat-foot">Unassigned {overview.unassignedSlot}</div>
              </div>
            </section>

            <section className="panel" style={{ marginTop: 16 }}>
              <div className="panel-header">
                <h2 className="panel-title">引擎信息</h2>
              </div>
              <div className="panel-body mono">
                Git {overview.gitCommitAbbrev} · Cancelled {overview.cancelledJobs}
              </div>
            </section>
          </>
        )}
      </AsyncState>
    </>
  )
}
