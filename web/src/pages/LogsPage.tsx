import { useState } from 'react'
import { seatunnelApi } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { usePolling } from '../hooks/usePolling'
import { useI18n } from '../i18n'
import type { LogEntry } from '../types/api'

export function LogsPage() {
  const { t } = useI18n()
  const [jobIdInput, setJobIdInput] = useState('')
  const [jobId, setJobId] = useState('')
  const [content, setContent] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const logs = usePolling(
    async () => {
      const result = await seatunnelApi.getLogs(jobId || undefined, 'json')
      return Array.isArray(result) ? (result as LogEntry[]) : []
    },
    [jobId],
    15000,
    autoRefresh,
  )

  const applyFilter = () => {
    const next = jobIdInput.trim()
    if (next === jobId) logs.reload()
    else setJobId(next)
  }

  const openLog = async (logName: string) => {
    const text = await seatunnelApi.getLogContent(logName)
    setContent(text)
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('logs.title')}</h1>
          <p className="page-desc">{t('logs.desc')}</p>
        </div>
        <div className="actions">
          <label className="inline-check">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            {t('app.autoRefresh')}
          </label>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">{t('logs.list')}</h2>
          <div className="actions">
            <input
              placeholder={t('logs.filterPh')}
              value={jobIdInput}
              onChange={(e) => setJobIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilter()
              }}
            />
            <button className="btn" type="button" onClick={applyFilter}>{t('app.refresh')}</button>
          </div>
        </div>
        <div className="panel-body">
          <AsyncState loading={logs.loading} error={logs.error} data={logs.data} refreshing={logs.refreshing} emptyText={t('logs.empty')}>
            {(entries) => (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('logs.colNode')}</th>
                      <th>{t('logs.colName')}</th>
                      <th>{t('app.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={`${entry.node}-${entry.logName}`}>
                        <td className="mono">{entry.node}</td>
                        <td className="mono">{entry.logName}</td>
                        <td>
                          <button className="btn" type="button" onClick={() => openLog(entry.logName)}>
                            {t('logs.view')}
                          </button>
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

      {content && (
        <section className="panel" style={{ marginTop: 16 }}>
          <div className="panel-header"><h2 className="panel-title">{t('logs.content')}</h2></div>
          <div className="panel-body">
            <pre className="mono metrics-pre">{content}</pre>
          </div>
        </section>
      )}
    </>
  )
}
