export type Node = {
  id: string
  parentId?: string | null
  prompt: string
}

export type Graph = {
  id: string
  name: string
  nodes: Node[]
}
