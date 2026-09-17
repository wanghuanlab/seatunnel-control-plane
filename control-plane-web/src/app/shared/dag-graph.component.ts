import { Component, Input } from '@angular/core'
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

@Component({
  selector: 'app-dag-graph',
  template: `
    <div class="empty" *ngIf="!dag?.vertexInfoMap?.length">暂无 DAG 数据</div>
    <div class="dag-graph" *ngIf="dag?.vertexInfoMap?.length">
      <div class="dag-flow">
        <div class="dag-flow-item" *ngFor="let vertex of vertices; let index = index; let last = last">
          <div class="dag-node-card" [style.borderColor]="color(vertex)">
            <div class="dag-node-type" [style.color]="color(vertex)">{{ vertex.type || 'vertex' }}</div>
            <div class="dag-node-name">{{ vertex.vertexName }}</div>
            <div class="dag-node-meta mono">#{{ vertex.vertexId }}</div>
            <div class="dag-node-path mono" *ngIf="vertex.tablePaths?.length">{{ vertex.tablePaths.join(' · ') }}</div>
          </div>
          <div class="dag-arrow" *ngIf="!last" [title]="arrowTitle(vertex)">→</div>
        </div>
      </div>
      <div class="dag-edge-list mono" *ngIf="allEdges.length">
        <div *ngFor="let edge of allEdges; let index = index">
          {{ edge.inputVertexId }} → {{ edge.targetVertexId }}
        </div>
      </div>
    </div>
  `,
})
export class DagGraphComponent {
  @Input() dag?: JobDag

  get vertices() {
    return this.dag ? orderVertices(this.dag) : []
  }

  get allEdges() {
    return this.dag ? extractEdges(this.dag.pipelineEdges) : []
  }

  color(vertex: JobDagVertex) {
    return TYPE_COLORS[vertex.type?.toLowerCase()] || '#8b9bb8'
  }

  arrowTitle(vertex: JobDagVertex) {
    const next = this.allEdges.filter((edge) => String(edge.inputVertexId) === String(vertex.vertexId))
    return next.length ? `→ ${next.map((edge) => String(edge.targetVertexId)).join(', ')}` : 'flow'
  }
}
