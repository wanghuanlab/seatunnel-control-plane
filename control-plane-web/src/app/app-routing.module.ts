import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { AuthGuard } from './core/auth.guard'
import { AppShellComponent } from './shared/app-shell.component'
import { DashboardPageComponent } from './pages/dashboard-page.component'
import { JobDetailPageComponent } from './pages/job-detail-page.component'
import { JobsPageComponent } from './pages/jobs-page.component'
import { LoginPageComponent } from './pages/login-page.component'
import { LogsPageComponent } from './pages/logs-page.component'
import { PendingPageComponent } from './pages/pending-page.component'
import { SettingsPageComponent } from './pages/settings-page.component'
import { SubmitPageComponent } from './pages/submit-page.component'
import { SystemPageComponent } from './pages/system-page.component'
import { TaskDetailPageComponent } from './pages/task-detail-page.component'
import { TaskEditorPageComponent } from './pages/task-editor-page.component'
import { TasksPageComponent } from './pages/tasks-page.component'
import { ToolsPageComponent } from './pages/tools-page.component'

const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: DashboardPageComponent },
      { path: 'tasks', component: TasksPageComponent },
      { path: 'tasks/new', component: TaskEditorPageComponent },
      { path: 'tasks/:id/edit', component: TaskEditorPageComponent },
      { path: 'tasks/:id', component: TaskDetailPageComponent },
      { path: 'jobs', component: JobsPageComponent },
      { path: 'jobs/:jobId', component: JobDetailPageComponent },
      { path: 'pending', component: PendingPageComponent },
      { path: 'submit', component: SubmitPageComponent },
      { path: 'logs', component: LogsPageComponent },
      { path: 'system', component: SystemPageComponent },
      { path: 'tools', component: ToolsPageComponent },
      { path: 'settings', component: SettingsPageComponent },
      { path: '**', redirectTo: '' },
    ],
  },
]

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
