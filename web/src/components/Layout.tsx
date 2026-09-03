import { FormEvent, useState, type ReactNode } from 'react'
import {
  CaretDown,
  ChartLineUp,
  Command,
  FileText,
  GearSix,
  ListChecks,
  MagnifyingGlass,
  PaperPlaneTilt,
  Pulse,
  Plus,
  Queue,
  SlidersHorizontal,
  Toolbox,
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
  const [showPassword, setShowPassword] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showCommand, setShowCommand] = useState(false)

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
          <div className="brand-lockup">
            <div className="brand-orbit"><Pulse size={18} weight="bold" /></div>
            <div>
              <div className="brand-title">SeaTunnel</div>
              <div className="brand-sub">Control Plane</div>
            </div>
          </div>
          <div className="brand-mark">ZETA · REST API V2</div>
        </div>
        <nav className="nav-list" onClick={() => setShowCommand(false)}>
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

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{user?.username.slice(0, 1).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.username}</div>
            <div className="sidebar-user-role">{user?.role === 'admin' ? '平台管理员' : '操作用户'}</div>
          </div>
          <CaretDown className="sidebar-user-caret" size={16} />
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
        <header className="app-topbar">
          <button className="command-trigger" type="button" onClick={() => setShowCommand((value) => !value)}>
            <MagnifyingGlass size={17} />
            <span>搜索作业或快速操作</span>
            <kbd><Command size={12} /> K</kbd>
          </button>
          <div className="topbar-actions">
            <div className="connection-indicator" title={health?.message}>
              <span className={`connection-dot${health?.reachable ? ' live' : ''}`} />
              {health?.reachable ? '集群已连接' : '连接待配置'}
            </div>
            <Link className="btn primary compact" to="/submit" onClick={() => setShowCommand(false)}><Plus size={16} weight="bold" /> 提交作业</Link>
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
    </div>
  )
}
