import { FormEvent, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: '总览' },
  { to: '/tasks', label: '任务管理' },
  { to: '/jobs', label: '作业管理' },
  { to: '/pending', label: 'Pending 队列' },
  { to: '/submit', label: '提交作业' },
  { to: '/logs', label: '日志中心' },
  { to: '/system', label: '系统监控' },
  { to: '/tools', label: '工具箱' },
]

export function Layout({ children }: { children: ReactNode }) {
  const { user, isAdmin, health, logout, changePassword } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
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
          <div className="brand-mark">EDP Console</div>
          <div className="brand-title">SeaTunnel</div>
          <div className="brand-sub">Zeta REST API V2 控制台</div>
        </div>
        <nav className="nav-list">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              系统设置
            </NavLink>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-name">{user?.username}</div>
          <div className="sidebar-user-role">{user?.role === 'admin' ? '管理员' : '普通用户'}</div>
          <div className="actions" style={{ marginTop: 10 }}>
            <button className="btn" type="button" onClick={() => setShowPassword((v) => !v)}>
              修改密码
            </button>
            <button className="btn" type="button" onClick={onLogout}>退出</button>
          </div>
          {showPassword && (
            <form className="form-grid" style={{ marginTop: 12 }} onSubmit={onChangePassword}>
              <div className="form-row">
                <label htmlFor="oldPassword">当前密码</label>
                <input id="oldPassword" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
              </div>
              <div className="form-row">
                <label htmlFor="newPasswordSide">新密码</label>
                <input id="newPasswordSide" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <button className="btn primary" type="submit">保存密码</button>
              {passwordMessage && <div style={{ fontSize: 12, color: 'var(--success)' }}>{passwordMessage}</div>}
              {passwordError && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{passwordError}</div>}
            </form>
          )}
        </div>
      </aside>
      <main className="main">
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
    </div>
  )
}
