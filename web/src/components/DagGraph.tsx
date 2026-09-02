import type { JobDag, JobDagVertex } from '../types/api'

const TYPE_COLORS: Record<string, string> = {
  source: '#2dd4bf',
  transform: '#4f8cff',
  sink: '#f59e0b',
}

const TYPE_ORDER: Record<string, number> = {
  source: 0,
  transform: 1,
  sink: 2,
}

type DagEdge = { inputVertexId: string | number; targetVertexId: string | number }

function extractEdges(pipelineEdges: JobDag['pipelineEdges']): DagEdge[] {
  const result: DagEdge[] = []
  for (const edgeList of Object.values(pipelineEdges || {})) {
    if (!Array.isArray(edgeList)) continue
    for (const edge of edgeList) {
      if (typeof edge === 'object' && edge !== null && 'inputVertexId' in edge && 'targetVertexId' in edge) {
        result.push(edge as DagEdge)
      }
    }
  }
  return result
}

/** 按 pipelineEdges 拓扑排序；无有效边时回退为 source → transform → sink */
function orderVertices(dag: JobDag): JobDagVertex[] {
  const vertices = [...dag.vertexInfoMap]
  const edges = extractEdges(dag.pipelineEdges)
  if (!edges.length) {
    return vertices.sort((a, b) => {
      const typeDiff = (TYPE_ORDER[a.type?.toLowerCase()] ?? 9) - (TYPE_ORDER[b.type?.toLowerCase()] ?? 9)
      return typeDiff !== 0 ? typeDiff : a.vertexId - b.vertexId
    })
  }

  const vertexMap = new Map(vertices.map((v) => [String(v.vertexId), v]))
  const outgoing = new Map<string, string[]>()
  const indegree = new Map<string, number>()

  for (const vertex of vertices) {
    const id = String(vertex.vertexId)
    outgoing.set(id, [])
    indegree.set(id, 0)
  }

  for (const edge of edges) {
    const from = String(edge.inputVertexId)
    const to = String(edge.targetVertexId)
    if (!vertexMap.has(from) || !vertexMap.has(to)) continue
    outgoing.get(from)?.push(to)
    indegree.set(to, (indegree.get(to) || 0) + 1)
  }

  const queue = vertices
    .filter((v) => (indegree.get(String(v.vertexId)) || 0) === 0)
    .sort((a, b) => {
      const typeDiff = (TYPE_ORDER[a.type?.toLowerCase()] ?? 9) - (TYPE_ORDER[b.type?.toLowerCase()] ?? 9)
      return typeDiff !== 0 ? typeDiff : a.vertexId - b.vertexId
    })

  const sorted: JobDagVertex[] = []
  while (queue.length) {
    const current = queue.shift()!
    sorted.push(current)
    const nextIds = outgoing.get(String(current.vertexId)) || []
    for (const nextId of nextIds) {
      const nextDegree = (indegree.get(nextId) || 0) - 1
      indegree.set(nextId, nextDegree)
      if (nextDegree === 0) {
        const nextVertex = vertexMap.get(nextId)
        if (nextVertex) {
          queue.push(nextVertex)
          queue.sort((a, b) => {
            const typeDiff = (TYPE_ORDER[a.type?.toLowerCase()] ?? 9) - (TYPE_ORDER[b.type?.toLowerCase()] ?? 9)
            return typeDiff !== 0 ? typeDiff : a.vertexId - b.vertexId
          })
        }
      }
    }
  }

  if (sorted.length !== vertices.length) {
    const visited = new Set(sorted.map((v) => v.vertexId))
    const rest = vertices.filter((v) => !visited.has(v.vertexId))
    return [...sorted, ...rest.sort((a, b) => a.vertexId - b.vertexId)]
  }

  return sorted
}

function edgeLabel(edges: DagEdge[]): string {
  return edges.map((edge) => String(edge.targetVertexId)).join(', ')
}

export function DagGraph({ dag }: { dag?: JobDag }) {
  if (!dag?.vertexInfoMap?.length) {
    return <div className="empty">暂无 DAG 数据</div>
  }

  const vertices = orderVertices(dag)
  const allEdges = extractEdges(dag.pipelineEdges)
  const edgesByFrom = new Map<string, DagEdge[]>()
  for (const edge of allEdges) {
    const from = String(edge.inputVertexId)
    const list = edgesByFrom.get(from) || []
    list.push(edge)
    edgesByFrom.set(from, list)
  }

  return (
    <div className="dag-graph">
      <div className="dag-flow">
        {vertices.map((vertex, index) => {
          const nextEdges = edgesByFrom.get(String(vertex.vertexId)) || []
          const color = TYPE_COLORS[vertex.type?.toLowerCase()] || '#8b9bb8'
          return (
            <div key={vertex.vertexId} className="dag-flow-item">
              <div className="dag-node-card" style={{ borderColor: color }}>
                <div className="dag-node-type" style={{ color }}>{vertex.type || 'vertex'}</div>
                <div className="dag-node-name">{vertex.vertexName}</div>
                <div className="dag-node-meta mono">#{vertex.vertexId}</div>
                {vertex.tablePaths?.length ? (
                  <div className="dag-node-path mono">{vertex.tablePaths.join(' · ')}</div>
                ) : null}
              </div>
              {index < vertices.length - 1 && (
                <div className="dag-arrow" title={nextEdges.length ? `→ ${edgeLabel(nextEdges)}` : 'flow'}>
                  →
                </div>
              )}
            </div>
          )
        })}
      </div>
      {allEdges.length > 0 && (
        <div className="dag-edge-list mono">
          {allEdges.map((edge, index) => (
            <div key={`${edge.inputVertexId}-${edge.targetVertexId}-${index}`}>
              {edge.inputVertexId} → {edge.targetVertexId}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
