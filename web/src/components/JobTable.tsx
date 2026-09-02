import { Link } from 'react-router-dom'
import type { JobSummary } from '../types/api'
import { formatTimestamp, getMetricReadWrite } from '../utils/format'
import { StatusBadge } from './StatusBadge'

export function JobTable({
  jobs,
  showActions = false,
  selectable = false,
  selectedIds = [],
  onToggle,
  onStop,
}: {
  jobs: JobSummary[]
  showActions?: boolean
  selectable?: boolean
  selectedIds?: string[]
  onToggle?: (jobId: string, checked: boolean) => void
  onStop?: (jobId: string) => void
}) {
  const rows = Array.isArray(jobs) ? jobs : []

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {selectable && <th />}
            <th>Job ID</th>
            <th>名称</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>读取/写入</th>
            {showActions && <th>操作</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((job) => {
            const { read, write } = getMetricReadWrite(job.metrics as Record<string, unknown> | string | undefined)
            const checked = selectedIds.includes(job.jobId)
            return (
              <tr key={job.jobId}>
                {selectable && (
                  <td>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onToggle?.(job.jobId, e.target.checked)}
                    />
                  </td>
                )}
                <td className="mono">
                  <Link to={`/jobs/${job.jobId}`}>{job.jobId}</Link>
                </td>
                <td>{job.jobName || '—'}</td>
                <td><StatusBadge status={job.jobStatus} /></td>
                <td>{formatTimestamp(job.createTime)}</td>
                <td className="mono">{read} / {write}</td>
                {showActions && (
                  <td>
                    <button className="btn danger" type="button" onClick={() => onStop?.(job.jobId)}>
                      停止
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
