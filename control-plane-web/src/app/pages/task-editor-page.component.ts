import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { tasksApi } from '../api/tasksClient'
import { I18nService } from '../core/i18n.service'
import type { Task, TaskConfigFormat, TaskPayload } from '../types/tasks'

const SAMPLE_HOCON = `env {
  job.mode = "BATCH"
  parallelism = 1
}

source {
  FakeSource {
    plugin_output = "fake"
    row.num = 10
    schema = {
      fields {
        name = "string"
      }
    }
  }
}

transform {}

sink {
  Console {
    plugin_input = ["fake"]
  }
}`

@Component({
  selector: 'app-task-editor-page',
  templateUrl: './task-editor-page.component.html',
})
export class TaskEditorPageComponent implements OnInit {
  isEdit = false
  taskId = 0
  loading = false
  loadError: string | null = null
  name = ''
  description = ''
  configFormat: TaskConfigFormat = 'hocon'
  configContent = SAMPLE_HOCON
  defaultJobName = ''
  isEnabled = true
  message: string | null = null
  submitting = false

  constructor(public i18n: I18nService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')
    this.isEdit = Boolean(id)
    this.taskId = Number(id)
    if (this.isEdit) {
      this.loading = true
      tasksApi.get(this.taskId).then((task: Task) => {
        this.name = task.name
        this.description = task.description || ''
        this.configFormat = task.configFormat
        this.configContent = task.configContent
        this.defaultJobName = task.defaultJobName || ''
        this.isEnabled = task.isEnabled
      }).catch((error) => {
        this.loadError = (error as Error).message
      }).finally(() => {
        this.loading = false
      })
    }
  }

  async save() {
    this.submitting = true
    this.message = null
    const payload: TaskPayload = {
      name: this.name.trim(),
      description: this.description.trim() || undefined,
      configFormat: this.configFormat,
      configContent: this.configContent,
      defaultJobName: this.defaultJobName.trim() || undefined,
      isEnabled: this.isEnabled,
    }
    try {
      if (this.isEdit) {
        await tasksApi.update(this.taskId, payload)
        this.message = this.i18n.t('tasks.saved')
      } else {
        const created = await tasksApi.create(payload)
        await this.router.navigate(['/tasks', created.id, 'edit'], { replaceUrl: true })
      }
    } catch (error) {
      this.message = String(error)
    } finally {
      this.submitting = false
    }
  }
}
