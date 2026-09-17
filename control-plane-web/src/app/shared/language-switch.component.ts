import { Component, EventEmitter, Input, Output } from '@angular/core'
import { I18nService } from '../core/i18n.service'
import type { Locale } from '../core/i18n.service'

@Component({
  selector: 'app-language-switch',
  template: `
    <div class="lang-switch" [class.compact]="compact" role="group" aria-label="Language">
      <button
        *ngFor="let option of options"
        type="button"
        [class.active]="i18n.locale === option.value"
        (click)="select(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  `,
})
export class LanguageSwitchComponent {
  @Input() compact = false
  @Output() localeChange = new EventEmitter<Locale>()

  options: Array<{ value: Locale; label: string }> = [
    { value: 'en', label: 'EN' },
    { value: 'zh', label: '中文' },
  ]

  constructor(public i18n: I18nService) {}

  select(locale: Locale) {
    this.i18n.setLocale(locale)
    this.localeChange.emit(locale)
  }
}
