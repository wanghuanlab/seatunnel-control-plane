import { Link } from 'react-router-dom'
import { useState } from 'react'
import { tasksApi } from '../api/tasksClient'
import { AsyncState } from '../components/AsyncState'
import { StatusBadge } from '../components/StatusBadge'
import { usePolling } from '../hooks/usePolling'
import { formatTimestamp } from '../utils/format'
import type { Task } from '../types/tasks'

export function TasksPage() {
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<number | null>(null)

  const tasks = usePolling(() => tasksApi.list(true), [], 10000, autoRefresh)

  const handleRun = async (task: Task) => {
    if (!window.confirm(`确认运行任务「${task.name}」？`)) return
    setRunningId(task.id)
    setMessage(null)
    try {
      const result = await tasksApi.run(task.id)
      setMessage(`已提交：${result.submitResult.jobName} (${result.submitResult.jobId})`)
      await tasks.reload()
    } catch (error) {
      setMessage(String(error))
    } finally {
      setRunningId(null)
    }
  }

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`确认删除任务「${task.name}」？`)) return
    await tasksApi.delete(task.id)
    await tasks.reload()
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">任务管理</h1>
          <p className="page-desc">维护作业模板配置，一键运行提交到 SeaTunnel，并跟踪最近执行状态。</p>
        </div>
        <div className="actions">
          <label className="inline-check">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            自动刷新
          </label>
          <Link className="btn primary" to="/tasks/new">新建任务</Link>
          <button className="btn" type="button" onClick={() => tasks.reload()}>刷新</button>
        </div>
      </header>

      {message && (
        <div className={message.includes('已提交') ? 'panel' : 'error'} style={{ marginBottom: 16, padding: 16 }}>
          {message}
        </div>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">任务列表</h2>
        </div>
        <div className="panel-body">
          <AsyncState loading={tasks.loading} error={tasks.error} data={tasks.data} emptyText="暂无任务，点击「新建任务」创建作业模板">
            {(rows) => (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>任务名称</th>
                      <th>格式</th>
                      <th>创建时间</th>
                      <th>最后执行</th>
                      <th>当前状态</th>
                      <th>最近 Job</th>
                      <th>操作</th>
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
                              {runningId === task.id ? '提交中…' : '运行'}
                            </button>
                            <Link className="btn" to={`/tasks/${task.id}`}>详情</Link>
                            <Link className="btn" to={`/tasks/${task.id}/edit`}>编辑</Link>
                            <button className="btn danger" type="button" onClick={() => handleDelete(task)}>删除</button>
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
