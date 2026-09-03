import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, LockKey, Moon, Pulse, Sun } from '@phosphor-icons/react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { LoginFlowField } from '../components/LoginFlowField'
import { useI18n } from '../i18n'
import { localizeError } from '../i18n/errors'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (
    window.localStorage.getItem('control-plane-theme') === 'dark' ? 'dark' : 'light'
  ))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('control-plane-theme', theme)
  }, [theme])

  if (!loading && user) return <Navigate to="/" replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(username.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(localizeError(String(err instanceof Error ? err.message : err), t))
    } finally {
      setSubmitting(false)
    }
  }

  const isDark = theme === 'dark'

  return (
    <div className={`login-shell${isDark ? ' is-dark' : ''}`}>
      <LoginFlowField />
      <header className="login-topbar">
        <div className="login-brand-lockup">
          <span className="login-brand-orbit"><Pulse size={17} weight="bold" /></span>
          <span>
            <strong>{t('app.name')}</strong>
            <small>{t('app.subtitle')}</small>
          </span>
        </div>
        <div className="login-topbar-actions">
          <LanguageSwitch compact />
          <button
            className="login-theme-toggle"
            type="button"
            onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}
            aria-label={isDark ? t('topbar.themeToLight') : t('topbar.themeToDark')}
            title={isDark ? t('topbar.themeToLight') : t('topbar.themeToDark')}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>
      <main className="login-stage">
        <section className="login-hero" aria-label={t('login.introAria')}>
          <p className="login-eyebrow">{t('login.eyebrow')}</p>
          <h1>
            <span className="login-wordmark">{t('login.title')}</span>
            <small>{t('login.subtitle')}</small>
          </h1>
          <p className="login-lead">{t('login.lead')}</p>
        </section>
        <form className="login-form" onSubmit={onSubmit}>
          <div className="login-form-kicker"><LockKey size={15} /> {t('login.kicker')}</div>
          <h2>{t('login.heading')}</h2>
          <p>{t('login.description')}</p>
          <div className="form-row">
            <label htmlFor="username">{t('login.username')}</label>
            <input
              id="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="password">{t('login.password')}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error login-error">{error}</div>}
          <button className="btn primary login-submit" type="submit" disabled={submitting || loading}>
            {submitting ? t('login.submitting') : <>{t('login.submit')} <ArrowRight size={17} weight="bold" /></>}
          </button>
          <div className="login-form-footer"><span className="login-card-status" /> {t('login.footer')}</div>
        </form>
      </main>
    </div>
  )
}
