import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { AsyncStateComponent } from './async-state.component'
import { AppShellComponent } from './app-shell.component'
import { CronEditorComponent } from './cron-editor.component'
import { DagGraphComponent } from './dag-graph.component'
import { I18nPipe } from './i18n.pipe'
import { JobTableComponent } from './job-table.component'
import { LanguageSwitchComponent } from './language-switch.component'
import { LoginFlowFieldComponent } from './login-flow-field.component'
import { PaginationComponent } from './pagination.component'
import { StatusBadgeComponent } from './status-badge.component'
import { TaskSchedulePanelComponent } from './task-schedule-panel.component'

const SHARED = [
  AsyncStateComponent,
  AppShellComponent,
  CronEditorComponent,
  DagGraphComponent,
  I18nPipe,
  JobTableComponent,
  LanguageSwitchComponent,
  LoginFlowFieldComponent,
  PaginationComponent,
  StatusBadgeComponent,
  TaskSchedulePanelComponent,
]

@NgModule({
  declarations: SHARED,
  imports: [CommonModule, FormsModule, RouterModule, NzIconModule],
  exports: [CommonModule, FormsModule, RouterModule, NzIconModule, ...SHARED],
})
export class SharedModule {}
