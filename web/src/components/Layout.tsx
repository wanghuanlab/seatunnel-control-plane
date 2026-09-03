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

const NAV_ITEMS = [
  { to: '/', label: '工作台', icon: Pulse },
  { to: '/tasks', label: '任务资产', icon: ListChecks },
  { to: '/jobs', label: '作业运行', icon: ChartLineUp },
  { to: '/pending', label: '运行队列', icon: Queue },
]

const OPERATIONS_ITEMS = [
  { to: '/submit', label: '提交作业', icon: PaperPlaneTilt },
  { to: '/logs', label: '日志中心', icon: FileText },
  { to: '/system', label: '资源监控', icon: SlidersHorizontal },
  { to: '/tools', label: '运维工具', icon: Toolbox },
]

export function Layout({ children }: { children: ReactNode }) {
  const { user, isAdmin, health, logout, changePassword } = useAuth()
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
      setPasswordMessage('密码已更新')
      setOldPassword('')
      setNewPassword('')
    } catch (error) {
      setPasswordError(String(error instanceof Error ? error.message : error))
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-lockup">
            <div className="brand-orbit"><Pulse size={18} weight="bold" /></div>
            <div>
              <div className="brand-title">SeaTunnel</div>
              <div className="brand-sub">Control Plane</div>
            </div>
          </div>
          <div className="brand-mark">ZETA · REST API V2</div>
        </div>
        <nav className="nav-list" onClick={() => {
          setShowCommand(false)
          setShowAccountMenu(false)
        }}>
          <div className="nav-section-label">运行空间</div>
          {NAV_ITEMS.map((item) => (
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
          <div className="nav-section-label nav-section-spaced">运维与观测</div>
          {OPERATIONS_ITEMS.map((item) => (
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
              系统设置
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
            <span>搜索作业或快速操作</span>
            <kbd><Command size={12} /> K</kbd>
          </button>
          <div className="topbar-actions">
            <div className="connection-indicator" title={health?.message}>
              <span className={`connection-dot${health?.reachable ? ' live' : ''}`} />
              {health?.reachable ? '集群已连接' : '连接待配置'}
            </div>
            <Link className="btn primary compact" to="/submit" onClick={() => {
              setShowCommand(false)
              setShowAccountMenu(false)
            }}><Plus size={16} weight="bold" /> 提交作业</Link>
            <button
              className="icon-button theme-toggle"
              type="button"
              onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? '切换到明亮模式' : '切换到暗黑模式'}
              title={theme === 'dark' ? '切换到明亮模式' : '切换到暗黑模式'}
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
                  <small>{user?.role === 'admin' ? '平台管理员' : '操作用户'}</small>
                </span>
                <CaretDown size={14} weight="bold" />
              </button>
              {showAccountMenu && (
                <div className="account-menu" role="menu">
                  <div className="account-menu-summary">
                    <span className="account-avatar">{user?.username.slice(0, 1).toUpperCase()}</span>
                    <span><strong>{user?.username}</strong><small>{user?.role === 'admin' ? '平台管理员' : '操作用户'}</small></span>
                  </div>
                  <div className="account-menu-actions">
                    <button type="button" role="menuitem" onClick={() => {
                      setShowAccountMenu(false)
                      setShowPasswordModal(true)
                    }}><Key size={16} /> 修改密码</button>
                    <button type="button" role="menuitem" className="account-logout" onClick={onLogout}><SignOut size={16} /> 退出登录</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {showCommand && (
            <div className="command-menu">
              <div className="command-menu-label">快速操作</div>
              <Link to="/submit" onClick={() => setShowCommand(false)}><PaperPlaneTilt size={17} /> 提交新作业</Link>
              <Link to="/tasks/new" onClick={() => setShowCommand(false)}><Plus size={17} /> 创建任务模板</Link>
              <Link to="/pending" onClick={() => setShowCommand(false)}><Queue size={17} /> 查看 Pending 诊断</Link>
            </div>
          )}
        </header>
        {health && (!health.configured || !health.reachable) && (
          <div className="config-banner">
            <div>{health.message}</div>
            {isAdmin ? (
              <Link className="btn" to="/settings">去系统设置</Link>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>请联系管理员配置</span>
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
                <span className="modal-kicker">账户安全</span>
                <h2 id="password-modal-title">修改密码</h2>
                <p>更新后，请使用新密码重新登录。</p>
              </div>
              <button className="icon-button" type="button" aria-label="关闭修改密码弹窗" onClick={closePasswordModal}>×</button>
            </div>
            <form className="password-form" onSubmit={onChangePassword}>
              <div className="form-row">
                <label htmlFor="oldPassword">当前密码</label>
                <input id="oldPassword" autoComplete="current-password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
              </div>
              <div className="form-row">
                <label htmlFor="newPassword">新密码</label>
                <input id="newPassword" autoComplete="new-password" type="password" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                <span className="password-hint">至少 6 位字符</span>
              </div>
              {passwordMessage && <div className="password-feedback success">{passwordMessage}</div>}
              {passwordError && <div className="password-feedback error">{passwordError}</div>}
              <div className="password-modal-actions">
                <button className="btn ghost" type="button" onClick={closePasswordModal}>取消</button>
                <button className="btn primary" type="submit">保存新密码</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
