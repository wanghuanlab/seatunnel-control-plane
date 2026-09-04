import { ArrowsClockwise, Play, Plus } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { tasksApi } from '../api/tasksClient'
import { AsyncState } from '../components/AsyncState'
import { StatusBadge } from '../components/StatusBadge'
import { usePolling } from '../hooks/usePolling'
import { useI18n } from '../i18n'
import { describeCronPeriod } from '../utils/cron'
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
    setMessage(null)
    try {
      await tasksApi.delete(task.id)
      await tasks.reload()
    } catch (error) {
      setMessageOk(false)
      setMessage(String(error))
    }
  }

  return (
    <div className="run-space run-tasks">
      <header className="run-page-header">
        <div>
          <span className="run-page-kicker">{t('nav.space')}</span>
          <h1 className="run-page-title">{t('tasks.title')}</h1>
          <p className="run-page-desc">{t('tasks.desc')}</p>
        </div>
        <div className="run-page-actions">
          <label className="run-refresh-control">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            {t('app.autoRefresh')}
          </label>
          <button className="btn compact" type="button" onClick={() => tasks.reload()}><ArrowsClockwise size={16} />{t('app.refresh')}</button>
          <Link className="btn primary" to="/tasks/new"><Plus size={16} weight="bold" />{t('tasks.create')}</Link>
        </div>
      </header>

      {message && (
        <div className={`run-notice ${messageOk ? 'success' : 'error'}`} role="status">
          {message}
        </div>
      )}

      <section className="run-panel">
        <div className="run-panel-header">
          <div><span className="run-panel-kicker">{t('nav.tasks')}</span><h2>{t('tasks.list')}</h2></div>
          <span className="run-panel-meta">{tasks.data?.length ?? 0} {t('app.records')}</span>
        </div>
        <div className="run-panel-body">
          <AsyncState loading={tasks.loading} error={tasks.error} data={tasks.data} refreshing={tasks.refreshing} emptyText={t('tasks.empty')}>
            {(rows) => (
              <div className="table-wrap">
                <table className="data-table run-table task-table">
                  <thead>
                    <tr>
                      <th>{t('tasks.colName')}</th>
                      <th>{t('tasks.colFormat')}</th>
                      <th>{t('tasks.colSchedule')}</th>
                      <th>{t('tasks.colNext')}</th>
                      <th>{t('tasks.colLastRun')}</th>
                      <th>{t('tasks.colCreated')}</th>
                      <th>{t('tasks.colLastStatus')}</th>
                      <th>{t('app.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((task) => {
                      const scheduleOn = Boolean(task.schedule?.enabled)
                      const period = scheduleOn && task.schedule?.cronConfig
                        ? describeCronPeriod(task.schedule.cronConfig, t)
                        : null
                      return (
                        <tr key={task.id}>
                          <td>
                            <Link className="run-table-primary" to={`/tasks/${task.id}`}>{task.name}</Link>
                            {task.description && <div className="run-table-secondary">{task.description}</div>}
                          </td>
                          <td className="mono">{task.configFormat}</td>
                          <td>
                            <Link
                              className="schedule-inline"
                              to={`/tasks/${task.id}?tab=schedule`}
                              title={task.schedule?.cronExpr || undefined}
                            >
                              <span className={`schedule-badge${scheduleOn ? ' enabled' : ''}`}>
                                {scheduleOn ? t('tasks.scheduleOn') : t('tasks.scheduleOff')}
                              </span>
                              {period && <span className="schedule-period">{period}</span>}
                            </Link>
                          </td>
                          <td>{formatTimestamp(task.schedule?.nextRunAt ?? null)}</td>
                          <td>{formatTimestamp(task.lastRunAt)}</td>
                          <td>{formatTimestamp(task.createdAt)}</td>
                          <td><StatusBadge status={task.lastJobStatus} /></td>
                          <td>
                            <div className="row-actions">
                              <button
                                className="btn primary compact"
                                type="button"
                                disabled={!task.isEnabled || runningId === task.id}
                                onClick={() => handleRun(task)}
                              >
                                <Play size={14} weight="fill" />{runningId === task.id ? t('tasks.running') : t('tasks.run')}
                              </button>
                              <Link className="btn compact" to={`/tasks/${task.id}`}>{t('tasks.detail')}</Link>
                              <Link className="btn compact" to={`/tasks/${task.id}/edit`}>{t('tasks.edit')}</Link>
                              <button className="btn danger compact" type="button" onClick={() => handleDelete(task)}>{t('tasks.delete')}</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AsyncState>
        </div>
      </section>
    </div>
  )
}
