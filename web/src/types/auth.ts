export type UserRole = 'admin' | 'user'

export interface AuthUser {
  id: number
  username: string
  role: UserRole
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface SettingsHealth {
  apiBase: string | null
  configured: boolean
  reachable: boolean
  lastProbe: SeatunnelProbe | null
  message: string
}

export interface SeatunnelProbe {
  ok: boolean
  status: number
  detail: string
  checkedAt: string
  latencyMs: number
  base: string
}

export interface SeatunnelSettings {
  apiBase: string | null
  configured: boolean
  lastProbe: SeatunnelProbe | null
  updatedAt: string | null
}
