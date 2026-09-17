import { Injectable } from '@angular/core'
import { en } from '../i18n/en'
import { zh } from '../i18n/zh'

export type Locale = 'en' | 'zh'
export type Translate = (key: string, vars?: Record<string, string | number>) => string

const STORAGE_KEY = 'control-plane-locale'
const dictionaries = { en, zh } as const

function lookup(source: unknown, path: string): string | undefined {
  if (source == null) return undefined
  if (typeof source === 'string') return undefined
  if (typeof source !== 'object') return undefined
  const record = source as Record<string, unknown>
  if (typeof record[path] === 'string') return record[path] as string

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

@Injectable({ providedIn: 'root' })
export class I18nService {
  locale: Locale = readLocale()

  constructor() {
    this.applyLocale()
  }

  t: Translate = (key, vars) => {
    const dict = dictionaries[this.locale]
    const value = lookup(dict, key) ?? lookup(en, key) ?? key
    return interpolate(value, vars)
  }

  statusLabel = (status?: string) => {
    const normalized = (status || 'UNKNOWN').toUpperCase()
    const translated = this.t(`status.${normalized}`)
    return translated.startsWith('status.') ? (status || normalized) : translated
  }

  setLocale(locale: Locale) {
    this.locale = locale
    this.applyLocale()
  }

  private applyLocale() {
    document.documentElement.lang = this.locale === 'zh' ? 'zh-CN' : 'en'
    document.documentElement.dataset.locale = this.locale
    window.localStorage.setItem(STORAGE_KEY, this.locale)
    document.title = this.locale === 'zh' ? 'SeaTunnel 控制平面' : 'SeaTunnel Control Plane'
  }
}
