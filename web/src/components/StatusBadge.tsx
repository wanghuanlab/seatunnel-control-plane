import { jobStatusTone } from '../utils/format'
import { useI18n } from '../i18n'

export function StatusBadge({ status }: { status?: string }) {
  const { statusLabel } = useI18n()
  const tone = jobStatusTone(status)
  return <span className={`badge ${tone}`}>{statusLabel(status)}</span>
}
