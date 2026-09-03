import { useEffect, useState } from 'react'
import { tasksApi } from '../api/tasksClient'
import { AsyncState, useAsync } from '../components/AsyncState'
import { CronEditor } from '../components/CronEditor'
import { defaultCronConfig } from '../utils/cron'
import { formatTimestamp } from '../utils/format'
import type { CronEditorConfig, TaskSchedule } from '../types/tasks'

export function TaskSchedulePanel({ taskId }: { taskId: number }) {
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
      setMessage('调度配置已保存')
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
        <h2 className="panel-title">定时调度</h2>
        <label className="inline-check">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          启用定时调度
        </label>
      </div>
      <div className="panel-body">
        <AsyncState loading={scheduleState.loading} error={scheduleState.error} data={scheduleState.data} emptyText="无法加载调度配置">
          {(schedule: TaskSchedule) => (
            <>
              <div className="metric-grid" style={{ marginBottom: 18 }}>
                <div className="metric-item">
                  <div className="metric-key">下次执行</div>
                  <div className="metric-value">{formatTimestamp(schedule.nextRunAt)}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-key">上次触发</div>
                  <div className="metric-value">{formatTimestamp(schedule.lastTriggerAt)}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-key">上次触发结果</div>
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
                  {saving ? '保存中…' : '保存调度'}
                </button>
              </div>

              {message && (
                <div className={message.includes('已保存') ? 'panel' : 'error'} style={{ marginTop: 16, padding: 12 }}>
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
