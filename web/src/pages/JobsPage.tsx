import { ArrowsClockwise, StopCircle } from '@phosphor-icons/react'
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

  useEffect(() => {
    setSelectedIds([])
  }, [runningPage, pageSize])

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

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? jobs.map((job) => job.jobId) : [])
  }

  return (
    <div className="run-space run-jobs">
      <header className="run-page-header">
        <div>
          <span className="run-page-kicker">{t('nav.space')}</span>
          <h1 className="run-page-title">{t('jobs.title')}</h1>
          <p className="run-page-desc">{t('jobs.desc')}</p>
        </div>
        <div className="run-page-actions">
          <label className="run-refresh-control">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            {t('app.autoRefresh')}
          </label>
          {tab === 'running' && selectedIds.length > 0 && (
            <button className="btn danger" type="button" onClick={handleBatchStop}>
              <StopCircle size={16} weight="fill" />{t('jobs.batchStop', { count: selectedIds.length })}
            </button>
          )}
        </div>
      </header>

      <div className="run-tabs" role="tablist" aria-label={t('jobs.title')}>
        <button className={`run-tab${tab === 'running' ? ' active' : ''}`} type="button" role="tab" aria-selected={tab === 'running'} onClick={() => { setTab('running'); setSelectedIds([]) }}>
          {t('jobs.running')}
        </button>
        <button className={`run-tab${tab === 'finished' ? ' active' : ''}`} type="button" role="tab" aria-selected={tab === 'finished'} onClick={() => { setTab('finished'); setSelectedIds([]) }}>
          {t('jobs.finished')}
        </button>
      </div>

      {tab === 'finished' && (
        <div className="run-filter-bar" aria-label={t('jobs.finishedTitle')}>
          {FINISHED_STATES.map((state) => (
            <button
              key={state}
              className={`run-filter-chip${finishedState === state ? ' active' : ''}`}
              type="button"
              onClick={() => setFinishedState(state)}
            >
              {statusLabel(state)}
            </button>
          ))}
        </div>
      )}

      <section className="run-panel">
        <div className="run-panel-header">
          <div><span className="run-panel-kicker">{tab === 'running' ? t('jobs.running') : t('jobs.finished')}</span><h2>{tab === 'running' ? t('jobs.runningTitle') : t('jobs.finishedTitle')}</h2></div>
          <div className="run-panel-header-actions"><span className="run-panel-meta">{total} {t('app.records')}</span><button className="btn compact" type="button" onClick={() => active.reload()}><ArrowsClockwise size={16} />{t('app.refresh')}</button></div>
        </div>
        <div className="run-panel-body">
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
                  onToggleAll={toggleAll}
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
    </div>
  )
}
