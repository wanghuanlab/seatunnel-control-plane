import { useState } from 'react'
import { seatunnelApi } from '../api/client'
import { useI18n } from '../i18n'

export function ToolsPage() {
  const { t } = useI18n()
  const [tagsJson, setTagsJson] = useState('{\n  "zone": "local",\n  "env": "dev"\n}')
  const [encryptJson, setEncryptJson] = useState('{\n  "env": { "parallelism": 1 }\n}')
  const [stopJobIds, setStopJobIds] = useState('')
  const [batchSubmitJson, setBatchSubmitJson] = useState(`[
  {
    "params": { "jobName": "batch-job-1" },
    "env": { "job.mode": "BATCH" },
    "source": [{ "plugin_name": "FakeSource", "plugin_output": "fake", "row.num": 5, "schema": { "fields": { "name": "string" } } }],
    "transform": [],
    "sink": [{ "plugin_name": "Console", "plugin_input": ["fake"] }]
  }
]`)
  const [message, setMessage] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>) => {
    setMessage(null)
    try {
      const result = await action()
      setMessage(typeof result === 'string' ? result : JSON.stringify(result, null, 2))
    } catch (error) {
      setMessage(String(error))
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('tools.title')}</h1>
          <p className="page-desc">{t('tools.desc')}</p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header"><h2 className="panel-title">{t('tools.updateTags')}</h2></div>
        <div className="panel-body form-grid">
          <div className="form-row">
            <label htmlFor="tags">{t('tools.tagsLabel')}</label>
            <textarea id="tags" value={tagsJson} onChange={(e) => setTagsJson(e.target.value)} />
          </div>
          <button className="btn primary" type="button" onClick={() => run(() => seatunnelApi.updateTags(JSON.parse(tagsJson)))}>
            {t('tools.updateTagsAction')}
          </button>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><h2 className="panel-title">{t('tools.encrypt')}</h2></div>
        <div className="panel-body form-grid">
          <div className="form-row">
            <label htmlFor="encrypt">{t('tools.encryptLabel')}</label>
            <textarea id="encrypt" value={encryptJson} onChange={(e) => setEncryptJson(e.target.value)} />
          </div>
          <button className="btn primary" type="button" onClick={() => run(() => seatunnelApi.encryptConfig(JSON.parse(encryptJson)))}>
            {t('tools.encryptAction')}
          </button>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><h2 className="panel-title">{t('tools.batchStop')}</h2></div>
        <div className="panel-body form-grid">
          <div className="form-row">
            <label htmlFor="stopJobIds">{t('tools.stopIds')}</label>
            <textarea
              id="stopJobIds"
              value={stopJobIds}
              onChange={(e) => setStopJobIds(e.target.value)}
              placeholder="1234567890,9876543210"
            />
          </div>
          <button
            className="btn danger"
            type="button"
            onClick={() =>
              run(() => {
                const ids = stopJobIds.split(/[\s,]+/).filter(Boolean)
                return seatunnelApi.stopJobs(ids.map((jobId) => ({ jobId })))
              })
            }
            disabled={!stopJobIds.trim()}
          >
            {t('tools.stopAction')}
          </button>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><h2 className="panel-title">{t('tools.batchSubmit')}</h2></div>
        <div className="panel-body form-grid">
          <div className="form-row">
            <label htmlFor="batchSubmit">{t('tools.batchLabel')}</label>
            <textarea id="batchSubmit" value={batchSubmitJson} onChange={(e) => setBatchSubmitJson(e.target.value)} />
          </div>
          <button
            className="btn primary"
            type="button"
            onClick={() => run(() => seatunnelApi.submitJobs(JSON.parse(batchSubmitJson)))}
          >
            {t('tools.batchAction')}
          </button>
        </div>
      </section>

      {message && (
        <section className="panel" style={{ marginTop: 16 }}>
          <div className="panel-header"><h2 className="panel-title">{t('tools.result')}</h2></div>
          <div className="panel-body">
            <pre className="mono metrics-pre">{message}</pre>
          </div>
        </section>
      )}
    </>
  )
}
