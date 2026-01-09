import { Message, Node, NodeWorker } from "@indra/core"

export type Graph = {
  id: string
  name: string
  nodes: Node[]
}

export type GraphWorker = {
  // process: (graph: Graph) => void
}

export const GraphWorker = (graph: Graph): GraphWorker => {

  const workers: Record<string, NodeWorker> = {}
  const messages: Message[] = []

  for (const node of graph.nodes) {
    workers[node.id] = NodeWorker(node)
  }

  setInterval(() => {
    for (const worker of Object.values(workers)) {
      if (!worker.parentId) {
        console.log(`root: ${worker.id}`)
        const result = worker.process(null)
        if (result) {
          messages.push(result)
          // messages[worker.id] = result
        }
      }
    }
    for (const message of messages) {
      if (message.read) continue
      for (const worker of Object.values(workers)) {
        if (worker.parentId === message.from) {
          console.log(`child: ${worker.id}`)
          const result = worker.process(message)
          if (result) {
            messages.push(result)
          }
        }
      }
      message.read = true

    }
  }, 5000)

  return { }
}
