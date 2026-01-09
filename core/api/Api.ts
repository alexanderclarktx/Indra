import type { GraphSnapshot } from "@indra/core"

const snapshot: GraphSnapshot = {
  graph: {
    id: "graph-001",
    name: "Onboarding Demo",
    nodes: [
      {
        id: "ingest",
        parentId: null,
        type: "agent",
        prompt: "Classify incoming events and route them to the correct handler."
      },
      {
        id: "enrich",
        parentId: "ingest",
        type: "code",
        code: "enrichPayload(event)"
      },
      {
        id: "decide",
        parentId: "enrich",
        type: "agent",
        prompt: "Select the next action and required tools."
      }
    ]
  },
  audit: [
    {
      id: "audit-001",
      nodeId: "ingest",
      message: "Received new webhook payload.",
      timestamp: new Date().toISOString()
    },
    {
      id: "audit-002",
      nodeId: "enrich",
      message: "Normalized fields and attached metadata.",
      timestamp: new Date().toISOString()
    }
  ],
  metrics: [
    {
      label: "Active nodes",
      value: 3
    },
    {
      label: "Messages in flight",
      value: 2
    },
    {
      label: "Avg latency (ms)",
      value: 128
    }
  ],
  updatedAt: new Date().toISOString()
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
      snapshot.updatedAt = new Date().toISOString()
      console.log("Serving graph snapshot")
      return Response.json(snapshot, { headers: corsHeaders })
    }

    return new Response("Not found", { status: 404, headers: corsHeaders })
  }
})

console.log(`Indra API running at ${server.url}`)
