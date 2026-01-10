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

  for (const node of graph.nodes) {
    workers[node.id] = NodeWorker(node)
  }

  let timer = 0

  setInterval(() => {

    // root nodes
    for (const worker of Object.values(workers)) {
      if (!worker.parentId) {

        // debug mode
        if (timer++ > 0) continue

        worker.process(null).then((res => {
          if (res) messages.push(res)
        }))
      }
    }

    // child nodes
    for (const message of messages) {
      if (message.read) continue
      for (const worker of Object.values(workers)) {
        if (worker.parentId === message.from) {
          worker.process(message).then((res => {
            if (res) messages.push(res)
          }))
        }
      }
      message.read = true
    }

  }, 5)

  return {
    graph,
    workers
  }
}
