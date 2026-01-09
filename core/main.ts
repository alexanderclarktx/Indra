import type { GraphSnapshot } from "./types";

// const webDir = new URL("../web/", import.meta.url);

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
};

function isSafePath(pathname: string) {
  return !pathname.includes("..") && !pathname.includes("\\");
}

// function resolveWebFile(pathname: string) {
//   return new URL(`${

  // }/web${pathname === "/" ? "/index.html" : pathname}`)
  // if (pathname === "/") return new URL("index.html", webDir);
  // const trimmed = pathname.replace(/^\//, "");
  // return new URL(trimmed, webDir);
// }

Bun.serve({
  port: 5000,
  async fetch(req) {
    const url = new URL(req.url);

    console.log(`Received request for ${url.pathname}`);

    if (url.pathname === "/api/graph") {
      snapshot.updatedAt = new Date().toISOString();
      return Response.json(snapshot);
    }

    if (!isSafePath(url.pathname)) {
      return new Response("Invalid path", { status: 400 });
    }

    // const fileUrl = resolveWebFile(url.pathname);
    const file = Bun.file("web" + (url.pathname === "/" ? "/index.html" : url.pathname));
    if (!(await file.exists())) {
      console.log(`File not found: ${file.name}`);
      return new Response("Not found", { status: 404 });
    }

    return new Response(file);
  }
});

console.log("Graph stub running at http://localhost:5000");
