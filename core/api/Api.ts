import { Graph, GraphWorker } from "@indra/core"

const demo: Graph = {
  id: "demo",
  name: "demo",
  nodes: [
    {
      id: "ingest",
      parentId: null,
      prompt: "go to a random wikipedia page (https://en.wikipedia.org/wiki/special:random) and summarize the content in a few sentences."
    },
    {
      id: "tag",
      parentId: "ingest",
      prompt: "Extract relevant tags from the summarized content."
    },
    {
      id: "log",
      parentId: "tag",
      prompt: "log the extracted tags to the console."
    }
  ]
}

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
      return Response.json(demo, { headers: corsHeaders })
    }

    return new Response("Not found", { status: 404, headers: corsHeaders })
  }
})

console.log(`Indra API running at ${server.url}`)
