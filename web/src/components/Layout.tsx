import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: '集群概览' },
  { to: '/tasks', label: '任务管理' },
  { to: '/jobs', label: '作业管理' },
  { to: '/pending', label: 'Pending 队列' },
  { to: '/submit', label: '提交作业' },
  { to: '/logs', label: '日志中心' },
  { to: '/system', label: '系统监控' },
  { to: '/tools', label: '工具箱' },
]

export function Layout({ children }: { children: React.ReactNode }) {
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
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
