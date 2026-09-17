import { Component, OnInit } from '@angular/core'
import { settingsApi, usersApi } from '../api/authClient'
import { AuthService } from '../core/auth.service'
import { I18nService } from '../core/i18n.service'
import type { AuthUser } from '../types/auth'

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
})
export class SettingsPageComponent implements OnInit {
  tab: 'seatunnel' | 'users' = 'seatunnel'
  apiBase = ''
  seatunnelMessage: string | null = null
  seatunnelError: string | null = null
  savingSeatunnel = false
  users: AuthUser[] = []
  usersError: string | null = null
  newUsername = ''
  newPassword = ''
  newRole: 'admin' | 'user' = 'user'

  constructor(public auth: AuthService, public i18n: I18nService) {}

  ngOnInit() {
    if (!this.auth.isAdmin) return
    this.loadSeatunnel().catch((error) => { this.seatunnelError = String(error) })
    this.loadUsers().catch((error) => { this.usersError = String(error) })
  }

  async loadSeatunnel() {
    const data = await settingsApi.getSeatunnel()
    this.apiBase = data.apiBase || ''
  }

  async loadUsers() {
    this.users = await usersApi.list()
  }

  async refreshUsers() {
    try {
      await this.loadUsers()
    } catch (error) {
      this.usersError = String(error)
    }
  }

  async saveSeatunnel(event: Event) {
    event.preventDefault()
    this.savingSeatunnel = true
    this.seatunnelError = null
    this.seatunnelMessage = null
    try {
      const saved = await settingsApi.saveSeatunnel(this.apiBase)
      this.apiBase = saved.apiBase || ''
      this.seatunnelMessage = this.i18n.t('settings.saved', { base: saved.apiBase || '' })
      await this.auth.refreshHealth()
    } catch (error) {
      this.seatunnelError = String(error instanceof Error ? error.message : error)
    } finally {
      this.savingSeatunnel = false
    }
  }

  async createUser(event: Event) {
    event.preventDefault()
    this.usersError = null
    try {
      await usersApi.create({ username: this.newUsername, password: this.newPassword, role: this.newRole })
      this.newUsername = ''
      this.newPassword = ''
      this.newRole = 'user'
      await this.loadUsers()
    } catch (error) {
      this.usersError = String(error instanceof Error ? error.message : error)
    }
  }

  isProtectedAdmin(item: AuthUser) {
    return item.username.toLowerCase() === 'admin'
  }

  async toggleRole(item: AuthUser) {
    try {
      await usersApi.update(item.id, { role: item.role === 'admin' ? 'user' : 'admin' })
      await this.loadUsers()
    } catch (error) {
      this.usersError = String(error instanceof Error ? error.message : error)
    }
  }

  async toggleEnabled(item: AuthUser) {
    try {
      await usersApi.update(item.id, { isEnabled: !item.isEnabled })
      await this.loadUsers()
    } catch (error) {
      this.usersError = String(error instanceof Error ? error.message : error)
    }
  }

  async resetPassword(item: AuthUser) {
    const password = window.prompt(this.i18n.t('settings.resetPrompt', { name: item.username }))
    if (!password) return
    try {
      await usersApi.update(item.id, { password })
      await this.loadUsers()
    } catch (error) {
      this.usersError = String(error instanceof Error ? error.message : error)
    }
  }
}
