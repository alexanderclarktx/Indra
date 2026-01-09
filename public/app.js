const meta = document.getElementById("graph-meta");
const updated = document.getElementById("updated");
const metrics = document.getElementById("metrics");
const nodes = document.getElementById("nodes");
const audit = document.getElementById("audit");
const refresh = document.getElementById("refresh");

let snapshot = null;
let activeNodeId = null;

function formatTime(iso) {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderMeta(data) {
  meta.innerHTML = "";
  const name = document.createElement("span");
  name.textContent = `Name: ${data.graph.name}`;
  const id = document.createElement("span");
  id.textContent = `ID: ${data.graph.id}`;
  const count = document.createElement("span");
  count.textContent = `Nodes: ${data.graph.nodes.length}`;
  meta.append(name, id, count);
}

function renderMetrics(data) {
  metrics.innerHTML = "";
  data.metrics.forEach((metric) => {
    const item = document.createElement("div");
    item.className = "metric";
    const label = document.createElement("span");
    label.textContent = metric.label;
    const value = document.createElement("strong");
    value.textContent = metric.value;
    item.append(label, value);
    metrics.append(item);
  });
}

function renderNodes(data) {
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

function renderAudit(data) {
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

function render(data) {
  snapshot = data;
  renderMeta(data);
  renderMetrics(data);
  renderNodes(data);
  renderAudit(data);
  updated.textContent = `Updated ${formatTime(data.updatedAt)}`;
}

async function loadSnapshot() {
  const res = await fetch("/api/graph");
  if (!res.ok) {
    throw new Error("Failed to load graph snapshot");
  }
  const data = await res.json();
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
