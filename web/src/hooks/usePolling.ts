import { useCallback, useEffect, useRef, useState } from 'react'

export function usePolling<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  intervalMs = 15000,
  enabled = true,
  options: { resetOnDeps?: boolean } = {},
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const loaderRef = useRef(loader)
  const dataRef = useRef<T | null>(null)
  const requestId = useRef(0)
  const resetOnDeps = options.resetOnDeps !== false

  loaderRef.current = loader
  dataRef.current = data

  const load = useCallback(async (mode: 'replace' | 'silent') => {
    const id = ++requestId.current
    const keepCurrent = mode === 'silent' && dataRef.current != null
    if (keepCurrent) setRefreshing(true)
    else setLoading(true)

    try {
      const result = await loaderRef.current()
      if (id !== requestId.current) return
      setData(result)
      setError(null)
    } catch (err) {
      if (id !== requestId.current) return
      if (!keepCurrent) setError((err as Error).message)
    } finally {
      if (id === requestId.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    if (resetOnDeps) {
      dataRef.current = null
      setData(null)
      setError(null)
      void load('replace')
    } else {
      void load(dataRef.current != null ? 'silent' : 'replace')
    }
    return () => {
      requestId.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return undefined
    const timer = window.setInterval(() => {
      void load('silent')
    }, intervalMs)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, load, ...deps])

  return {
    data,
    error,
    loading,
    refreshing,
    reload: () => load(dataRef.current != null ? 'silent' : 'replace'),
  }
}
