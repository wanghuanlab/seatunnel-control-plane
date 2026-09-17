import { Component } from '@angular/core'
import { seatunnelApi } from '../api/client'
import { I18nService } from '../core/i18n.service'

@Component({
  selector: 'app-tools-page',
  templateUrl: './tools-page.component.html',
})
export class ToolsPageComponent {
  tagsJson = '{\n  "zone": "local",\n  "env": "dev"\n}'
  encryptJson = '{\n  "env": { "parallelism": 1 }\n}'
  stopJobIds = ''
  batchSubmitJson = `[
  {
    "params": { "jobName": "batch-job-1" },
    "env": { "job.mode": "BATCH" },
    "source": [{ "plugin_name": "FakeSource", "plugin_output": "fake", "row.num": 5, "schema": { "fields": { "name": "string" } } }],
    "transform": [],
    "sink": [{ "plugin_name": "Console", "plugin_input": ["fake"] }]
  }
]`
  message: string | null = null

  constructor(public i18n: I18nService) {}

  async run(action: () => Promise<unknown>) {
    this.message = null
    try {
      const result = await action()
      this.message = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
    } catch (error) {
      this.message = String(error)
    }
  }

  updateTags() {
    return this.run(() => seatunnelApi.updateTags(JSON.parse(this.tagsJson)))
  }

  encrypt() {
    return this.run(() => seatunnelApi.encryptConfig(JSON.parse(this.encryptJson)))
  }

  batchStop() {
    return this.run(() => {
      const ids = this.stopJobIds.split(/[\s,]+/).filter(Boolean)
      return seatunnelApi.stopJobs(ids.map((jobId) => ({ jobId })))
    })
  }

  batchSubmit() {
    return this.run(() => seatunnelApi.submitJobs(JSON.parse(this.batchSubmitJson)))
  }
}
