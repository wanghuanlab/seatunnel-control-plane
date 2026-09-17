import { Component, EventEmitter, Input, Output } from '@angular/core'
import { I18nService } from '../core/i18n.service'

const PAGE_SIZES = [20, 50, 100]

@Component({
  selector: 'app-pagination',
  template: `
    <div class="pagination" *ngIf="total > 0">
      <span class="pagination-summary">{{ i18n.t('pagination.summary', { from: from, to: to, total: total }) }}</span>
      <div class="pagination-controls">
        <button class="btn compact" type="button" [disabled]="current <= 1" (click)="pageChange.emit(current - 1)">
          <i nz-icon nzType="left"></i> {{ i18n.t('pagination.prev') }}
        </button>
        <span class="pagination-page">{{ i18n.t('pagination.page', { page: current, pages: pages }) }}</span>
        <button class="btn compact" type="button" [disabled]="current >= pages" (click)="pageChange.emit(current + 1)">
          {{ i18n.t('pagination.next') }} <i nz-icon nzType="right"></i>
        </button>
      </div>
      <label class="pagination-size" *ngIf="pageSizeChange.observers.length">
        <span>{{ i18n.t('pagination.pageSize') }}</span>
        <select [ngModel]="pageSize" (ngModelChange)="pageSizeChange.emit(+$event)">
          <option *ngFor="let size of pageSizes" [ngValue]="size">{{ size }}</option>
        </select>
      </label>
    </div>
  `,
})
export class PaginationComponent {
  @Input() page = 1
  @Input() pageSize = 20
  @Input() total = 0
  @Output() pageChange = new EventEmitter<number>()
  @Output() pageSizeChange = new EventEmitter<number>()

  pageSizes = PAGE_SIZES

  constructor(public i18n: I18nService) {}

  get pages() {
    return Math.max(1, Math.ceil(this.total / this.pageSize) || 1)
  }

  get current() {
    return Math.min(Math.max(1, this.page), this.pages)
  }

  get from() {
    return this.total === 0 ? 0 : (this.current - 1) * this.pageSize + 1
  }

  get to() {
    return Math.min(this.current * this.pageSize, this.total)
  }
}
