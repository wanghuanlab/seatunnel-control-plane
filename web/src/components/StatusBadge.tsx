import { jobStatusTone } from '../utils/format'

export function StatusBadge({ status }: { status?: string }) {
  const tone = jobStatusTone(status)
  return <span className={`badge ${tone}`}>{status || 'UNKNOWN'}</span>
}
