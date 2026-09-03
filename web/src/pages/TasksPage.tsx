import { Link } from 'react-router-dom'
import { useState } from 'react'
import { tasksApi } from '../api/tasksClient'
import { AsyncState } from '../components/AsyncState'
import { StatusBadge } from '../components/StatusBadge'
import { usePolling } from '../hooks/usePolling'
import { useI18n } from '../i18n'
import { formatTimestamp } from '../utils/format'
import type { Task } from '../types/tasks'

export function TasksPage() {
  const { t } = useI18n()
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [messageOk, setMessageOk] = useState(false)
  const [runningId, setRunningId] = useState<number | null>(null)

  const tasks = usePolling(() => tasksApi.list(true), [], 10000, autoRefresh)

  const handleRun = async (task: Task) => {
    if (!window.confirm(t('tasks.confirmRun', { name: task.name }))) return
    setRunningId(task.id)
    setMessage(null)
    try {
      const result = await tasksApi.run(task.id)
      setMessageOk(true)
      setMessage(t('tasks.submitted', { name: result.submitResult.jobName, id: result.submitResult.jobId }))
      await tasks.reload()
    } catch (error) {
      setMessageOk(false)
      setMessage(String(error))
    } finally {
      setRunningId(null)
    }
  }

  const handleDelete = async (task: Task) => {
    if (!window.confirm(t('tasks.confirmDelete', { name: task.name }))) return
    await tasksApi.delete(task.id)
    await tasks.reload()
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('tasks.title')}</h1>
          <p className="page-desc">{t('tasks.desc')}</p>
        </div>
        <div className="actions">
          <label className="inline-check">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            {t('app.autoRefresh')}
          </label>
          <Link className="btn primary" to="/tasks/new">{t('tasks.create')}</Link>
          <button className="btn" type="button" onClick={() => tasks.reload()}>{t('app.refresh')}</button>
        </div>
      </header>

      {message && (
        <div className={messageOk ? 'panel' : 'error'} style={{ marginBottom: 16, padding: 16 }}>
          {message}
        </div>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">{t('tasks.list')}</h2>
        </div>
        <div className="panel-body">
          <AsyncState loading={tasks.loading} error={tasks.error} data={tasks.data} refreshing={tasks.refreshing} emptyText={t('tasks.empty')}>
            {(rows) => (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('tasks.colName')}</th>
                      <th>{t('tasks.colFormat')}</th>
                      <th>{t('tasks.colSchedule')}</th>
                      <th>{t('tasks.colNext')}</th>
                      <th>{t('tasks.colCreated')}</th>
                      <th>{t('tasks.colLastRun')}</th>
                      <th>{t('tasks.colLastStatus')}</th>
                      <th>{t('tasks.colLastJob')}</th>
                      <th>{t('app.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((task) => (
                      <tr key={task.id}>
                        <td>
                          <Link to={`/tasks/${task.id}`}>{task.name}</Link>
                          {task.description && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{task.description}</div>}
                        </td>
                        <td className="mono">{task.configFormat}</td>
                        <td>
                          {task.schedule?.enabled ? (
                            <Link to={`/tasks/${task.id}?tab=schedule`} title={task.schedule.cronExpr}>
                              <span className="schedule-badge enabled">{t('tasks.scheduleOn')}</span>
                              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                                {task.schedule.description}
                              </div>
                            </Link>
                          ) : (
                            <Link to={`/tasks/${task.id}?tab=schedule`}>
                              <span className="schedule-badge">{t('tasks.scheduleOff')}</span>
                            </Link>
                          )}
                        </td>
                        <td>{formatTimestamp(task.schedule?.nextRunAt ?? null)}</td>
                        <td>{formatTimestamp(task.createdAt)}</td>
                        <td>{formatTimestamp(task.lastRunAt)}</td>
                        <td><StatusBadge status={task.lastJobStatus} /></td>
                        <td className="mono">
                          {task.lastJobId ? <Link to={`/jobs/${task.lastJobId}`}>{task.lastJobId}</Link> : '—'}
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="btn primary"
                              type="button"
                              disabled={!task.isEnabled || runningId === task.id}
                              onClick={() => handleRun(task)}
                            >
                              {runningId === task.id ? t('tasks.running') : t('tasks.run')}
                            </button>
                            <Link className="btn" to={`/tasks/${task.id}`}>{t('tasks.detail')}</Link>
                            <Link className="btn" to={`/tasks/${task.id}/edit`}>{t('tasks.edit')}</Link>
                            <button className="btn danger" type="button" onClick={() => handleDelete(task)}>{t('tasks.delete')}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AsyncState>
        </div>
      </section>
    </>
  )
}
