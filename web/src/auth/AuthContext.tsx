import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, settingsApi } from '../api/authClient'
import { setUnauthorizedHandler } from '../api/http'
import type { AuthUser, SettingsHealth } from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  health: SettingsHealth | null
  isAdmin: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
  refreshHealth: () => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<SettingsHealth | null>(null)

  const refreshHealth = async () => {
    try {
      const next = await settingsApi.health()
      setHealth(next)
    } catch {
      setHealth(null)
    }
  }

  const refreshMe = async () => {
    const result = await authApi.me()
    setUser(result.user)
    await refreshHealth()
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setHealth(null)
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    })
    authApi
      .me()
      .then(async (result) => {
        setUser(result.user)
        await refreshHealth()
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => setLoading(false))

    return () => setUnauthorizedHandler(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      health,
      isAdmin: user?.role === 'admin',
      login: async (username, password) => {
        const result = await authApi.login(username, password)
        setUser(result.user)
        await refreshHealth()
      },
      logout: async () => {
        try {
          await authApi.logout()
        } finally {
          setUser(null)
          setHealth(null)
        }
      },
      refreshMe,
      refreshHealth,
      changePassword: async (oldPassword, newPassword) => {
        await authApi.changePassword(oldPassword, newPassword)
      },
    }),
    [user, loading, health],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
