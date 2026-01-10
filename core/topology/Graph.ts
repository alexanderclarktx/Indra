import { Message, Node, NodeWorker } from "@indra/core"

export type Graph = {
  id: string
  name: string
  nodes: Node[]
}

export type GraphWorker = {
  graph: Graph
  workers: Record<string, NodeWorker>
}

export const GraphWorker = (graph: Graph): GraphWorker => {

  const workers: Record<string, NodeWorker> = {}
  const messages: Message[] = []
  const childrenByParent = new Map<string, string[]>()

  const registerNode = (node: Node, parentId: string | null) => {
    workers[node.id] = NodeWorker(node)
    if (parentId) {
      const list = childrenByParent.get(parentId) ?? []
      list.push(node.id)
      childrenByParent.set(parentId, list)
    }
    node.children?.forEach((child) => {
      registerNode(child, node.id)
    })
  }

  graph.nodes.forEach((node) => {
    registerNode(node, null)
  })

  let timer = 0

  setInterval(() => {

    // root nodes
    for (const root of graph.nodes) {
      const worker = workers[root.id]
      if (!worker) continue

      // debug mode
      if (timer++ > 0) continue

      worker.process(null).then((res => {
        if (res) messages.push(res)
      }))
    }

    // child nodes
    for (const message of messages) {
      if (message.read) continue
      const childIds = childrenByParent.get(message.from) ?? []
      for (const childId of childIds) {
        const worker = workers[childId]
        if (!worker) continue
        worker.process(message).then((res => {
          if (res) messages.push(res)
        }))
      }
      message.read = true
    }

  }, 5)

  return {
    graph,
    workers
  }
}
