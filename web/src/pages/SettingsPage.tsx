import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { settingsApi, usersApi } from '../api/authClient'
import { useAuth } from '../auth/AuthContext'
import type { AuthUser } from '../types/auth'

type SettingsTab = 'seatunnel' | 'users'

export function SettingsPage() {
  const { isAdmin, refreshHealth } = useAuth()
  const [tab, setTab] = useState<SettingsTab>('seatunnel')
  const [apiBase, setApiBase] = useState('')
  const [seatunnelMessage, setSeatunnelMessage] = useState<string | null>(null)
  const [seatunnelError, setSeatunnelError] = useState<string | null>(null)
  const [savingSeatunnel, setSavingSeatunnel] = useState(false)
  const [users, setUsers] = useState<AuthUser[]>([])
  const [usersError, setUsersError] = useState<string | null>(null)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user')

  const loadSeatunnel = async () => {
    const data = await settingsApi.getSeatunnel()
    setApiBase(data.apiBase || '')
  }

  const loadUsers = async () => {
    setUsers(await usersApi.list())
  }

  useEffect(() => {
    if (!isAdmin) return
    loadSeatunnel().catch((error) => setSeatunnelError(String(error)))
    loadUsers().catch((error) => setUsersError(String(error)))
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <section className="panel">
        <div className="panel-body">
          <div className="error" style={{ padding: 16 }}>需要管理员权限才能访问系统设置</div>
          <Link className="btn" to="/" style={{ marginTop: 12, display: 'inline-flex' }}>返回首页</Link>
        </div>
      </section>
    )
  }

  const saveSeatunnel = async (event: FormEvent) => {
    event.preventDefault()
    setSavingSeatunnel(true)
    setSeatunnelError(null)
    setSeatunnelMessage(null)
    try {
      const saved = await settingsApi.saveSeatunnel(apiBase)
      setApiBase(saved.apiBase || '')
      setSeatunnelMessage(`已保存并验证连通：${saved.apiBase}`)
      await refreshHealth()
    } catch (error) {
      setSeatunnelError(String(error instanceof Error ? error.message : error))
    } finally {
      setSavingSeatunnel(false)
    }
  }

  const createUser = async (event: FormEvent) => {
    event.preventDefault()
    setUsersError(null)
    try {
      await usersApi.create({ username: newUsername, password: newPassword, role: newRole })
      setNewUsername('')
      setNewPassword('')
      setNewRole('user')
      await loadUsers()
    } catch (error) {
      setUsersError(String(error instanceof Error ? error.message : error))
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">系统设置</h1>
          <p className="page-desc">配置 SeaTunnel API 地址，并管理控制台用户。</p>
        </div>
      </header>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab${tab === 'seatunnel' ? ' active' : ''}`} type="button" onClick={() => setTab('seatunnel')}>
          SeaTunnel 连接
        </button>
        <button className={`tab${tab === 'users' ? ' active' : ''}`} type="button" onClick={() => setTab('users')}>
          用户管理
        </button>
      </div>

      {tab === 'seatunnel' && (
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">SeaTunnel API Base</h2>
          </div>
          <div className="panel-body">
            <form className="form-grid" onSubmit={saveSeatunnel}>
              <div className="form-row">
                <label htmlFor="apiBase">API Base URL</label>
                <input
                  id="apiBase"
                  className="mono"
                  placeholder="http://127.0.0.1:8080"
                  value={apiBase}
                  onChange={(e) => setApiBase(e.target.value)}
                  required
                />
                <div className="cron-help">保存前会请求 {'{base}/overview'} 做连通性检查，失败则拒绝保存。</div>
              </div>
              <div className="actions">
                <button className="btn primary" type="submit" disabled={savingSeatunnel}>
                  {savingSeatunnel ? '保存并检测中…' : '保存'}
                </button>
              </div>
              {seatunnelMessage && <div className="panel" style={{ padding: 12 }}>{seatunnelMessage}</div>}
              {seatunnelError && <div className="error" style={{ padding: 12 }}>{seatunnelError}</div>}
            </form>
          </div>
        </section>
      )}

      {tab === 'users' && (
        <div className="grid" style={{ gap: 16 }}>
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">新建用户</h2>
            </div>
            <div className="panel-body">
              <form className="form-grid" onSubmit={createUser} style={{ gridTemplateColumns: '1fr 1fr 160px auto' }}>
                <div className="form-row">
                  <label htmlFor="newUsername">用户名</label>
                  <input id="newUsername" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
                </div>
                <div className="form-row">
                  <label htmlFor="newPassword">初始密码</label>
                  <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
                <div className="form-row">
                  <label htmlFor="newRole">角色</label>
                  <select id="newRole" value={newRole} onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}>
                    <option value="user">普通用户</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
                <div className="form-row" style={{ alignSelf: 'end' }}>
                  <button className="btn primary" type="submit">创建</button>
                </div>
              </form>
              {usersError && <div className="error" style={{ padding: 12, marginTop: 12 }}>{usersError}</div>}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">用户列表</h2>
              <button className="btn" type="button" onClick={() => loadUsers().catch((e) => setUsersError(String(e)))}>刷新</button>
            </div>
            <div className="panel-body table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>用户名</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td>{item.username}</td>
                      <td>{item.role === 'admin' ? '管理员' : '普通用户'}</td>
                      <td>{item.isEnabled ? '启用' : '禁用'}</td>
                      <td>
                        <div className="actions">
                          <button
                            className="btn"
                            type="button"
                            onClick={async () => {
                              try {
                                await usersApi.update(item.id, {
                                  role: item.role === 'admin' ? 'user' : 'admin',
                                })
                                await loadUsers()
                              } catch (error) {
                                setUsersError(String(error instanceof Error ? error.message : error))
                              }
                            }}
                          >
                            {item.role === 'admin' ? '降为普通用户' : '升为管理员'}
                          </button>
                          <button
                            className="btn"
                            type="button"
                            onClick={async () => {
                              try {
                                await usersApi.update(item.id, { isEnabled: !item.isEnabled })
                                await loadUsers()
                              } catch (error) {
                                setUsersError(String(error instanceof Error ? error.message : error))
                              }
                            }}
                          >
                            {item.isEnabled ? '禁用' : '启用'}
                          </button>
                          <button
                            className="btn"
                            type="button"
                            onClick={async () => {
                              const password = window.prompt(`为用户 ${item.username} 设置新密码（至少 6 位）`)
                              if (!password) return
                              try {
                                await usersApi.update(item.id, { password })
                                await loadUsers()
                              } catch (error) {
                                setUsersError(String(error instanceof Error ? error.message : error))
                              }
                            }}
                          >
                            重置密码
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
