import type { Graph } from "@indra/core"

const snapshot: Graph = {
  id: "demo",
  name: "demo",
  nodes: [
    {
      id: "ingest",
      parentId: null,
      prompt: "Classify incoming events and route them to the correct handler."
    },
    {
      id: "enrich",
      parentId: "ingest",
      prompt: "Enrich the incoming event with additional context."
    },
    {
      id: "decide",
      parentId: "enrich",
      prompt: "Select the next action and required tools."
    }
  ]
}

function isSafePath(pathname: string) {
  return !pathname.includes("..") && !pathname.includes("\\")
}

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
      console.log("Serving graph snapshot")
      return Response.json(snapshot, { headers: corsHeaders })
    }

    return new Response("Not found", { status: 404, headers: corsHeaders })
  }
})

console.log(`Indra API running at ${server.url}`)
