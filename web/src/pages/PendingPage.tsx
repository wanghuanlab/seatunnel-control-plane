import { useState } from 'react'
import { seatunnelApi } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { usePolling } from '../hooks/usePolling'
import { formatDuration } from '../utils/format'

export function PendingPage() {
  const [autoRefresh, setAutoRefresh] = useState(true)
  const pending = usePolling(() => seatunnelApi.getPendingJobs({ pretty: true }), [], 10000, autoRefresh)

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Pending 队列</h1>
          <p className="page-desc">排查长时间 Pending 的作业，查看 Slot 竞争与 TaskGroup 分配诊断。</p>
        </div>
        <div className="actions">
          <label className="inline-check">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            自动刷新
          </label>
          <button className="btn" type="button" onClick={() => pending.reload()}>刷新</button>
        </div>
      </header>

      <AsyncState loading={pending.loading} error={pending.error} data={pending.data} emptyText="Pending 队列为空">
        {(payload) => (
          <div className="grid" style={{ gap: 16 }}>
            <section className="grid stats">
              <div className="stat-card">
                <div className="stat-label">Queue Size</div>
                <div className="stat-value">{payload.queueSummary.size}</div>
                <div className="stat-foot">{payload.queueSummary.scheduleStrategy}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Lacking TaskGroups</div>
                <div className="stat-value">{payload.queueSummary.lackingTaskGroups}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Workers</div>
                <div className="stat-value">{payload.clusterSnapshot.workerCount}</div>
                <div className="stat-foot">Free slots {payload.clusterSnapshot.freeSlots}</div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header"><h2 className="panel-title">Worker 快照</h2></div>
              <div className="panel-body table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th>Slots</th>
                      <th>CPU/Mem</th>
                      <th>Running Jobs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.clusterSnapshot.workers.map((worker) => (
                      <tr key={worker.address}>
                        <td className="mono">{worker.address}</td>
                        <td>{worker.freeSlots}/{worker.totalSlots}</td>
                        <td>{worker.cpuUsage ?? '—'} / {worker.memUsage ?? '—'}</td>
                        <td className="mono">{worker.runningJobIds.join(', ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header"><h2 className="panel-title">Pending Jobs</h2></div>
              <div className="panel-body table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>等待时长</th>
                      <th>缺少 TaskGroup</th>
                      <th>失败原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.pendingJobs.map((job) => (
                      <tr key={job.jobId}>
                        <td>
                          <div className="mono">{job.jobId}</div>
                          <div>{job.jobName}</div>
                        </td>
                        <td>{formatDuration(job.waitDurationMs)}</td>
                        <td>{job.lackingTaskGroups}</td>
                        <td>{job.failureMessage || job.failureReason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </AsyncState>
    </>
  )
}
