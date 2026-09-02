import { useState } from 'react'
import { seatunnelApi } from '../api/client'

export function ToolsPage() {
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
          <h1 className="page-title">工具箱</h1>
          <p className="page-desc">节点 Tags、配置加密、单/批量停止与批量提交作业。</p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header"><h2 className="panel-title">更新节点 Tags</h2></div>
        <div className="panel-body form-grid">
          <div className="form-row">
            <label htmlFor="tags">Tags JSON（空对象 `{}` 表示清除）</label>
            <textarea id="tags" value={tagsJson} onChange={(e) => setTagsJson(e.target.value)} />
          </div>
          <button className="btn primary" type="button" onClick={() => run(() => seatunnelApi.updateTags(JSON.parse(tagsJson)))}>
            更新 Tags
          </button>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><h2 className="panel-title">加密配置</h2></div>
        <div className="panel-body form-grid">
          <div className="form-row">
            <label htmlFor="encrypt">Config JSON</label>
            <textarea id="encrypt" value={encryptJson} onChange={(e) => setEncryptJson(e.target.value)} />
          </div>
          <button className="btn primary" type="button" onClick={() => run(() => seatunnelApi.encryptConfig(JSON.parse(encryptJson)))}>
            加密
          </button>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><h2 className="panel-title">批量停止作业</h2></div>
        <div className="panel-body form-grid">
          <div className="form-row">
            <label htmlFor="stopJobIds">Job IDs（逗号或换行分隔）</label>
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
            批量停止
          </button>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><h2 className="panel-title">批量提交作业</h2></div>
        <div className="panel-body form-grid">
          <div className="form-row">
            <label htmlFor="batchSubmit">Jobs JSON Array（`POST /submit-jobs`）</label>
            <textarea id="batchSubmit" value={batchSubmitJson} onChange={(e) => setBatchSubmitJson(e.target.value)} />
          </div>
          <button
            className="btn primary"
            type="button"
            onClick={() => run(() => seatunnelApi.submitJobs(JSON.parse(batchSubmitJson)))}
          >
            批量提交
          </button>
        </div>
      </section>

      {message && (
        <section className="panel" style={{ marginTop: 16 }}>
          <div className="panel-header"><h2 className="panel-title">结果</h2></div>
          <div className="panel-body">
            <pre className="mono metrics-pre">{message}</pre>
          </div>
        </section>
      )}
    </>
  )
}
