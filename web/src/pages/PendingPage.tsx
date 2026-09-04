import { ArrowsClockwise, WarningCircle } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
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
    <div className="run-space run-pending">
      <header className="run-page-header">
        <div>
          <span className="run-page-kicker">{t('nav.space')}</span>
          <h1 className="run-page-title">{t('pending.title')}</h1>
          <p className="run-page-desc">{t('pending.desc')}</p>
        </div>
        <div className="run-page-actions">
          <label className="run-refresh-control">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            {t('app.autoRefresh')}
          </label>
          <button className="btn compact" type="button" onClick={() => pending.reload()}><ArrowsClockwise size={16} />{t('app.refresh')}</button>
        </div>
      </header>

      <AsyncState loading={pending.loading} error={pending.error} data={pending.data} refreshing={pending.refreshing} emptyText={t('pending.empty')}>
        {(payload) => (
          <div className="run-queue-layout">
            <section className="run-queue-summary" aria-label={t('pending.title')}>
              <div className={`run-queue-stat ${payload.queueSummary.size ? 'attention' : 'healthy'}`}>
                <div className="run-queue-stat-label"><WarningCircle size={16} />{t('pending.queueSize')}</div>
                <strong>{payload.queueSummary.size}</strong>
                <span>{payload.queueSummary.scheduleStrategy}</span>
              </div>
              <div className={`run-queue-stat ${payload.queueSummary.lackingTaskGroups ? 'attention' : ''}`}>
                <div className="run-queue-stat-label">{t('pending.lacking')}</div>
                <strong>{payload.queueSummary.lackingTaskGroups}</strong>
                <span>{t('pending.lackingHint')}</span>
              </div>
              <div className="run-queue-stat">
                <div className="run-queue-stat-label">{t('pending.workers')}</div>
                <strong>{payload.clusterSnapshot.workerCount}</strong>
                <span>{t('pending.freeSlots', { count: payload.clusterSnapshot.freeSlots })}</span>
              </div>
            </section>

            <section className="run-panel">
              <div className="run-panel-header"><div><span className="run-panel-kicker">{t('pending.workers')}</span><h2>{t('pending.workerSnapshot')}</h2></div><span className="run-panel-meta">{payload.clusterSnapshot.workers.length} {t('app.records')}</span></div>
              <div className="run-panel-body table-wrap">
                <table className="data-table run-table">
                  <thead>
                    <tr>
                      <th>{t('pending.colAddress')}</th>
                      <th>{t('pending.colSlots')}</th>
                      <th>{t('pending.colCpuMem')}</th>
                      <th>{t('pending.colRunning')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.clusterSnapshot.workers.length === 0 && <tr><td className="run-table-empty" colSpan={4}>{t('pending.emptyWorkers')}</td></tr>}
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

            <section className="run-panel">
              <div className="run-panel-header"><div><span className="run-panel-kicker">{t('pending.queueSize')}</span><h2>{t('pending.pendingJobs')}</h2></div><span className="run-panel-meta">{payload.pendingJobs.length} {t('app.records')}</span></div>
              <div className="run-panel-body table-wrap">
                <table className="data-table run-table">
                  <thead>
                    <tr>
                      <th>{t('pending.colJob')}</th>
                      <th>{t('pending.colWait')}</th>
                      <th>{t('pending.colLacking')}</th>
                      <th>{t('pending.colReason')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.pendingJobs.length === 0 && <tr><td className="run-table-empty" colSpan={4}>{t('pending.empty')}</td></tr>}
                    {payload.pendingJobs.map((job) => (
                      <tr key={job.jobId}>
                        <td>
                          <Link className="run-table-primary" to={`/jobs/${job.jobId}`}>{job.jobName || t('app.jobFallback', { id: job.jobId })}</Link>
                          <div className="mono run-table-secondary">{job.jobId}</div>
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
    </div>
  )
}
