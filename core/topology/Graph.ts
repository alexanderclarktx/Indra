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

  let timer = 0

  setInterval(() => {
    for (const worker of Object.values(workers)) {
      if (!worker.parentId) {
        if (timer++ % 1000 !== 0) continue
        console.log(`root: ${worker.id}`)
        const result = worker.process(null)
        result.then((res => {
          if (res) messages.push(res)
        }))
      }
    }
    for (const message of messages) {
      if (message.read) continue
      for (const worker of Object.values(workers)) {
        if (worker.parentId === message.from) {
          console.log(`child: ${worker.id}`)
          const result = worker.process(message)
          result.then((res => {
            if (res) messages.push(res)
          }))
        }
      }
      message.read = true
    }
  }, 5)

  return {}
}
