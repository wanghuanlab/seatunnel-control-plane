import { useEffect, useMemo, useState } from 'react'
import { seatunnelApi } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { JobTable } from '../components/JobTable'
import { Pagination } from '../components/Pagination'
import { usePolling } from '../hooks/usePolling'
import { useI18n } from '../i18n'
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
  const { t, statusLabel } = useI18n()
  const [tab, setTab] = useState<'running' | 'finished'>('running')
  const [finishedState, setFinishedState] = useState<FinishedJobState | 'ALL'>('ALL')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [runningPage, setRunningPage] = useState(1)
  const [finishedPage, setFinishedPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    setFinishedPage(1)
  }, [finishedState])

  const running = usePolling(
    () => seatunnelApi.getRunningJobs(runningPage, pageSize),
    [runningPage, pageSize],
    10000,
    autoRefresh && tab === 'running',
  )
  const finished = usePolling(
    () => seatunnelApi.getFinishedJobs(finishedState === 'ALL' ? undefined : finishedState, finishedPage, pageSize),
    [finishedState, finishedPage, pageSize],
    15000,
    autoRefresh && tab === 'finished',
  )

  const active = tab === 'running' ? running : finished
  const page = tab === 'running' ? runningPage : finishedPage
  const setPage = tab === 'running' ? setRunningPage : setFinishedPage
  const jobs = useMemo(
    () => (Array.isArray(active.data?.data) ? active.data.data : []),
    [active.data],
  )
  const total = active.data?.total ?? jobs.length

  useEffect(() => {
    if (active.data == null) return
    const pages = Math.max(1, Math.ceil(total / pageSize) || 1)
    if (page > pages) setPage(pages)
  }, [active.data, page, pageSize, setPage, total])

  const handleStop = async (jobId: string) => {
    if (!window.confirm(t('jobs.confirmStop', { id: jobId }))) return
    await seatunnelApi.stopJob(jobId)
    await running.reload()
    setSelectedIds((ids) => ids.filter((id) => id !== jobId))
  }

  const handleBatchStop = async () => {
    if (!selectedIds.length) return
    if (!window.confirm(t('jobs.confirmBatchStop', { count: selectedIds.length }))) return
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
          <h1 className="page-title">{t('jobs.title')}</h1>
          <p className="page-desc">{t('jobs.desc')}</p>
        </div>
        <div className="actions">
          <label className="inline-check">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            {t('app.autoRefresh')}
          </label>
          {tab === 'running' && selectedIds.length > 0 && (
            <button className="btn danger" type="button" onClick={handleBatchStop}>
              {t('jobs.batchStop', { count: selectedIds.length })}
            </button>
          )}
        </div>
      </header>

      <div className="tabs">
        <button className={`tab${tab === 'running' ? ' active' : ''}`} type="button" onClick={() => setTab('running')}>
          {t('jobs.running')}
        </button>
        <button className={`tab${tab === 'finished' ? ' active' : ''}`} type="button" onClick={() => setTab('finished')}>
          {t('jobs.finished')}
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
              {statusLabel(state)}
            </button>
          ))}
        </div>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">{tab === 'running' ? t('jobs.runningTitle') : t('jobs.finishedTitle')}</h2>
          <button className="btn" type="button" onClick={() => active.reload()}>{t('app.refresh')}</button>
        </div>
        <div className="panel-body">
          <AsyncState
            loading={active.loading}
            error={active.error}
            data={active.data == null ? null : jobs}
            refreshing={active.refreshing}
            emptyText={tab === 'running' ? t('jobs.emptyRunning') : t('jobs.emptyFinished')}
          >
            {(rows) => (
              <>
                <JobTable
                  jobs={rows}
                  showActions={tab === 'running'}
                  selectable={tab === 'running'}
                  selectedIds={selectedIds}
                  onToggle={toggleSelection}
                  onStop={handleStop}
                />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size)
                    setRunningPage(1)
                    setFinishedPage(1)
                  }}
                />
              </>
            )}
          </AsyncState>
        </div>
      </section>
    </>
  )
}
