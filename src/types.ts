export type NodeType = "agent" | "code"

export type NodeBase = {
  id: string
  parentId?: string | null
  type: NodeType
}

export type AgentNode = NodeBase & {
  type: "agent"
  prompt: string
}

export type CodeNode = NodeBase & {
  type: "code"
  code: string
}

export type GraphNode = AgentNode | CodeNode

export type Graph = {
  id: string
  name: string
  nodes: GraphNode[]
}

export type AuditEvent = {
  id: string
  nodeId: string
  message: string
  timestamp: string
}

export type MetricPoint = {
  label: string
  value: number
}

export type GraphSnapshot = {
  graph: Graph
  audit: AuditEvent[]
  metrics: MetricPoint[]
  updatedAt: string
}
