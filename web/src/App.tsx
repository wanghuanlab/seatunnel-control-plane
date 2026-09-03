import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { JobDetailPage } from './pages/JobDetailPage'
import { JobsPage } from './pages/JobsPage'
import { LogsPage } from './pages/LogsPage'
import { PendingPage } from './pages/PendingPage'
import { SubmitPage } from './pages/SubmitPage'
import { SystemPage } from './pages/SystemPage'
import { TaskDetailPage } from './pages/TaskDetailPage'
import { TaskEditorPage } from './pages/TaskEditorPage'
import { TasksPage } from './pages/TasksPage'
import { ToolsPage } from './pages/ToolsPage'

export default function App() {
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
