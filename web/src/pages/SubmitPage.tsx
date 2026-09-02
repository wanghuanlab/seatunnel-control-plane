import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { seatunnelApi } from '../api/client'

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

export function SubmitPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'single' | 'batch' | 'upload'>('single')
  const [format, setFormat] = useState<'json' | 'hocon' | 'sql'>('json')
  const [jobName, setJobName] = useState('edp_console_job')
  const [payload, setPayload] = useState(SAMPLE_JSON)
  const [batchPayload, setBatchPayload] = useState(SAMPLE_BATCH)
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submitJson = async () => {
    setSubmitting(true)
    setMessage(null)
    try {
      let body: unknown = payload
      if (format === 'json') {
        body = JSON.parse(payload)
      }
      const result = await seatunnelApi.submitJob(body, { jobName, format })
      setMessage(`提交成功：${result.jobName} (${result.jobId})`)
      navigate(`/jobs/${result.jobId}`)
    } catch (error) {
      setMessage(String(error))
    } finally {
      setSubmitting(false)
    }
  }

  const submitBatch = async () => {
    setSubmitting(true)
    setMessage(null)
    try {
      const jobs = JSON.parse(batchPayload) as Array<Record<string, unknown>>
      const result = await seatunnelApi.submitJobs(
        jobs.map((job) => {
          const { params, ...body } = job
          return {
            params: (params as { jobId?: string; jobName?: string }) || {},
            body,
          }
        }),
      )
      setMessage(`批量提交成功：${result.map((item) => `${item.jobName} (${item.jobId})`).join(', ')}`)
    } catch (error) {
      setMessage(String(error))
    } finally {
      setSubmitting(false)
    }
  }

  const submitUpload = async () => {
    if (!file) {
      setMessage('请选择配置文件')
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const result = await seatunnelApi.submitJobUpload(file, { jobName })
      setMessage(`上传提交成功：${result.jobName} (${result.jobId})`)
      navigate(`/jobs/${result.jobId}`)
    } catch (error) {
      setMessage(String(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">提交作业</h1>
          <p className="page-desc">支持单作业 JSON/HOCON/SQL 提交、批量 `POST /submit-jobs`，以及配置文件上传。</p>
        </div>
      </header>

      <div className="tabs">
        <button className={`tab${mode === 'single' ? ' active' : ''}`} type="button" onClick={() => setMode('single')}>
          单作业提交
        </button>
        <button className={`tab${mode === 'batch' ? ' active' : ''}`} type="button" onClick={() => setMode('batch')}>
          批量提交
        </button>
        <button className={`tab${mode === 'upload' ? ' active' : ''}`} type="button" onClick={() => setMode('upload')}>
          文件上传
        </button>
      </div>

      {mode === 'single' && (
        <section className="panel">
          <div className="panel-header"><h2 className="panel-title">文本提交</h2></div>
          <div className="panel-body form-grid">
            <div className="form-row">
              <label htmlFor="jobName">Job Name</label>
              <input id="jobName" value={jobName} onChange={(e) => setJobName(e.target.value)} />
            </div>
            <div className="form-row">
              <label htmlFor="format">Format</label>
              <select
                id="format"
                value={format}
                onChange={(e) => {
                  const next = e.target.value as 'json' | 'hocon' | 'sql'
                  setFormat(next)
                  if (next === 'json' && !payload.trim().startsWith('{')) {
                    setPayload(SAMPLE_JSON)
                  }
                }}
              >
                <option value="json">json</option>
                <option value="hocon">hocon</option>
                <option value="sql">sql</option>
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="payload">
                Config Body{format !== 'json' ? '（原始 HOCON / SQL 文本，直接粘贴 .conf 内容）' : ''}
              </label>
              <textarea id="payload" value={payload} onChange={(e) => setPayload(e.target.value)} />
            </div>
            <div className="actions">
              <button className="btn primary" type="button" disabled={submitting} onClick={submitJson}>
                提交作业
              </button>
            </div>
          </div>
        </section>
      )}

      {mode === 'batch' && (
        <section className="panel">
          <div className="panel-header"><h2 className="panel-title">批量提交</h2></div>
          <div className="panel-body form-grid">
            <div className="form-row">
              <label htmlFor="batchPayload">Jobs JSON Array（每项含 `params` 与作业配置）</label>
              <textarea id="batchPayload" value={batchPayload} onChange={(e) => setBatchPayload(e.target.value)} />
            </div>
            <div className="actions">
              <button className="btn primary" type="button" disabled={submitting} onClick={submitBatch}>
                批量提交
              </button>
            </div>
          </div>
        </section>
      )}

      {mode === 'upload' && (
        <section className="panel">
          <div className="panel-header"><h2 className="panel-title">文件上传</h2></div>
          <div className="panel-body form-grid">
            <div className="form-row">
              <label htmlFor="jobNameUpload">Job Name</label>
              <input id="jobNameUpload" value={jobName} onChange={(e) => setJobName(e.target.value)} />
            </div>
            <div className="form-row">
              <label htmlFor="configFile">Config File</label>
              <input id="configFile" type="file" accept=".json,.conf,.config,.sql" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="actions">
              <button className="btn primary" type="button" disabled={submitting} onClick={submitUpload}>
                上传并提交
              </button>
            </div>
          </div>
        </section>
      )}

      {message && (
        <div className={message.includes('成功') ? 'panel' : 'error'} style={{ marginTop: 16, padding: 16 }}>
          {message}
        </div>
      )}
    </>
  )
}
