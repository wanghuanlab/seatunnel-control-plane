import { useState } from 'react'
import { seatunnelApi } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { usePolling } from '../hooks/usePolling'
import { formatSystemMetricEntries, formatSystemNodeRole } from '../utils/format'
import type { SystemMonitoringNode } from '../types/api'

function groupSystemMetrics(node: SystemMonitoringNode) {
  const entries = formatSystemMetricEntries(node as Record<string, string | undefined>)
  return entries.reduce<Record<string, typeof entries>>((acc, item) => {
    acc[item.group] = acc[item.group] || []
    acc[item.group].push(item)
    return acc
  }, {})
}

export function SystemPage() {
  const [metricTab, setMetricTab] = useState<'metrics' | 'openmetrics'>('metrics')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const system = usePolling(() => seatunnelApi.getSystemMonitoring(), [], 15000, autoRefresh)
  const metrics = usePolling(
    () => seatunnelApi.getMetrics().catch(() => 'Telemetry 未开启，请在 seatunnel.yaml 中启用 telemetry.metric'),
    [],
    15000,
    autoRefresh && metricTab === 'metrics',
  )
  const openMetrics = usePolling(
    () => seatunnelApi.getOpenMetrics().catch(() => 'OpenMetrics 未开启'),
    [],
    15000,
    autoRefresh && metricTab === 'openmetrics',
  )

  const metricData = metricTab === 'metrics' ? metrics : openMetrics

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">系统监控</h1>
          <p className="page-desc">展示 `/system-monitoring-information`、`/metrics` 与 `/openmetrics`。</p>
        </div>
        <div className="actions">
          <label className="inline-check">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            自动刷新
          </label>
          <button className="btn" type="button" onClick={() => { system.reload(); metricData.reload() }}>刷新</button>
        </div>
      </header>

      <AsyncState loading={system.loading} error={system.error} data={system.data} emptyText="暂无系统监控数据">
        {(nodes) => (
          <div className="grid" style={{ gap: 16 }}>
            {nodes.map((node, index) => {
              const grouped = groupSystemMetrics(node)
              return (
                <section className="panel" key={`${node.host}-${node.port}-${index}`}>
                  <div className="panel-header">
                    <h2 className="panel-title">
                      {formatSystemNodeRole(node.isMaster)} · {node.host}:{node.port}
                    </h2>
                  </div>
                  <div className="panel-body">
                    {Object.entries(grouped).map(([group, items], groupIndex, groups) => (
                      <div key={group} style={{ marginBottom: groupIndex < groups.length - 1 ? 18 : 0 }}>
                        <div className="metric-group-title">{group}</div>
                        <div className="metric-grid">
                          {items.map((item) => (
                            <div key={item.rawKey} className="metric-item" title={item.rawKey}>
                              <div className="metric-key">{item.label}</div>
                              <div className="metric-value">{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </AsyncState>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header">
          <h2 className="panel-title">Telemetry 原始指标</h2>
          <div className="tabs compact">
            <button className={`tab${metricTab === 'metrics' ? ' active' : ''}`} type="button" onClick={() => setMetricTab('metrics')}>Metrics</button>
            <button className={`tab${metricTab === 'openmetrics' ? ' active' : ''}`} type="button" onClick={() => setMetricTab('openmetrics')}>OpenMetrics</button>
          </div>
        </div>
        <div className="panel-body">
          <p className="page-desc" style={{ marginTop: 0, marginBottom: 12 }}>
            以下为 Prometheus / OpenMetrics 原始格式，保留英文指标名。
          </p>
          <AsyncState loading={metricData.loading} error={metricData.error} data={metricData.data} emptyText="暂无指标数据">
            {(text) => (
              <pre className="mono metrics-pre">{text}</pre>
            )}
          </AsyncState>
        </div>
      </section>
    </>
  )
}
