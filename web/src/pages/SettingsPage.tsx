import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { settingsApi, usersApi } from '../api/authClient'
import { useAuth } from '../auth/AuthContext'
import type { AuthUser } from '../types/auth'
import { useI18n } from '../i18n'

type SettingsTab = 'seatunnel' | 'users'

export function SettingsPage() {
  const { t } = useI18n()
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
          <div className="error" style={{ padding: 16 }}>{t('settings.forbidden')}</div>
          <Link className="btn" to="/" style={{ marginTop: 12, display: 'inline-flex' }}>{t('settings.backHome')}</Link>
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
      setSeatunnelMessage(t('settings.saved', { base: saved.apiBase || '' }))
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
          <h1 className="page-title">{t('settings.title')}</h1>
          <p className="page-desc">{t('settings.desc')}</p>
        </div>
      </header>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab${tab === 'seatunnel' ? ' active' : ''}`} type="button" onClick={() => setTab('seatunnel')}>
          {t('settings.connection')}
        </button>
        <button className={`tab${tab === 'users' ? ' active' : ''}`} type="button" onClick={() => setTab('users')}>
          {t('settings.users')}
        </button>
      </div>

      {tab === 'seatunnel' && (
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">{t('settings.apiBase')}</h2>
          </div>
          <div className="panel-body">
            <form className="form-grid" onSubmit={saveSeatunnel}>
              <div className="form-row">
                <label htmlFor="apiBase">{t('settings.apiBaseUrl')}</label>
                <input
                  id="apiBase"
                  className="mono"
                  placeholder="http://127.0.0.1:8080"
                  value={apiBase}
                  onChange={(e) => setApiBase(e.target.value)}
                  required
                />
                <div className="cron-help">{t('settings.apiHelp', { base: '{base}' })}</div>
              </div>
              <div className="actions">
                <button className="btn primary" type="submit" disabled={savingSeatunnel}>
                  {savingSeatunnel ? t('settings.saving') : t('app.save')}
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
              <h2 className="panel-title">{t('settings.newUser')}</h2>
            </div>
            <div className="panel-body">
              <form className="form-grid" onSubmit={createUser} style={{ gridTemplateColumns: '1fr 1fr 160px auto' }}>
                <div className="form-row">
                  <label htmlFor="newUsername">{t('settings.username')}</label>
                  <input id="newUsername" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
                </div>
                <div className="form-row">
                  <label htmlFor="newPassword">{t('settings.initPassword')}</label>
                  <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
                <div className="form-row">
                  <label htmlFor="newRole">{t('settings.role')}</label>
                  <select id="newRole" value={newRole} onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}>
                    <option value="user">{t('settings.roleUser')}</option>
                    <option value="admin">{t('settings.roleAdmin')}</option>
                  </select>
                </div>
                <div className="form-row" style={{ alignSelf: 'end' }}>
                  <button className="btn primary" type="submit">{t('settings.create')}</button>
                </div>
              </form>
              {usersError && <div className="error" style={{ padding: 12, marginTop: 12 }}>{usersError}</div>}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">{t('settings.userList')}</h2>
              <button className="btn" type="button" onClick={() => loadUsers().catch((e) => setUsersError(String(e)))}>{t('app.refresh')}</button>
            </div>
            <div className="panel-body table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('settings.colUser')}</th>
                    <th>{t('settings.colRole')}</th>
                    <th>{t('settings.colState')}</th>
                    <th>{t('app.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => {
                    const isProtectedAdmin = item.username.toLowerCase() === 'admin'
                    return (
                    <tr key={item.id}>
                      <td>{item.username}</td>
                      <td>{item.role === 'admin' ? t('settings.roleAdmin') : t('settings.roleUser')}</td>
                      <td>{item.isEnabled ? t('app.enabled') : t('app.disabled')}</td>
                      <td>
                        <div className="actions">
                          {!isProtectedAdmin && (
                            <>
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
                                {item.role === 'admin' ? t('settings.demote') : t('settings.promote')}
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
                                {item.isEnabled ? t('settings.disable') : t('settings.enable')}
                              </button>
                            </>
                          )}
                          <button
                            className="btn"
                            type="button"
                            onClick={async () => {
                              const password = window.prompt(t('settings.resetPrompt', { name: item.username }))
                              if (!password) return
                              try {
                                await usersApi.update(item.id, { password })
                                await loadUsers()
                              } catch (error) {
                                setUsersError(String(error instanceof Error ? error.message : error))
                              }
                            }}
                          >
                            {t('settings.resetPassword')}
                          </button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
