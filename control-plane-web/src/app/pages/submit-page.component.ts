import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { seatunnelApi } from '../api/client'
import { I18nService } from '../core/i18n.service'

const SAMPLE_JSON = `{
  "env": { "job.mode": "BATCH" },
  "source": [{
    "plugin_name": "FakeSource",
    "plugin_output": "fake",
    "row.num": 10,
    "schema": { "fields": { "name": "string", "age": "int" } }
  }],
  "transform": [],
  "sink": [{ "plugin_name": "Console", "plugin_input": ["fake"] }]
}`

const SAMPLE_BATCH = `[
  {
    "params": { "jobName": "batch-job-1" },
    "env": { "job.mode": "BATCH" },
    "source": [{ "plugin_name": "FakeSource", "plugin_output": "fake", "row.num": 5, "schema": { "fields": { "name": "string" } } }],
    "transform": [],
    "sink": [{ "plugin_name": "Console", "plugin_input": ["fake"] }]
  },
  {
    "params": { "jobName": "batch-job-2" },
    "env": { "job.mode": "BATCH" },
    "source": [{ "plugin_name": "FakeSource", "plugin_output": "fake2", "row.num": 3, "schema": { "fields": { "id": "int" } } }],
    "transform": [],
    "sink": [{ "plugin_name": "Console", "plugin_input": ["fake2"] }]
  }
]`

@Component({
  selector: 'app-submit-page',
  templateUrl: './submit-page.component.html',
})
export class SubmitPageComponent {
  mode: 'single' | 'batch' | 'upload' = 'single'
  format: 'json' | 'hocon' | 'sql' = 'json'
  jobName = 'scp_console_job'
  payload = SAMPLE_JSON
  batchPayload = SAMPLE_BATCH
  file: File | null = null
  message: string | null = null
  submitting = false

  constructor(public i18n: I18nService, private router: Router) {}

  get success() {
    return this.message ? /success|成功/i.test(this.message) : false
  }

  onFormatChange(next: 'json' | 'hocon' | 'sql') {
    this.format = next
    if (next === 'json' && !this.payload.trim().startsWith('{')) this.payload = SAMPLE_JSON
  }

  onFile(event: Event) {
    this.file = (event.target as HTMLInputElement).files?.[0] || null
  }

  async submitJson() {
    this.submitting = true
    this.message = null
    try {
      let body: unknown = this.payload
      if (this.format === 'json') body = JSON.parse(this.payload)
      const result = await seatunnelApi.submitJob(body, { jobName: this.jobName, format: this.format })
      this.message = this.i18n.t('submit.success', { name: result.jobName, id: result.jobId })
      await this.router.navigate(['/jobs', result.jobId])
    } catch (error) {
      this.message = String(error)
    } finally {
      this.submitting = false
    }
  }

  async submitBatch() {
    this.submitting = true
    this.message = null
    try {
      const jobs = JSON.parse(this.batchPayload) as Array<Record<string, unknown>>
      const result = await seatunnelApi.submitJobs(
        jobs.map((job) => {
          const { params, ...body } = job
          return { params: (params as { jobId?: string; jobName?: string }) || {}, body }
        }),
      )
      this.message = this.i18n.t('submit.batchSuccess', { summary: result.map((item) => `${item.jobName} (${item.jobId})`).join(', ') })
    } catch (error) {
      this.message = String(error)
    } finally {
      this.submitting = false
    }
  }

  async submitUpload() {
    if (!this.file) {
      this.message = this.i18n.t('submit.chooseFile')
      return
    }
    this.submitting = true
    this.message = null
    try {
      const result = await seatunnelApi.submitJobUpload(this.file, { jobName: this.jobName })
      this.message = this.i18n.t('submit.uploadSuccess', { name: result.jobName, id: result.jobId })
      await this.router.navigate(['/jobs', result.jobId])
    } catch (error) {
      this.message = String(error)
    } finally {
      this.submitting = false
    }
  }
}
