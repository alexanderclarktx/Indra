export type Node = {
  id: string
  parentId: string | null
  prompt: string
}

export type NodeWorker = Node & {
  process: () => void
}

export const NodeWorker = (node: Node): NodeWorker => {
  return {
    ...node,
    process: () => {
      // console.log(`node ${node.id}`)
    }
  }
}
