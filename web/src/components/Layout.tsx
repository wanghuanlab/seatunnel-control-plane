import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import {
  CaretDown,
  ChartLineUp,
  Command,
  FileText,
  GearSix,
  Key,
  ListChecks,
  MagnifyingGlass,
  Moon,
  PaperPlaneTilt,
  Pulse,
  Plus,
  Queue,
  SignOut,
  SlidersHorizontal,
  Toolbox,
  Sun,
} from '@phosphor-icons/react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LanguageSwitch } from './LanguageSwitch'
import { useI18n } from '../i18n'
import { localizeError } from '../i18n/errors'

export function Layout({ children }: { children: ReactNode }) {
  const { user, isAdmin, health, logout, changePassword } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showCommand, setShowCommand] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (
    window.localStorage.getItem('control-plane-theme') === 'dark' ? 'dark' : 'light'
  ))

  useEffect(() => {
    if (!showPasswordModal) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePasswordModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showPasswordModal])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('control-plane-theme', theme)
  }, [theme])

  const onLogout = async () => {
    setShowAccountMenu(false)
    await logout()
    navigate('/login', { replace: true })
  }

  const closePasswordModal = () => {
    setShowPasswordModal(false)
    setOldPassword('')
    setNewPassword('')
    setPasswordMessage(null)
    setPasswordError(null)
  }

  const onChangePassword = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordMessage(null)
    setPasswordError(null)
    try {
      await changePassword(oldPassword, newPassword)
      setPasswordMessage(t('password.updated'))
      setOldPassword('')
      setNewPassword('')
    } catch (error) {
      setPasswordError(localizeError(String(error instanceof Error ? error.message : error), t))
    }
  }

  const navItems = [
    { to: '/', label: t('nav.workbench'), icon: Pulse },
    { to: '/tasks', label: t('nav.tasks'), icon: ListChecks },
    { to: '/jobs', label: t('nav.jobs'), icon: ChartLineUp },
    { to: '/pending', label: t('nav.pending'), icon: Queue },
  ]
  const operationsItems = [
    { to: '/submit', label: t('nav.submit'), icon: PaperPlaneTilt },
    { to: '/logs', label: t('nav.logs'), icon: FileText },
    { to: '/system', label: t('nav.system'), icon: SlidersHorizontal },
    { to: '/tools', label: t('nav.tools'), icon: Toolbox },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-lockup">
            <div className="brand-orbit"><Pulse size={18} weight="bold" /></div>
            <div>
              <div className="brand-title">{t('app.name')}</div>
              <div className="brand-sub">{t('app.subtitle')}</div>
            </div>
          </div>
          <div className="brand-mark">{t('app.mark')}</div>
        </div>
        <nav className="nav-list" onClick={() => {
          setShowCommand(false)
          setShowAccountMenu(false)
        }}>
          <div className="nav-section-label">{t('nav.space')}</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <item.icon size={18} weight="duotone" />
              {item.label}
            </NavLink>
          ))}
          <div className="nav-section-label nav-section-spaced">{t('nav.operations')}</div>
          {operationsItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <item.icon size={18} weight="duotone" />
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <GearSix size={18} weight="duotone" />
              {t('nav.settings')}
            </NavLink>
          )}
        </nav>

      </aside>
      <main className="main">
        <header className="app-topbar">
          <button className="command-trigger" type="button" onClick={() => {
            setShowCommand((value) => !value)
            setShowAccountMenu(false)
          }}>
            <MagnifyingGlass size={17} />
            <span>{t('topbar.search')}</span>
            <kbd><Command size={12} /> K</kbd>
          </button>
          <div className="topbar-actions">
            <div className="connection-indicator" title={health?.message}>
              <span className={`connection-dot${health?.reachable ? ' live' : ''}`} />
              {health?.reachable ? t('topbar.connected') : t('topbar.unconfigured')}
            </div>
            <Link className="btn primary compact" to="/submit" onClick={() => {
              setShowCommand(false)
              setShowAccountMenu(false)
            }}><Plus size={16} weight="bold" /> {t('topbar.submit')}</Link>
            <LanguageSwitch compact />
            <button
              className="icon-button theme-toggle"
              type="button"
              onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? t('topbar.themeToLight') : t('topbar.themeToDark')}
              title={theme === 'dark' ? t('topbar.themeToLight') : t('topbar.themeToDark')}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="account-control">
              <button
                className="account-trigger"
                type="button"
                aria-expanded={showAccountMenu}
                aria-haspopup="menu"
                onClick={() => {
                  setShowAccountMenu((value) => !value)
                  setShowCommand(false)
                }}
              >
                <span className="account-avatar">{user?.username.slice(0, 1).toUpperCase()}</span>
                <span className="account-identity">
                  <strong>{user?.username}</strong>
                  <small>{user?.role === 'admin' ? t('topbar.admin') : t('topbar.operator')}</small>
                </span>
                <CaretDown size={14} weight="bold" />
              </button>
              {showAccountMenu && (
                <div className="account-menu" role="menu">
                  <div className="account-menu-summary">
                    <span className="account-avatar">{user?.username.slice(0, 1).toUpperCase()}</span>
                    <span><strong>{user?.username}</strong><small>{user?.role === 'admin' ? t('topbar.admin') : t('topbar.operator')}</small></span>
                  </div>
                  <div className="account-menu-actions">
                    <button type="button" role="menuitem" onClick={() => {
                      setShowAccountMenu(false)
                      setShowPasswordModal(true)
                    }}><Key size={16} /> {t('topbar.changePassword')}</button>
                    <button type="button" role="menuitem" className="account-logout" onClick={onLogout}><SignOut size={16} /> {t('topbar.logout')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {showCommand && (
            <div className="command-menu">
              <div className="command-menu-label">{t('topbar.quickActions')}</div>
              <Link to="/submit" onClick={() => setShowCommand(false)}><PaperPlaneTilt size={17} /> {t('topbar.submitNew')}</Link>
              <Link to="/tasks/new" onClick={() => setShowCommand(false)}><Plus size={17} /> {t('topbar.createTask')}</Link>
              <Link to="/pending" onClick={() => setShowCommand(false)}><Queue size={17} /> {t('topbar.pendingDiag')}</Link>
            </div>
          )}
        </header>
        {health && (!health.configured || !health.reachable) && (
          <div className="config-banner">
            <div>{health.message}</div>
            {isAdmin ? (
              <Link className="btn" to="/settings">{t('topbar.goSettings')}</Link>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('topbar.contactAdmin')}</span>
            )}
          </div>
        )}
        {children}
      </main>
      {showPasswordModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closePasswordModal}>
          <section className="password-modal" role="dialog" aria-modal="true" aria-labelledby="password-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="password-modal-header">
              <div>
                <span className="modal-kicker">{t('password.kicker')}</span>
                <h2 id="password-modal-title">{t('password.title')}</h2>
                <p>{t('password.hint')}</p>
              </div>
              <button className="icon-button" type="button" aria-label={t('password.closeAria')} onClick={closePasswordModal}>×</button>
            </div>
            <form className="password-form" onSubmit={onChangePassword}>
              <div className="form-row">
                <label htmlFor="oldPassword">{t('password.current')}</label>
                <input id="oldPassword" autoComplete="current-password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
              </div>
              <div className="form-row">
                <label htmlFor="newPassword">{t('password.next')}</label>
                <input id="newPassword" autoComplete="new-password" type="password" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                <span className="password-hint">{t('password.minLength')}</span>
              </div>
              {passwordMessage && <div className="password-feedback success">{passwordMessage}</div>}
              {passwordError && <div className="password-feedback error">{passwordError}</div>}
              <div className="password-modal-actions">
                <button className="btn ghost" type="button" onClick={closePasswordModal}>{t('app.cancel')}</button>
                <button className="btn primary" type="submit">{t('password.save')}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
