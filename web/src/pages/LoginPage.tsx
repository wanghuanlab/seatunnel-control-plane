import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, LockKey, Moon, Pulse, Sun } from '@phosphor-icons/react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import GhostFibers from '../components/GhostFibers'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
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
      setError(String(err instanceof Error ? err.message : err))
    } finally {
      setSubmitting(false)
    }
  }

  const isDark = theme === 'dark'

  return (
    <div className={`login-shell login-fibers-shell${isDark ? ' is-dark' : ''}`}>
      <div className="login-fibers" aria-hidden="true">
        <GhostFibers
          lineColor={isDark ? '#253b6e' : '#244d78'}
          glowColor={isDark ? '#5b6ee1' : '#70a9d5'}
          lightMode={!isDark}
          speed={0.14}
          scale={2.25}
          rotation={-12}
          rotationSpeed={0.08}
          layers={4}
          brightness={1.45}
          glowIntensity={1.05}
          grain={0.018}
          vignette={0.66}
          fps={30}
          dpr={1}
        />
      </div>
      <div className="login-fiber-wash" />
      <header className="login-topbar">
        <div className="login-brand-lockup">
          <span className="login-brand-orbit"><Pulse size={17} weight="bold" /></span>
          <span><strong>SeaTunnel</strong><small>CONTROL PLANE</small></span>
        </div>
        <button
          className="login-theme-toggle"
          type="button"
          onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}
          aria-label={isDark ? '切换到明亮模式' : '切换到暗黑模式'}
          title={isDark ? '切换到明亮模式' : '切换到暗黑模式'}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </header>
      <main className="login-stage">
        <section className="login-intro" aria-label="产品介绍">
          <div className="login-eyebrow"><span /> ZETA ENGINE · REST API V2</div>
          <h1>让每一次数据流动<br /><em>清晰可见。</em></h1>
          <p>连接任务资产、实时作业与集群资源，在一个运行工作台中保持对 SeaTunnel 的掌控。</p>
          <div className="login-capabilities">
            <span>任务排程</span><span>运行监测</span><span>资源诊断</span>
          </div>
        </section>
        <form className="login-card login-fiber-card" onSubmit={onSubmit}>
          <div className="login-card-kicker"><LockKey size={15} /> 安全访问</div>
          <h2>登录控制台</h2>
          <p>使用你的控制台账号继续。</p>
          <div className="form-row">
            <label htmlFor="username">用户名</label>
            <input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="form-row">
            <label htmlFor="password">密码</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="error login-error">{error}</div>}
          <button className="btn primary login-submit" type="submit" disabled={submitting || loading}>
            {submitting ? '正在验证…' : <>进入工作台 <ArrowRight size={17} weight="bold" /></>}
          </button>
          <div className="login-card-footer"><span className="login-card-status" /> 访问受会话安全保护</div>
        </form>
      </main>
    </div>
  )
}
