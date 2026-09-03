import { apiRequest } from './http'
import type { AuthUser, SeatunnelSettings, SettingsHealth } from '../types/auth'

export const authApi = {
  login: (username: string, password: string) =>
    apiRequest<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () => apiRequest<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () => apiRequest<{ user: AuthUser }>('/api/auth/me'),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiRequest<{ ok: boolean }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    }),
}

export const settingsApi = {
  health: () => apiRequest<SettingsHealth>('/api/settings/health'),

  getSeatunnel: () => apiRequest<SeatunnelSettings>('/api/settings/seatunnel'),

  saveSeatunnel: (apiBase: string) =>
    apiRequest<SeatunnelSettings>('/api/settings/seatunnel', {
      method: 'PUT',
      body: JSON.stringify({ apiBase }),
    }),
}

export const usersApi = {
  list: () => apiRequest<AuthUser[]>('/api/users'),

  create: (body: { username: string; password: string; role?: string; isEnabled?: boolean }) =>
    apiRequest<AuthUser>('/api/users', { method: 'POST', body: JSON.stringify(body) }),

  update: (
    id: number,
    body: { role?: string; isEnabled?: boolean; password?: string },
  ) => apiRequest<AuthUser>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
}
