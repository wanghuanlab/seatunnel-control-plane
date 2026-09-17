import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { HttpClientModule } from '@angular/common/http'
import { TranslateModule } from '@ngx-translate/core'
import { NZ_ICONS, NzIconModule } from 'ng-zorro-antd/icon'
import { IconDefinition } from '@ant-design/icons-angular'
import * as AllIcons from '@ant-design/icons-angular/icons'
import { AppComponent } from './app.component'
import { AppRoutingModule } from './app-routing.module'
import { SharedModule } from './shared/shared.module'
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

const antDesignIcons = AllIcons as Record<string, IconDefinition>
const icons: IconDefinition[] = Object.keys(antDesignIcons).map((key) => antDesignIcons[key])

@NgModule({
  declarations: [
    AppComponent,
    LoginPageComponent,
    DashboardPageComponent,
    TasksPageComponent,
    TaskEditorPageComponent,
    TaskDetailPageComponent,
    JobsPageComponent,
    JobDetailPageComponent,
    PendingPageComponent,
    SubmitPageComponent,
    LogsPageComponent,
    SystemPageComponent,
    ToolsPageComponent,
    SettingsPageComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    SharedModule,
    NzIconModule,
    TranslateModule.forRoot(),
  ],
  providers: [{ provide: NZ_ICONS, useValue: icons }],
  bootstrap: [AppComponent],
})
export class AppModule {}
