import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { authApi, settingsApi } from '../api/authClient'
import { setUnauthorizedHandler } from '../api/http'
import type { AuthUser, SettingsHealth } from '../types/auth'

@Injectable({ providedIn: 'root' })
export class AuthService {
  user: AuthUser | null = null
  loading = true
  health: SettingsHealth | null = null

  constructor(private router: Router) {
    setUnauthorizedHandler(() => {
      this.user = null
      this.health = null
      if (this.router.url !== '/login') {
        window.location.assign('/login')
      }
    })
    authApi
      .me()
      .then(async (result) => {
        this.user = result.user
        await this.refreshHealth()
      })
      .catch(() => {
        this.user = null
      })
      .finally(() => {
        this.loading = false
      })
  }

  get isAdmin() {
    return this.user?.role === 'admin'
  }

  async refreshHealth() {
    try {
      this.health = await settingsApi.health()
    } catch {
      this.health = null
    }
  }

  async refreshMe() {
    const result = await authApi.me()
    this.user = result.user
    await this.refreshHealth()
  }

  async login(username: string, password: string) {
    const result = await authApi.login(username, password)
    this.user = result.user
    await this.refreshHealth()
  }

  async logout() {
    try {
      await authApi.logout()
    } finally {
      this.user = null
      this.health = null
    }
  }

  async changePassword(oldPassword: string, newPassword: string) {
    await authApi.changePassword(oldPassword, newPassword)
  }
}
