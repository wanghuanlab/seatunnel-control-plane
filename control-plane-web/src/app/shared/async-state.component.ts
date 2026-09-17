import { Component, ContentChild, Input, TemplateRef } from '@angular/core'
import { I18nService } from '../core/i18n.service'

@Component({
  selector: 'app-async-state',
  template: `
    <div class="loading" *ngIf="loading && isMissing">{{ i18n.t('app.loading') }}</div>
    <div class="error" *ngIf="error && isMissing">{{ error }}</div>
    <div class="empty" *ngIf="!loading && !error && isEmpty">{{ emptyText || i18n.t('app.empty') }}</div>
    <ng-container *ngIf="showContent">
      <div class="silent-refresh-bar" *ngIf="refreshing" aria-hidden="true"></div>
      <ng-container *ngTemplateOutlet="content; context: { $implicit: data }"></ng-container>
    </ng-container>
  `,
})
export class AsyncStateComponent {
  @Input() loading = false
  @Input() error: string | null = null
  @Input() data: unknown
  @Input() emptyText?: string
  @Input() refreshing = false
  @ContentChild(TemplateRef) content!: TemplateRef<{ $implicit: unknown }>

  constructor(public i18n: I18nService) {}

  get isMissing() {
    return this.data == null
  }

  get isEmpty() {
    return this.data == null || (Array.isArray(this.data) && this.data.length === 0)
  }

  get showContent() {
    return this.data != null && !(Array.isArray(this.data) && this.data.length === 0)
  }
}
