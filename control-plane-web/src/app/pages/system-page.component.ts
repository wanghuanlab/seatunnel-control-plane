import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'
import { seatunnelApi } from '../api/client'
import { I18nService } from '../core/i18n.service'
import { PollingSource } from '../core/polling'
import type { SystemMonitoringNode } from '../types/api'
import { formatSystemMetricEntries, formatSystemNodeRole } from '../utils/format'

@Component({
  selector: 'app-system-page',
  templateUrl: './system-page.component.html',
})
export class SystemPageComponent implements OnInit, OnDestroy {
  metricTab: 'metrics' | 'openmetrics' = 'metrics'
  autoRefresh = true
  system: PollingSource<SystemMonitoringNode[]>
  metrics: PollingSource<string>
  openMetrics: PollingSource<string>
  formatSystemNodeRole = formatSystemNodeRole

  constructor(public i18n: I18nService, private cdr: ChangeDetectorRef) {
    const tick = () => this.cdr.markForCheck()
    this.system = new PollingSource(() => seatunnelApi.getSystemMonitoring(), tick)
    this.metrics = new PollingSource(() => seatunnelApi.getMetrics().catch(() => this.i18n.t('system.metricsOff')), tick)
    this.openMetrics = new PollingSource(() => seatunnelApi.getOpenMetrics().catch(() => this.i18n.t('system.openMetricsOff')), tick)
  }

  ngOnInit() {
    this.system.start(15000, this.autoRefresh)
    this.metrics.start(15000, this.autoRefresh && this.metricTab === 'metrics')
    this.openMetrics.start(15000, this.autoRefresh && this.metricTab === 'openmetrics')
  }

  ngOnDestroy() {
    this.system.destroy()
    this.metrics.destroy()
    this.openMetrics.destroy()
  }

  get metricData() {
    return this.metricTab === 'metrics' ? this.metrics : this.openMetrics
  }

  setAutoRefresh(value: boolean) {
    this.autoRefresh = value
    this.syncPolling()
  }

  setMetricTab(tab: 'metrics' | 'openmetrics') {
    this.metricTab = tab
    this.syncPolling()
  }

  grouped(node: SystemMonitoringNode) {
    const entries = formatSystemMetricEntries(node as Record<string, string | undefined>, this.i18n.t, this.i18n.locale)
    return entries.reduce<Record<string, typeof entries>>((acc, item) => {
      acc[item.group] = acc[item.group] || []
      acc[item.group].push(item)
      return acc
    }, {})
  }

  reload() {
    this.system.reload()
    this.metricData.reload()
  }

  private syncPolling() {
    this.system.setEnabled(this.autoRefresh)
    this.metrics.setEnabled(this.autoRefresh && this.metricTab === 'metrics')
    this.openMetrics.setEnabled(this.autoRefresh && this.metricTab === 'openmetrics')
  }
}
