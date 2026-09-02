import { useEffect, useState } from 'react'

export function usePolling<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  intervalMs = 15000,
  enabled = true,
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const reload = async () => {
    try {
      const result = await loader()
      setData(result)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    loader()
      .then((result) => {
        if (active) {
          setData(result)
          setError(null)
        }
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
  }, [...deps, tick])

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return undefined
    const timer = window.setInterval(() => setTick((value) => value + 1), intervalMs)
    return () => window.clearInterval(timer)
  }, [enabled, intervalMs, ...deps])

  return { data, error, loading, reload: () => reload() }
}
