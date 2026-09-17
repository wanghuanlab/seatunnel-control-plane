import { Component, DoCheck, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService } from '../core/auth.service'
import { I18nService } from '../core/i18n.service'
import { localizeError } from '../i18n/errors'

const GITHUB_REPO_URL = 'https://github.com/wanghuanlab/seatunnel-control-plane'

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent implements OnInit, DoCheck {
  githubUrl = GITHUB_REPO_URL
  username = ''
  password = ''
  error: string | null = null
  submitting = false
  theme: 'dark' | 'light' = window.localStorage.getItem('control-plane-theme') === 'dark' ? 'dark' : 'light'
  private redirected = false

  constructor(public auth: AuthService, public i18n: I18nService, private router: Router) {}

  ngOnInit() {
    this.applyTheme()
  }

  ngDoCheck() {
    if (!this.redirected && !this.auth.loading && this.auth.user) {
      this.redirected = true
      void this.router.navigate(['/'], { replaceUrl: true })
    }
  }

  get isDark() {
    return this.theme === 'dark'
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark'
    this.applyTheme()
  }

  async onSubmit(event: Event) {
    event.preventDefault()
    this.submitting = true
    this.error = null
    try {
      await this.auth.login(this.username.trim(), this.password)
      await this.router.navigate(['/'], { replaceUrl: true })
    } catch (err) {
      this.error = localizeError(String(err instanceof Error ? err.message : err), this.i18n.t)
    } finally {
      this.submitting = false
    }
  }

  private applyTheme() {
    document.documentElement.dataset.theme = this.theme
    window.localStorage.setItem('control-plane-theme', this.theme)
  }
}
