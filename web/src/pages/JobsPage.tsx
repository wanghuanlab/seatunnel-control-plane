import { useMemo, useState } from 'react'
import { seatunnelApi } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { JobTable } from '../components/JobTable'
import { usePolling } from '../hooks/usePolling'
import type { FinishedJobState } from '../types/api'

const FINISHED_STATES: Array<FinishedJobState | 'ALL'> = [
  'ALL',
  'FINISHED',
  'FAILED',
  'CANCELED',
  'SAVEPOINT_DONE',
  'UNKNOWABLE',
]

export function JobsPage() {
  const [tab, setTab] = useState<'running' | 'finished'>('running')
  const [finishedState, setFinishedState] = useState<FinishedJobState | 'ALL'>('ALL')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)

  const running = usePolling(() => seatunnelApi.getRunningJobs(), [tab], 10000, autoRefresh && tab === 'running')
  const finished = usePolling(
    () => seatunnelApi.getFinishedJobs(finishedState === 'ALL' ? undefined : finishedState),
    [tab, finishedState],
    15000,
    autoRefresh && tab === 'finished',
  )

  const active = tab === 'running' ? running : finished
  const jobs = useMemo(
    () => (Array.isArray(active.data) ? active.data : []),
    [active.data],
  )

  const handleStop = async (jobId: string) => {
    if (!window.confirm(`确认停止作业 ${jobId}？`)) return
    await seatunnelApi.stopJob(jobId)
    await running.reload()
    setSelectedIds((ids) => ids.filter((id) => id !== jobId))
  }

  const handleBatchStop = async () => {
    if (!selectedIds.length) return
    if (!window.confirm(`确认批量停止 ${selectedIds.length} 个作业？`)) return
    await seatunnelApi.stopJobs(selectedIds.map((jobId) => ({ jobId })))
    await running.reload()
    setSelectedIds([])
  }

  const toggleSelection = (jobId: string, checked: boolean) => {
    setSelectedIds((ids) => (checked ? [...new Set([...ids, jobId])] : ids.filter((id) => id !== jobId)))
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">作业管理</h1>
          <p className="page-desc">查看运行中与已完成作业，支持批量停止与自动刷新。</p>
        </div>
        <div className="actions">
          <label className="inline-check">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            自动刷新
          </label>
          {tab === 'running' && selectedIds.length > 0 && (
            <button className="btn danger" type="button" onClick={handleBatchStop}>
              批量停止 ({selectedIds.length})
            </button>
          )}
        </div>
      </header>

      <div className="tabs">
        <button className={`tab${tab === 'running' ? ' active' : ''}`} type="button" onClick={() => setTab('running')}>
          运行中
        </button>
        <button className={`tab${tab === 'finished' ? ' active' : ''}`} type="button" onClick={() => setTab('finished')}>
          已完成
        </button>
      </div>

      {tab === 'finished' && (
        <div className="tabs">
          {FINISHED_STATES.map((state) => (
            <button
              key={state}
              className={`tab${finishedState === state ? ' active' : ''}`}
              type="button"
              onClick={() => setFinishedState(state)}
            >
              {state}
            </button>
          ))}
        </div>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">{tab === 'running' ? 'Running Jobs' : 'Finished Jobs'}</h2>
          <button className="btn" type="button" onClick={() => active.reload()}>刷新</button>
        </div>
        <div className="panel-body">
          <AsyncState
            loading={active.loading}
            error={active.error}
            data={jobs}
            emptyText={tab === 'running' ? '当前没有运行中的作业' : '没有匹配的历史作业'}
          >
            {(rows) => (
              <JobTable
                jobs={rows}
                showActions={tab === 'running'}
                selectable={tab === 'running'}
                selectedIds={selectedIds}
                onToggle={toggleSelection}
                onStop={handleStop}
              />
            )}
          </AsyncState>
        </div>
      </section>
    </>
  )
}
