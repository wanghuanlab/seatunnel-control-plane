import { useState } from 'react'
import { seatunnelApi } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { usePolling } from '../hooks/usePolling'
import type { LogEntry } from '../types/api'

export function LogsPage() {
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

  const openLog = async (logName: string) => {
    const text = await seatunnelApi.getLogContent(logName)
    setContent(text)
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">日志中心</h1>
          <p className="page-desc">浏览 `/logs` 与 `/logs/:jobId` 返回的节点日志列表，并在线查看日志内容。</p>
        </div>
        <div className="actions">
          <label className="inline-check">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            自动刷新
          </label>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">日志列表</h2>
          <div className="actions">
            <input
              placeholder="按 Job ID 过滤，留空查看全部"
              value={jobId}
              onChange={(e) => setJobId(e.target.value.trim())}
            />
            <button className="btn" type="button" onClick={() => logs.reload()}>刷新</button>
          </div>
        </div>
        <div className="panel-body">
          <AsyncState loading={logs.loading} error={logs.error} data={logs.data} emptyText="暂无日志文件">
            {(entries) => (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Node</th>
                      <th>Log Name</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={`${entry.node}-${entry.logName}`}>
                        <td className="mono">{entry.node}</td>
                        <td className="mono">{entry.logName}</td>
                        <td>
                          <button className="btn" type="button" onClick={() => openLog(entry.logName)}>
                            查看
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
          <div className="panel-header"><h2 className="panel-title">日志内容</h2></div>
          <div className="panel-body">
            <pre className="mono metrics-pre">{content}</pre>
          </div>
        </section>
      )}
    </>
  )
}
