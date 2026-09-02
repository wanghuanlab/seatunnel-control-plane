import { Link, useParams } from 'react-router-dom'
import { seatunnelApi } from '../api/client'
import { AsyncState, useAsync } from '../components/AsyncState'
import { DagGraph } from '../components/DagGraph'
import { StatusBadge } from '../components/StatusBadge'
import { formatTimestamp, formatMetricEntries } from '../utils/format'

export function JobDetailPage() {
  const { jobId = '' } = useParams()
  const job = useAsync(() => seatunnelApi.getJobInfo(jobId), [jobId])
  const checkpoints = useAsync(() => seatunnelApi.getCheckpointOverview(jobId), [jobId])

  const handleStop = async () => {
    if (!window.confirm(`确认停止作业 ${jobId}？`)) return
    await seatunnelApi.stopJob(jobId)
    await job.reload()
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">作业详情</h1>
          <p className="page-desc mono">{jobId}</p>
        </div>
        <div className="actions">
          <Link className="btn" to="/jobs">返回列表</Link>
          <button className="btn danger" type="button" onClick={handleStop}>停止作业</button>
        </div>
      </header>

      <AsyncState loading={job.loading} error={job.error} data={job.data} emptyText="未找到该作业">
        {(detail) => {
          const metrics = formatMetricEntries(detail.metrics as Record<string, unknown> | string | undefined)
          const grouped = metrics.reduce<Record<string, typeof metrics>>((acc, item) => {
            acc[item.group] = acc[item.group] || []
            acc[item.group].push(item)
            return acc
          }, {})

          return (
            <div className="grid" style={{ gap: 16 }}>
              <section className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">{detail.jobName || 'Unnamed Job'}</h2>
                  <StatusBadge status={detail.jobStatus} />
                </div>
                <div className="panel-body">
                  <div className="metric-grid">
                    <div className="metric-item"><div className="metric-key">创建时间</div><div className="metric-value">{formatTimestamp(detail.createTime)}</div></div>
                    <div className="metric-item"><div className="metric-key">结束时间</div><div className="metric-value">{formatTimestamp(detail.finishedTime || detail.finishTime)}</div></div>
                    <div className="metric-item"><div className="metric-key">SavePoint 启动</div><div className="metric-value">{detail.isStartWithSavePoint ? '是' : '否'}</div></div>
                    {detail.errorMsg && (
                      <div className="metric-item"><div className="metric-key">错误信息</div><div className="metric-value">{detail.errorMsg}</div></div>
                    )}
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header"><h2 className="panel-title">运行指标</h2></div>
                <div className="panel-body">
                  {metrics.length ? Object.entries(grouped).map(([group, items], index, arr) => (
                    <div key={group} style={{ marginBottom: index < arr.length - 1 ? 18 : 0 }}>
                      <div className="metric-group-title">{group}</div>
                      <div className="metric-grid">
                        {items.map((item) => (
                          <div key={`${group}-${item.label}-${item.detail || ''}`} className="metric-item">
                            <div className="metric-key">
                              {item.label}
                              {item.detail ? <span className="metric-detail"> · {item.detail}</span> : null}
                            </div>
                            <div className="metric-value">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="empty" style={{ padding: 12 }}>暂无指标数据</div>
                  )}
                </div>
              </section>

              {detail.jobDag?.vertexInfoMap?.length ? (
                <section className="panel">
                  <div className="panel-header"><h2 className="panel-title">DAG 拓扑</h2></div>
                  <div className="panel-body">
                    <DagGraph dag={detail.jobDag} />
                  </div>
                </section>
              ) : null}

              <CheckpointSection jobId={jobId} checkpoints={checkpoints} />
            </div>
          )
        }}
      </AsyncState>
    </>
  )
}

function CheckpointSection({
  jobId,
  checkpoints,
}: {
  jobId: string
  checkpoints: ReturnType<typeof useAsync<Awaited<ReturnType<typeof seatunnelApi.getCheckpointOverview>>>>
}) {
  const history = useAsync(() => seatunnelApi.getCheckpointHistory(jobId, { limit: 10 }), [jobId])

  return (
    <section className="panel">
      <div className="panel-header"><h2 className="panel-title">Checkpoint</h2></div>
      <div className="panel-body">
        <AsyncState loading={checkpoints.loading} error={checkpoints.error} data={checkpoints.data} emptyText="暂无 Checkpoint 概览">
          {(overview) => (
            <div className="metric-grid">
              {(overview.pipelines ?? []).map((pipeline) => (
                <div key={pipeline.pipelineId} className="metric-item">
                  <div className="metric-key">Pipeline {pipeline.pipelineId}</div>
                  <div className="metric-value">
                    triggered {pipeline.counts?.triggered ?? 0} · completed {pipeline.counts?.completed ?? 0}
                  </div>
                </div>
              ))}
              {!overview.pipelines?.length && (
                <div className="empty" style={{ padding: 12 }}>该作业暂无 Checkpoint 数据</div>
              )}
            </div>
          )}
        </AsyncState>

        <div style={{ marginTop: 18 }}>
          <AsyncState loading={history.loading} error={history.error} data={history.data} emptyText="暂无 Checkpoint 历史">
            {(items) => (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Pipeline</th>
                      <th>Checkpoint ID</th>
                      <th>Status</th>
                      <th>Trigger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(items) ? items : []).map((item, index) => (
                      <tr key={`${item.pipelineId}-${index}`}>
                        <td>{item.pipelineId}</td>
                        <td className="mono">{String(item.checkpoint.checkpointId ?? '—')}</td>
                        <td>{String(item.checkpoint.status ?? '—')}</td>
                        <td>{formatTimestamp(item.checkpoint.triggerTimestamp as number | string | undefined)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AsyncState>
        </div>
      </div>
    </section>
  )
}
