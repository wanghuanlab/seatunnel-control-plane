import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useI18n } from '../i18n'

const PAGE_SIZES = [20, 50, 100]

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}) {
  const { t } = useI18n()
  const pages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const current = Math.min(Math.max(1, page), pages)
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1
  const to = Math.min(current * pageSize, total)

  if (total === 0) return null

  return (
    <div className="pagination">
      <span className="pagination-summary">
        {t('pagination.summary', { from, to, total })}
      </span>
      <div className="pagination-controls">
        <button
          className="btn compact"
          type="button"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          <CaretLeft size={14} weight="bold" /> {t('pagination.prev')}
        </button>
        <span className="pagination-page">{t('pagination.page', { page: current, pages })}</span>
        <button
          className="btn compact"
          type="button"
          disabled={current >= pages}
          onClick={() => onPageChange(current + 1)}
        >
          {t('pagination.next')} <CaretRight size={14} weight="bold" />
        </button>
      </div>
      {onPageSizeChange && (
        <label className="pagination-size">
          <span>{t('pagination.pageSize')}</span>
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
