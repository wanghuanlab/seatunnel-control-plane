import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { en } from './en'
import { zh } from './zh'

export type Locale = 'en' | 'zh'
export type Translate = (key: string, vars?: Record<string, string | number>) => string

const STORAGE_KEY = 'control-plane-locale'
const dictionaries = { en, zh } as const

function lookup(source: unknown, path: string): string | undefined {
  if (source == null) return undefined
  if (typeof source === 'string') return undefined
  if (typeof source !== 'object') return undefined
  const record = source as Record<string, unknown>
  if (typeof record[path] === 'string') return record[path]

  const parts = path.split('.')
  for (let i = parts.length - 1; i >= 1; i -= 1) {
    const head = parts.slice(0, i).join('.')
    if (!(head in record)) continue
    const rest = parts.slice(i).join('.')
    const found = lookup(record[head], rest)
    if (found != null) return found
  }
  return undefined
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (
    vars[name] == null ? `{${name}}` : String(vars[name])
  ))
}

function readLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    /* ignore */
  }
  return 'en'
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translate
  statusLabel: (status?: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale)

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    document.documentElement.dataset.locale = locale
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.title = locale === 'zh' ? 'SeaTunnel 控制平面' : 'SeaTunnel Control Plane'
  }, [locale])

  const t = useCallback<Translate>((key, vars) => {
    const dict = dictionaries[locale]
    const value = lookup(dict, key) ?? lookup(en, key) ?? key
    return interpolate(value, vars)
  }, [locale])

  const statusLabel = useCallback((status?: string) => {
    const normalized = (status || 'UNKNOWN').toUpperCase()
    const translated = t(`status.${normalized}`)
    return translated.startsWith('status.') ? (status || normalized) : translated
  }, [t])

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale: setLocaleState,
    t,
    statusLabel,
  }), [locale, t, statusLabel])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
