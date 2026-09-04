import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { tasksApi } from '../api/tasksClient'
import { AsyncState } from '../components/AsyncState'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import { TaskSchedulePanel } from '../components/TaskSchedulePanel'
import { usePolling } from '../hooks/usePolling'
import { useI18n } from '../i18n'
import { formatTimestamp } from '../utils/format'

type DetailTab = 'basic' | 'schedule' | 'runs'

function parseTab(value: string | null): DetailTab {
  if (value === 'schedule' || value === 'runs') return value
  return 'basic'
}

export function TaskDetailPage() {
  const { t } = useI18n()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const taskId = Number(id)
  const tab = parseTab(searchParams.get('tab'))
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [runsPage, setRunsPage] = useState(1)
  const [runsPageSize, setRunsPageSize] = useState(20)

  useEffect(() => {
    setRunsPage(1)
  }, [id])

  const task = usePolling(() => tasksApi.get(taskId), [id], 10000, autoRefresh && tab !== 'schedule')
  const runs = usePolling(
    () => tasksApi.runs(taskId, runsPage, runsPageSize),
    [id, runsPage, runsPageSize],
    10000,
    autoRefresh && tab === 'runs',
  )

  const runRows = useMemo(
    () => (Array.isArray(runs.data?.data) ? runs.data.data : []),
    [runs.data],
  )
  const runsTotal = runs.data?.total ?? runRows.length

  useEffect(() => {
    if (runs.data == null) return
    const pages = Math.max(1, Math.ceil(runsTotal / runsPageSize) || 1)
    if (runsPage > pages) setRunsPage(pages)
  }, [runs.data, runsPage, runsPageSize, runsTotal])

  const setTab = (next: DetailTab) => {
    setSearchParams(next === 'basic' ? {} : { tab: next }, { replace: true })
  }

  const handleRun = async () => {
    if (!task.data) return
    if (!window.confirm(t('tasks.confirmRun', { name: task.data.name }))) return
    setRunning(true)
    setMessage(null)
    try {
      const result = await tasksApi.run(taskId)
      setMessage(t('tasks.submitted', { name: result.submitResult.jobName, id: result.submitResult.jobId }))
      setRunsPage(1)
      await Promise.all([task.reload(), runs.reload()])
    } catch (error) {
      setMessage(String(error))
    } finally {
      setRunning(false)
    }
  }

  const handleDelete = async () => {
    if (!task.data) return
    if (!window.confirm(t('tasks.confirmDelete', { name: task.data.name }))) return
    await tasksApi.delete(taskId)
    navigate('/tasks')
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('tasks.detailTitle')}</h1>
          <p className="page-desc mono">#{id}</p>
        </div>
        <div className="actions">
          {tab !== 'schedule' && (
            <label className="inline-check">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              {t('app.autoRefresh')}
            </label>
          )}
          <Link className="btn" to="/tasks">{t('tasks.backToList')}</Link>
          <Link className="btn" to={`/tasks/${id}/edit`}>{t('tasks.edit')}</Link>
          <button
            className="btn primary"
            type="button"
            disabled={running || !task.data?.isEnabled}
            onClick={handleRun}
          >
            {running ? t('tasks.running') : t('tasks.run')}
          </button>
          <button className="btn danger" type="button" onClick={handleDelete}>{t('tasks.delete')}</button>
        </div>
      </header>

      {message && (
        <div className={/submitted|已提交/i.test(message) ? 'panel' : 'error'} style={{ marginBottom: 16, padding: 16 }}>
          {message}
        </div>
      )}

      <AsyncState loading={task.loading} error={task.error} data={task.data} refreshing={task.refreshing} emptyText={t('tasks.notFound')}>
        {(detail) => (
          <>
            <div className="tabs" style={{ marginBottom: 16 }}>
              <button className={`tab${tab === 'basic' ? ' active' : ''}`} type="button" onClick={() => setTab('basic')}>
                {t('tasks.basic')}
              </button>
              <button className={`tab${tab === 'schedule' ? ' active' : ''}`} type="button" onClick={() => setTab('schedule')}>
                {t('tasks.schedule')}
              </button>
              <button className={`tab${tab === 'runs' ? ' active' : ''}`} type="button" onClick={() => setTab('runs')}>
                {t('tasks.runs')}
              </button>
            </div>

            {tab === 'basic' && (
              <section className="panel task-basic-panel">
                <div className="panel-header">
                  <h2 className="panel-title">{t('tasks.basic')}</h2>
                  <StatusBadge status={detail.lastJobStatus} />
                </div>
                <div className="panel-body">
                  <div className="metric-grid">
                    <div className="metric-item">
                      <div className="metric-key">{t('tasks.name')}</div>
                      <div className="metric-value">{detail.name}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">{t('tasks.description')}</div>
                      <div className="metric-value">{detail.description || '—'}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">{t('tasks.configFormat')}</div>
                      <div className="metric-value mono">{detail.configFormat}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">{t('tasks.defaultJobName')}</div>
                      <div className="metric-value mono">{detail.defaultJobName || '—'}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">{t('tasks.enableState')}</div>
                      <div className="metric-value">{detail.isEnabled ? t('app.enabled') : t('app.disabled')}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">{t('tasks.colSchedule')}</div>
                      <div className="metric-value">
                        {detail.schedule?.enabled ? (
                          <>
                            {t('tasks.scheduleOn')} · <Link to={`/tasks/${id}?tab=schedule`}>{detail.schedule.description}</Link>
                          </>
                        ) : (
                          <>
                            {t('tasks.scheduleOff')} · <Link to={`/tasks/${id}?tab=schedule`}>{t('tasks.goConfigure')}</Link>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">{t('tasks.colCreated')}</div>
                      <div className="metric-value">{formatTimestamp(detail.createdAt)}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">{t('tasks.updatedAt')}</div>
                      <div className="metric-value">{formatTimestamp(detail.updatedAt)}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">{t('tasks.colLastRun')}</div>
                      <div className="metric-value">{formatTimestamp(detail.lastRunAt)}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">{t('tasks.lastJob')}</div>
                      <div className="metric-value mono">
                        {detail.lastJobId ? <Link to={`/jobs/${detail.lastJobId}`}>{detail.lastJobId}</Link> : '—'}
                      </div>
                    </div>
                    {detail.lastErrorMsg && (
                      <div className="metric-item">
                        <div className="metric-key">{t('tasks.lastError')}</div>
                        <div className="metric-value">{detail.lastErrorMsg}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <div className="metric-group-title">{t('tasks.jobConfig')}</div>
                    <pre className="mono metrics-pre">{detail.configContent}</pre>
                  </div>
                </div>
              </section>
            )}

            {tab === 'schedule' && <TaskSchedulePanel taskId={taskId} />}

            {tab === 'runs' && (
              <section className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">{t('tasks.runs')}</h2>
                  <button className="btn" type="button" onClick={() => runs.reload()}>{t('app.refresh')}</button>
                </div>
                <div className="panel-body">
                  <AsyncState
                    loading={runs.loading}
                    error={runs.error}
                    data={runs.data == null ? null : runRows}
                    refreshing={runs.refreshing}
                    emptyText={t('tasks.noRuns')}
                  >
                    {(items) => (
                      <>
                        <div className="table-wrap">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>{t('jobs.colId')}</th>
                                <th>{t('jobs.colName')}</th>
                                <th>{t('app.status')}</th>
                                <th>{t('tasks.colStarted')}</th>
                                <th>{t('tasks.colFinished')}</th>
                                <th>{t('tasks.colError')}</th>
                                <th>{t('app.actions')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((run) => (
                                <tr key={run.id}>
                                  <td className="mono">
                                    <Link to={`/jobs/${run.jobId}`}>{run.jobId}</Link>
                                  </td>
                                  <td>{run.jobName || '—'}</td>
                                  <td><StatusBadge status={run.status} /></td>
                                  <td>{formatTimestamp(run.startedAt)}</td>
                                  <td>{formatTimestamp(run.finishedAt)}</td>
                                  <td>{run.errorMsg || '—'}</td>
                                  <td>
                                    <Link className="btn" to={`/jobs/${run.jobId}`}>{t('tasks.jobDetail')}</Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <Pagination
                          page={runsPage}
                          pageSize={runsPageSize}
                          total={runsTotal}
                          onPageChange={setRunsPage}
                          onPageSizeChange={(size) => {
                            setRunsPageSize(size)
                            setRunsPage(1)
                          }}
                        />
                      </>
                    )}
                  </AsyncState>
                </div>
              </section>
            )}
          </>
        )}
      </AsyncState>
    </>
  )
}
