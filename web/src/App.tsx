import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { useI18n } from './i18n'
import { DashboardPage } from './pages/DashboardPage'
import { JobDetailPage } from './pages/JobDetailPage'
import { JobsPage } from './pages/JobsPage'
import { LoginPage } from './pages/LoginPage'
import { LogsPage } from './pages/LogsPage'
import { PendingPage } from './pages/PendingPage'
import { SettingsPage } from './pages/SettingsPage'
import { SubmitPage } from './pages/SubmitPage'
import { SystemPage } from './pages/SystemPage'
import { TaskDetailPage } from './pages/TaskDetailPage'
import { TaskEditorPage } from './pages/TaskEditorPage'
import { TasksPage } from './pages/TasksPage'
import { ToolsPage } from './pages/ToolsPage'

function ProtectedApp() {
  const { user, loading } = useAuth()
  const { t } = useI18n()

  if (loading) {
    return <div className="login-shell"><div className="loading">{t('app.loading')}</div></div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/new" element={<TaskEditorPage />} />
        <Route path="/tasks/:id/edit" element={<TaskEditorPage />} />
        <Route path="/tasks/:id" element={<TaskDetailPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        <Route path="/pending" element={<PendingPage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/system" element={<SystemPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  )
}
