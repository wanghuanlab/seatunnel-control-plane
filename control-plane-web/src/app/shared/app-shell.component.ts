import { Component, HostListener, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService } from '../core/auth.service'
import { I18nService } from '../core/i18n.service'
import { localizeError } from '../i18n/errors'

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent implements OnInit {
  showPasswordModal = false
  showAccountMenu = false
  showCommand = false
  oldPassword = ''
  newPassword = ''
  passwordMessage: string | null = null
  passwordError: string | null = null
  theme: 'dark' | 'light' = window.localStorage.getItem('control-plane-theme') === 'dark' ? 'dark' : 'light'

  navItems = [
    { to: '/', labelKey: 'nav.workbench', icon: 'dashboard', exact: true },
    { to: '/tasks', labelKey: 'nav.tasks', icon: 'unordered-list', exact: false },
    { to: '/jobs', labelKey: 'nav.jobs', icon: 'line-chart', exact: false },
    { to: '/pending', labelKey: 'nav.pending', icon: 'cluster', exact: false },
  ]

  operationsItems = [
    { to: '/submit', labelKey: 'nav.submit', icon: 'send', exact: false },
    { to: '/logs', labelKey: 'nav.logs', icon: 'file-text', exact: false },
    { to: '/system', labelKey: 'nav.system', icon: 'sliders', exact: false },
    { to: '/tools', labelKey: 'nav.tools', icon: 'tool', exact: false },
  ]

  constructor(public auth: AuthService, public i18n: I18nService, private router: Router) {}

  ngOnInit() {
    this.applyTheme()
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.showPasswordModal && event.key === 'Escape') this.closePasswordModal()
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark'
    this.applyTheme()
  }

  async onLogout() {
    this.showAccountMenu = false
    await this.auth.logout()
    await this.router.navigate(['/login'], { replaceUrl: true })
  }

  closePasswordModal() {
    this.showPasswordModal = false
    this.oldPassword = ''
    this.newPassword = ''
    this.passwordMessage = null
    this.passwordError = null
  }

  async onChangePassword(event: Event) {
    event.preventDefault()
    this.passwordMessage = null
    this.passwordError = null
    try {
      await this.auth.changePassword(this.oldPassword, this.newPassword)
      this.passwordMessage = this.i18n.t('password.updated')
      this.oldPassword = ''
      this.newPassword = ''
    } catch (error) {
      this.passwordError = localizeError(String(error instanceof Error ? error.message : error), this.i18n.t)
    }
  }

  initial() {
    return (this.auth.user?.username || '?').slice(0, 1).toUpperCase()
  }

  private applyTheme() {
    document.documentElement.dataset.theme = this.theme
    window.localStorage.setItem('control-plane-theme', this.theme)
  }
}
