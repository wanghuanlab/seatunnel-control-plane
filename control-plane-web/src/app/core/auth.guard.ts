import { Injectable } from '@angular/core'
import { CanActivate, Router, UrlTree } from '@angular/router'
import { AuthService } from './auth.service'

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    const started = Date.now()
    while (this.auth.loading && Date.now() - started < 8000) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    if (this.auth.user) return true
    return this.router.parseUrl('/login')
  }
}
