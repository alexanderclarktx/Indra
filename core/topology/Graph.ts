import { Node, NodeWorker } from "@indra/core"

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

  for (const node of graph.nodes) {
    workers[node.id] = NodeWorker(node)
  }

  setInterval(() => {
    for (const worker of Object.values(workers)) {
      if (!worker.parentId) {
        // console.log(`Processing root node ${worker.id}`)
        worker.process()
      }
    }
  }, 1000)

  return { }
}
