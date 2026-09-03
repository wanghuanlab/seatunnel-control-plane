import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    loaderRef.current()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((err: Error) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return {
    data,
    error,
    loading,
    reload: () => loaderRef.current().then(setData).catch((e: Error) => setError(e.message)),
  }
}

export function AsyncState<T>({
  loading,
  error,
  data,
  emptyText,
  refreshing = false,
  children,
}: {
  loading: boolean
  error: string | null
  data: T | null | undefined
  emptyText?: string
  refreshing?: boolean
  children: (data: T) => React.ReactNode
}) {
  const { t } = useI18n()
  const resolvedEmpty = emptyText ?? t('app.empty')

  if (loading && data == null) return <div className="loading">{t('app.loading')}</div>
  if (error && data == null) return <div className="error">{error}</div>
  if (data == null || (Array.isArray(data) && data.length === 0)) {
    return <div className="empty">{resolvedEmpty}</div>
  }

  return (
    <>
      {refreshing && <div className="silent-refresh-bar" aria-hidden="true" />}
      {children(data)}
    </>
  )
}
