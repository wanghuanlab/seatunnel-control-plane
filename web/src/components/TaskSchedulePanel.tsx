import { useEffect, useState } from 'react'
import { tasksApi } from '../api/tasksClient'
import { AsyncState, useAsync } from '../components/AsyncState'
import { CronEditor } from '../components/CronEditor'
import { defaultCronConfig } from '../utils/cron'
import { formatTimestamp } from '../utils/format'
import { useI18n } from '../i18n'
import type { CronEditorConfig, TaskSchedule } from '../types/tasks'

export function TaskSchedulePanel({ taskId }: { taskId: number }) {
  const { t } = useI18n()
  const scheduleState = useAsync(() => tasksApi.getSchedule(taskId), [taskId])
  const [enabled, setEnabled] = useState(false)
  const [timezone, setTimezone] = useState('Asia/Shanghai')
  const [config, setConfig] = useState<CronEditorConfig>(defaultCronConfig())
  const [initialized, setInitialized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setInitialized(false)
  }, [taskId])

  useEffect(() => {
    if (!scheduleState.data || initialized) return
    const schedule = scheduleState.data
    setEnabled(schedule.enabled)
    setTimezone(schedule.timezone)
    setConfig(schedule.cronConfig || defaultCronConfig())
    setInitialized(true)
  }, [scheduleState.data, initialized])

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const saved = await tasksApi.saveSchedule(taskId, { enabled, timezone, cronConfig: config })
      setEnabled(saved.enabled)
      setTimezone(saved.timezone)
      setConfig(saved.cronConfig)
      setMessage(t('schedule.saved'))
      await scheduleState.reload()
    } catch (error) {
      setMessage(String(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">{t('schedule.title')}</h2>
        <label className="inline-check">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          {t('schedule.enable')}
        </label>
      </div>
      <div className="panel-body">
        <AsyncState loading={scheduleState.loading} error={scheduleState.error} data={scheduleState.data} emptyText={t('schedule.loadError')}>
          {(schedule: TaskSchedule) => (
            <>
              <div className="metric-grid" style={{ marginBottom: 18 }}>
                <div className="metric-item">
                  <div className="metric-key">{t('schedule.nextRun')}</div>
                  <div className="metric-value">{formatTimestamp(schedule.nextRunAt)}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-key">{t('schedule.lastTrigger')}</div>
                  <div className="metric-value">{formatTimestamp(schedule.lastTriggerAt)}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-key">{t('schedule.lastResult')}</div>
                  <div className="metric-value">{schedule.lastTriggerStatus || '—'}</div>
                </div>
              </div>

              {schedule.lastTriggerError && (
                <div className="error" style={{ marginBottom: 16, padding: 12 }}>{schedule.lastTriggerError}</div>
              )}

              <CronEditor
                config={config}
                timezone={timezone}
                onConfigChange={setConfig}
                onTimezoneChange={setTimezone}
              />

              <div className="actions" style={{ marginTop: 16 }}>
                <button className="btn primary" type="button" disabled={saving} onClick={save}>
                  {saving ? t('schedule.saving') : t('schedule.save')}
                </button>
              </div>

              {message && (
                <div className={message.includes(t('schedule.saved')) ? 'panel' : 'error'} style={{ marginTop: 16, padding: 12 }}>
                  {message}
                </div>
              )}
            </>
          )}
        </AsyncState>
      </div>
    </section>
  )
}
