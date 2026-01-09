

// type NodeType = "agent" | "code";

import { GraphSnapshot } from "@indra/core"

// type NodeBase = {
//   id: string;
//   parentId?: string | null;
//   type: NodeType;
// };

// type AgentNode = NodeBase & {
//   type: "agent";
//   prompt: string;
// };

// type CodeNode = NodeBase & {
//   type: "code";
//   code: string;
// };

// type GraphNode = AgentNode | CodeNode;

// type Graph = {
//   id: string;
//   name: string;
//   nodes: GraphNode[];
// };

// type AuditEvent = {
//   id: string;
//   nodeId: string;
//   message: string;
//   timestamp: string;
// };

// type MetricPoint = {
//   label: string;
//   value: number;
// };

// type GraphSnapshot = {
//   graph: Graph;
//   audit: AuditEvent[];
//   metrics: MetricPoint[];
//   updatedAt: string;
// };

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element with id "${id}"`);
  }
  return element as T;
}

const meta = getRequiredElement<HTMLDivElement>("graph-meta");
const updated = getRequiredElement<HTMLSpanElement>("updated");
const metrics = getRequiredElement<HTMLDivElement>("metrics");
const nodes = getRequiredElement<HTMLDivElement>("nodes");
const audit = getRequiredElement<HTMLDivElement>("audit");
const refresh = getRequiredElement<HTMLButtonElement>("refresh");

let snapshot: GraphSnapshot | null = null;
let activeNodeId: string | null = null;

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderMeta(data: GraphSnapshot) {
  meta.innerHTML = "";
  const name = document.createElement("span");
  name.textContent = `Name: ${data.graph.name}`;
  const id = document.createElement("span");
  id.textContent = `ID: ${data.graph.id}`;
  const count = document.createElement("span");
  count.textContent = `Nodes: ${data.graph.nodes.length}`;
  meta.append(name, id, count);
}

function renderMetrics(data: GraphSnapshot) {
  metrics.innerHTML = "";
  data.metrics.forEach((metric) => {
    const item = document.createElement("div");
    item.className = "metric";
    const label = document.createElement("span");
    label.textContent = metric.label;
    const value = document.createElement("strong");
    value.textContent = String(metric.value);
    item.append(label, value);
    metrics.append(item);
  });
}

function renderNodes(data: GraphSnapshot) {
  nodes.innerHTML = "";
  data.graph.nodes.forEach((node) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "node";
    if (node.id === activeNodeId) {
      card.classList.add("active");
    }

    const type = document.createElement("span");
    type.textContent = node.type === "agent" ? "Agent node" : "Code node";
    const title = document.createElement("strong");
    title.textContent = node.id;
    const detail = document.createElement("p");
    detail.textContent =
      node.type === "agent" ? node.prompt : `Runs: ${node.code}`;

    card.append(type, title, detail);
    card.addEventListener("click", () => {
      activeNodeId = node.id;
      renderNodes(data);
      renderAudit(data);
    });

    nodes.append(card);
  });
}

function renderAudit(data: GraphSnapshot) {
  audit.innerHTML = "";
  const entries = activeNodeId
    ? data.audit.filter((item) => item.nodeId === activeNodeId)
    : data.audit;

  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "audit-item";
    empty.textContent = "No audit events for this node yet.";
    audit.append(empty);
    return;
  }

  entries.forEach((item) => {
    const row = document.createElement("div");
    row.className = "audit-item";
    const message = document.createElement("strong");
    message.textContent = item.message;
    const metaRow = document.createElement("small");
    metaRow.textContent = `${item.nodeId} • ${formatTime(item.timestamp)}`;
    row.append(message, metaRow);
    audit.append(row);
  });
}

function render(data: GraphSnapshot) {
  snapshot = data;
  renderMeta(data);
  renderMetrics(data);
  renderNodes(data);
  renderAudit(data);
  updated.textContent = `Updated ${formatTime(data.updatedAt)}`;
}

async function loadSnapshot(): Promise<void> {
  const res = await fetch("/api/graph");
  if (!res.ok) {
    throw new Error("Failed to load graph snapshot");
  }
  const data = (await res.json()) as GraphSnapshot;
  render(data);
}

refresh.addEventListener("click", () => {
  activeNodeId = null;
  loadSnapshot().catch((err) => {
    console.error(err);
  });
});

loadSnapshot().catch((err) => {
  console.error(err);
  updated.textContent = "Offline";
});
