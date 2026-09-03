import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { tasksApi } from '../api/tasksClient'
import { AsyncState } from '../components/AsyncState'
import { StatusBadge } from '../components/StatusBadge'
import { TaskSchedulePanel } from '../components/TaskSchedulePanel'
import { usePolling } from '../hooks/usePolling'
import { formatTimestamp } from '../utils/format'

type DetailTab = 'basic' | 'schedule' | 'runs'

function parseTab(value: string | null): DetailTab {
  if (value === 'schedule' || value === 'runs') return value
  return 'basic'
}

export function TaskDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const taskId = Number(id)
  const tab = parseTab(searchParams.get('tab'))
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const task = usePolling(() => tasksApi.get(taskId), [id], 10000, autoRefresh && tab !== 'schedule')
  const runs = usePolling(() => tasksApi.runs(taskId), [id], 10000, autoRefresh && tab === 'runs')

  const setTab = (next: DetailTab) => {
    setSearchParams(next === 'basic' ? {} : { tab: next }, { replace: true })
  }

  const handleRun = async () => {
    if (!task.data) return
    if (!window.confirm(`确认运行任务「${task.data.name}」？`)) return
    setRunning(true)
    setMessage(null)
    try {
      const result = await tasksApi.run(taskId)
      setMessage(`已提交：${result.submitResult.jobName} (${result.submitResult.jobId})`)
      await Promise.all([task.reload(), runs.reload()])
    } catch (error) {
      setMessage(String(error))
    } finally {
      setRunning(false)
    }
  }

  const handleDelete = async () => {
    if (!task.data) return
    if (!window.confirm(`确认删除任务「${task.data.name}」？`)) return
    await tasksApi.delete(taskId)
    navigate('/tasks')
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">任务详情</h1>
          <p className="page-desc mono">#{id}</p>
        </div>
        <div className="actions">
          {tab !== 'schedule' && (
            <label className="inline-check">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              自动刷新
            </label>
          )}
          <Link className="btn" to="/tasks">返回列表</Link>
          <Link className="btn" to={`/tasks/${id}/edit`}>编辑</Link>
          <button
            className="btn primary"
            type="button"
            disabled={running || !task.data?.isEnabled}
            onClick={handleRun}
          >
            {running ? '提交中…' : '运行'}
          </button>
          <button className="btn danger" type="button" onClick={handleDelete}>删除</button>
        </div>
      </header>

      {message && (
        <div className={message.includes('已提交') ? 'panel' : 'error'} style={{ marginBottom: 16, padding: 16 }}>
          {message}
        </div>
      )}

      <AsyncState loading={task.loading} error={task.error} data={task.data} emptyText="未找到该任务">
        {(detail) => (
          <>
            <div className="tabs" style={{ marginBottom: 16 }}>
              <button className={`tab${tab === 'basic' ? ' active' : ''}`} type="button" onClick={() => setTab('basic')}>
                基本信息
              </button>
              <button className={`tab${tab === 'schedule' ? ' active' : ''}`} type="button" onClick={() => setTab('schedule')}>
                定时调度
              </button>
              <button className={`tab${tab === 'runs' ? ' active' : ''}`} type="button" onClick={() => setTab('runs')}>
                执行历史
              </button>
            </div>

            {tab === 'basic' && (
              <section className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">基本信息</h2>
                  <StatusBadge status={detail.lastJobStatus} />
                </div>
                <div className="panel-body">
                  <div className="metric-grid">
                    <div className="metric-item">
                      <div className="metric-key">任务名称</div>
                      <div className="metric-value">{detail.name}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">描述</div>
                      <div className="metric-value">{detail.description || '—'}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">配置格式</div>
                      <div className="metric-value mono">{detail.configFormat}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">默认 Job Name</div>
                      <div className="metric-value mono">{detail.defaultJobName || '—'}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">启用状态</div>
                      <div className="metric-value">{detail.isEnabled ? '已启用' : '已禁用'}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">定时调度</div>
                      <div className="metric-value">
                        {detail.schedule?.enabled ? (
                          <>
                            已启用 · <Link to={`/tasks/${id}?tab=schedule`}>{detail.schedule.description}</Link>
                          </>
                        ) : (
                          <>
                            未启用 · <Link to={`/tasks/${id}?tab=schedule`}>去配置</Link>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">创建时间</div>
                      <div className="metric-value">{formatTimestamp(detail.createdAt)}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">更新时间</div>
                      <div className="metric-value">{formatTimestamp(detail.updatedAt)}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">最后执行</div>
                      <div className="metric-value">{formatTimestamp(detail.lastRunAt)}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-key">最近 Job</div>
                      <div className="metric-value mono">
                        {detail.lastJobId ? <Link to={`/jobs/${detail.lastJobId}`}>{detail.lastJobId}</Link> : '—'}
                      </div>
                    </div>
                    {detail.lastErrorMsg && (
                      <div className="metric-item">
                        <div className="metric-key">最近错误</div>
                        <div className="metric-value">{detail.lastErrorMsg}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <div className="metric-group-title">作业配置</div>
                    <pre className="mono metrics-pre">{detail.configContent}</pre>
                  </div>
                </div>
              </section>
            )}

            {tab === 'schedule' && <TaskSchedulePanel taskId={taskId} />}

            {tab === 'runs' && (
              <section className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">执行历史</h2>
                  <button className="btn" type="button" onClick={() => runs.reload()}>刷新</button>
                </div>
                <div className="panel-body">
                  <AsyncState loading={runs.loading} error={runs.error} data={runs.data} emptyText="暂无执行记录">
                    {(items) => (
                      <div className="table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Job ID</th>
                              <th>Job Name</th>
                              <th>状态</th>
                              <th>开始时间</th>
                              <th>结束时间</th>
                              <th>错误信息</th>
                              <th>操作</th>
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
                                  <Link className="btn" to={`/jobs/${run.jobId}`}>作业详情</Link>
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
            )}
          </>
        )}
      </AsyncState>
    </>
  )
}
