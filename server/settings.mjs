import { dbGet, dbRun, nowIso } from './db.mjs'

const SETTING_SEATUNNEL_API_BASE = 'seatunnel_api_base'
const SETTING_SEATUNNEL_LAST_PROBE = 'seatunnel_last_probe'

let cachedBase = undefined

export function invalidateSeatunnelBaseCache() {
  cachedBase = undefined
}

export function normalizeSeatunnelBase(input) {
  const raw = String(input || '').trim().replace(/\/+$/, '')
  if (!raw) throw new Error('请填写 SeaTunnel API Base')
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('API Base 不是合法 URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('API Base 仅支持 http:// 或 https://')
  }
  if (url.username || url.password) {
    throw new Error('API Base 请勿包含用户名密码')
  }
  // Keep origin only (host + optional non-root path without trailing slash)
  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '')
  return `${url.protocol}//${url.host}${path}`
}

export function getSeatunnelBase() {
  if (cachedBase !== undefined) return cachedBase
  const row = dbGet('SELECT value FROM app_settings WHERE key = ?', [SETTING_SEATUNNEL_API_BASE])
  cachedBase = row?.value ? String(row.value) : null
  return cachedBase
}

export function getSetting(key) {
  const row = dbGet('SELECT value, updated_at FROM app_settings WHERE key = ?', [key])
  return row || null
}

function upsertSetting(key, value) {
  const ts = nowIso()
  dbRun(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, ts],
  )
}

export function getLastProbe() {
  const row = getSetting(SETTING_SEATUNNEL_LAST_PROBE)
  if (!row?.value) return null
  try {
    return JSON.parse(row.value)
  } catch {
    return null
  }
}

export async function probeSeatunnelBase(base) {
  const target = `${base}/overview`
  const started = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(target, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    const ok = response.ok
    const text = await response.text()
    let detail = `HTTP ${response.status}`
    if (!ok) detail = text.slice(0, 200) || detail
    return {
      ok,
      status: response.status,
      detail,
      checkedAt: nowIso(),
      latencyMs: Date.now() - started,
      base,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail: String(error.message || error),
      checkedAt: nowIso(),
      latencyMs: Date.now() - started,
      base,
    }
  }
}

export async function getSeatunnelSettings() {
  const base = getSeatunnelBase()
  return {
    apiBase: base,
    configured: Boolean(base),
    lastProbe: getLastProbe(),
    updatedAt: getSetting(SETTING_SEATUNNEL_API_BASE)?.updated_at || null,
  }
}

export async function getSettingsHealth() {
  const settings = await getSeatunnelSettings()
  let probe = settings.lastProbe
  if (settings.apiBase) {
    probe = await probeSeatunnelBase(settings.apiBase)
    upsertSetting(SETTING_SEATUNNEL_LAST_PROBE, JSON.stringify(probe))
  }
  return {
    apiBase: settings.apiBase,
    configured: settings.configured,
    reachable: Boolean(probe?.ok),
    lastProbe: probe,
    message: !settings.configured
      ? '尚未配置 SeaTunnel API Base'
      : probe?.ok
        ? 'SeaTunnel API 连接正常'
        : `SeaTunnel API 不可用：${probe?.detail || '未知错误'}`,
  }
}

export async function saveSeatunnelBase(apiBase) {
  const normalized = normalizeSeatunnelBase(apiBase)
  const probe = await probeSeatunnelBase(normalized)
  if (!probe.ok) {
    const error = new Error(`连通性检查失败：${probe.detail}`)
    error.probe = probe
    throw error
  }
  upsertSetting(SETTING_SEATUNNEL_API_BASE, normalized)
  upsertSetting(SETTING_SEATUNNEL_LAST_PROBE, JSON.stringify(probe))
  invalidateSeatunnelBaseCache()
  return {
    apiBase: normalized,
    configured: true,
    lastProbe: probe,
    updatedAt: nowIso(),
  }
}
