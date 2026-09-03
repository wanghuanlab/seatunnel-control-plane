import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { tasksApi } from '../api/tasksClient'
import { useAsync } from '../components/AsyncState'
import type { TaskConfigFormat, TaskPayload } from '../types/tasks'
import { useI18n } from '../i18n'

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

export function TaskEditorPage() {
  const { t } = useI18n()
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const taskId = Number(id)

  const existing = useAsync(() => (isEdit ? tasksApi.get(taskId) : Promise.resolve(null)), [id])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [configFormat, setConfigFormat] = useState<TaskConfigFormat>('hocon')
  const [configContent, setConfigContent] = useState(SAMPLE_HOCON)
  const [defaultJobName, setDefaultJobName] = useState('')
  const [isEnabled, setIsEnabled] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!existing.data) return
    setName(existing.data.name)
    setDescription(existing.data.description || '')
    setConfigFormat(existing.data.configFormat)
    setConfigContent(existing.data.configContent)
    setDefaultJobName(existing.data.defaultJobName || '')
    setIsEnabled(existing.data.isEnabled)
  }, [existing.data])

  const save = async () => {
    setSubmitting(true)
    setMessage(null)
    const payload: TaskPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      configFormat,
      configContent,
      defaultJobName: defaultJobName.trim() || undefined,
      isEnabled,
    }
    try {
      if (isEdit) {
        await tasksApi.update(taskId, payload)
        setMessage(t('tasks.saved'))
      } else {
        const created = await tasksApi.create(payload)
        navigate(`/tasks/${created.id}/edit`, { replace: true })
      }
    } catch (error) {
      setMessage(String(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (isEdit && existing.loading) {
    return <div className="loading">{t('app.loading')}</div>
  }

  if (isEdit && existing.error) {
    return <div className="error">{existing.error}</div>
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? t('tasks.editorEdit') : t('tasks.editorCreate')}</h1>
          <p className="page-desc">{t('tasks.editorDesc')}</p>
        </div>
        <div className="actions">
          <Link className="btn" to="/tasks">{t('tasks.backToList')}</Link>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header"><h2 className="panel-title">{t('tasks.info')}</h2></div>
        <div className="panel-body form-grid">
          <div className="form-row">
            <label htmlFor="taskName">{t('tasks.name')}</label>
            <input id="taskName" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('tasks.namePh')} />
          </div>
          <div className="form-row">
            <label htmlFor="taskDesc">{t('tasks.description')}</label>
            <input id="taskDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('tasks.optional')} />
          </div>
          <div className="form-row">
            <label htmlFor="defaultJobName">{t('tasks.defaultJobName')}</label>
            <input id="defaultJobName" value={defaultJobName} onChange={(e) => setDefaultJobName(e.target.value)} placeholder={t('tasks.defaultJobNamePh')} />
          </div>
          <div className="form-row">
            <label htmlFor="configFormat">{t('tasks.configFormat')}</label>
            <select id="configFormat" value={configFormat} onChange={(e) => setConfigFormat(e.target.value as TaskConfigFormat)}>
              <option value="hocon">hocon</option>
              <option value="json">json</option>
              <option value="sql">sql</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="configContent">{t('tasks.configContent')}</label>
            <textarea id="configContent" value={configContent} onChange={(e) => setConfigContent(e.target.value)} />
          </div>
          <label className="inline-check">
            <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
            {t('tasks.enableTask')}
          </label>
          <div className="actions">
            <button className="btn primary" type="button" disabled={submitting || !name.trim()} onClick={save}>
              {isEdit ? t('app.save') : t('tasks.createAction')}
            </button>
          </div>
        </div>
      </section>

      {message && (
        <div className={message === t('tasks.saved') ? 'panel' : 'error'} style={{ marginTop: 16, padding: 16 }}>
          {message}
        </div>
      )}
    </>
  )
}
