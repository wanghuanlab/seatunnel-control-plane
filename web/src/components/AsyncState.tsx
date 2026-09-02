import { useEffect, useState } from 'react'

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    loader()
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

  return { data, error, loading, reload: () => loader().then(setData).catch((e: Error) => setError(e.message)) }
}

export function AsyncState<T>({
  loading,
  error,
  data,
  emptyText = '暂无数据',
  children,
}: {
  loading: boolean
  error: string | null
  data: T | null | undefined
  emptyText?: string
  children: (data: T) => React.ReactNode
}) {
  if (loading) return <div className="loading">加载中…</div>
  if (error) return <div className="error">{error}</div>
  if (data == null || (Array.isArray(data) && data.length === 0)) {
    return <div className="empty">{emptyText}</div>
  }
  return <>{children(data)}</>
}
