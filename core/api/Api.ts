import { GraphWorker } from "@indra/core"
import { demo } from "./demo"

const graphWorker = GraphWorker(demo)

const server = Bun.serve({
  port: 5001,
  async fetch(req) {
    const url = new URL(req.url)

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (url.pathname === "/api/graph") {
      const nodes = graphWorker.graph.nodes.map((node) => ({
        ...node,
        processed: graphWorker.workers[node.id]?.processed ?? 0
      }))
      return Response.json({ ...graphWorker.graph, nodes }, { headers: corsHeaders })
    }

    return new Response("Not found", { status: 404, headers: corsHeaders })
  }
})

console.log(`Indra API running at ${server.url}`)
