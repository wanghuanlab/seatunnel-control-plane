import { useState } from 'react'
import { seatunnelApi } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { usePolling } from '../hooks/usePolling'
import { useI18n } from '../i18n'
import { formatDuration } from '../utils/format'

export function PendingPage() {
  const { t } = useI18n()
  const [autoRefresh, setAutoRefresh] = useState(true)
  const pending = usePolling(() => seatunnelApi.getPendingJobs({ pretty: true }), [], 10000, autoRefresh)

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('pending.title')}</h1>
          <p className="page-desc">{t('pending.desc')}</p>
        </div>
        <div className="actions">
          <label className="inline-check">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            {t('app.autoRefresh')}
          </label>
          <button className="btn" type="button" onClick={() => pending.reload()}>{t('app.refresh')}</button>
        </div>
      </header>

      <AsyncState loading={pending.loading} error={pending.error} data={pending.data} refreshing={pending.refreshing} emptyText={t('pending.empty')}>
        {(payload) => (
          <div className="grid" style={{ gap: 16 }}>
            <section className="grid stats">
              <div className="stat-card">
                <div className="stat-label">{t('pending.queueSize')}</div>
                <div className="stat-value">{payload.queueSummary.size}</div>
                <div className="stat-foot">{payload.queueSummary.scheduleStrategy}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{t('pending.lacking')}</div>
                <div className="stat-value">{payload.queueSummary.lackingTaskGroups}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{t('pending.workers')}</div>
                <div className="stat-value">{payload.clusterSnapshot.workerCount}</div>
                <div className="stat-foot">{t('pending.freeSlots', { count: payload.clusterSnapshot.freeSlots })}</div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header"><h2 className="panel-title">{t('pending.workerSnapshot')}</h2></div>
              <div className="panel-body table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('pending.colAddress')}</th>
                      <th>{t('pending.colSlots')}</th>
                      <th>{t('pending.colCpuMem')}</th>
                      <th>{t('pending.colRunning')}</th>
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
              <div className="panel-header"><h2 className="panel-title">{t('pending.pendingJobs')}</h2></div>
              <div className="panel-body table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('pending.colJob')}</th>
                      <th>{t('pending.colWait')}</th>
                      <th>{t('pending.colLacking')}</th>
                      <th>{t('pending.colReason')}</th>
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
