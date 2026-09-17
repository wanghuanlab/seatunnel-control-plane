import { Component, Input } from '@angular/core'
import { I18nService } from '../core/i18n.service'
import { jobStatusTone } from '../utils/format'

@Component({
  selector: 'app-status-badge',
  template: `<span class="badge {{ tone }}">{{ label }}</span>`,
})
export class StatusBadgeComponent {
  @Input() status?: string

  constructor(private i18n: I18nService) {}

  get tone() {
    return jobStatusTone(this.status)
  }

  get label() {
    return this.i18n.statusLabel(this.status)
  }
}
