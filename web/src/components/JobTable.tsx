import { Link } from 'react-router-dom'
import type { JobSummary } from '../types/api'
import { formatTimestamp, getMetricReadWrite } from '../utils/format'
import { useI18n } from '../i18n'
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
  const { t } = useI18n()
  const rows = Array.isArray(jobs) ? jobs : []

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {selectable && <th />}
            <th>{t('jobs.colId')}</th>
            <th>{t('jobs.colName')}</th>
            <th>{t('jobs.colStatus')}</th>
            <th>{t('jobs.colCreated')}</th>
            <th>{t('jobs.colIO')}</th>
            {showActions && <th>{t('app.actions')}</th>}
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
                      {t('jobs.stop')}
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
