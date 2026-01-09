// app.ts
var svgNS = "http://www.w3.org/2000/svg";
console.log("Initializing app...");
function getRequiredElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element with id "${id}"`);
  }
  return element;
}
var graphContainer = getRequiredElement("graph");
var status = getRequiredElement("status");
var snapshot = null;
var resizeHandle = 0;
function formatTime(iso) {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function setStatus(text) {
  status.textContent = text;
}
function buildLayout(nodes, width, height) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childrenByParent = new Map;
  nodes.forEach((node) => {
    if (!node.parentId || !nodeById.has(node.parentId)) {
      return;
    }
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  });
  const roots = nodes.filter((node) => !node.parentId || !nodeById.has(node.parentId));
  const depthMap = new Map;
  const queue = roots.map((node) => ({
    node,
    depth: 0
  }));
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || depthMap.has(current.node.id)) {
      continue;
    }
    depthMap.set(current.node.id, current.depth);
    const children = childrenByParent.get(current.node.id) ?? [];
    children.forEach((child) => {
      queue.push({ node: child, depth: current.depth + 1 });
    });
  }
  nodes.forEach((node) => {
    if (!depthMap.has(node.id)) {
      depthMap.set(node.id, 0);
    }
  });
  const levels = new Map;
  nodes.forEach((node) => {
    const depth = depthMap.get(node.id) ?? 0;
    const list = levels.get(depth) ?? [];
    list.push(node);
    levels.set(depth, list);
  });
  const depthValues = Array.from(levels.keys());
  const maxDepth = depthValues.length > 0 ? Math.max(...depthValues) : 0;
  const radius = Math.max(22, Math.min(44, Math.min(width, height) * 0.05));
  const paddingX = Math.max(radius * 2, width * 0.08);
  const paddingY = Math.max(radius * 2.4, height * 0.12);
  const availableWidth = Math.max(0, width - paddingX * 2);
  const availableHeight = Math.max(0, height - paddingY * 2);
  const positions = new Map;
  const placeLevel = (nodesAtLevel, depth, y) => {
    const count = nodesAtLevel.length;
    if (count === 0) {
      return;
    }
    if (count === 1) {
      positions.set(nodesAtLevel[0].id, { x: width / 2, y, depth });
      return;
    }
    const gap = count > 1 ? availableWidth / (count - 1) : availableWidth;
    nodesAtLevel.forEach((node, index) => {
      const x = paddingX + index * gap;
      positions.set(node.id, { x, y, depth });
    });
  };
  if (maxDepth === 0) {
    const nodesAtLevel = levels.get(0) ?? [];
    placeLevel(nodesAtLevel, 0, height / 2);
  } else {
    const verticalGap = availableHeight / maxDepth;
    levels.forEach((nodesAtLevel, depth) => {
      const y = paddingY + depth * verticalGap;
      placeLevel(nodesAtLevel, depth, y);
    });
  }
  return { positions, radius };
}
function truncateLabel(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(1, maxLength - 3))}...`;
}
function buildSvg(data, width, height) {
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", `${width}`);
  svg.setAttribute("height", `${height}`);
  const { positions, radius } = buildLayout(data.graph.nodes, width, height);
  const edges = document.createElementNS(svgNS, "g");
  const nodes = document.createElementNS(svgNS, "g");
  const edgesList = data.graph.nodes.map((node) => {
    if (!node.parentId) {
      return null;
    }
    const parentPos = positions.get(node.parentId);
    const nodePos = positions.get(node.id);
    if (!parentPos || !nodePos) {
      return null;
    }
    return { node, parentPos, nodePos };
  }).filter((item) => Boolean(item));
  edgesList.forEach((edge, index) => {
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", edge.parentPos.x.toFixed(2));
    line.setAttribute("y1", edge.parentPos.y.toFixed(2));
    line.setAttribute("x2", edge.nodePos.x.toFixed(2));
    line.setAttribute("y2", edge.nodePos.y.toFixed(2));
    line.classList.add("edge");
    line.style.animationDelay = `${index * 0.08}s`;
    edges.appendChild(line);
  });
  data.graph.nodes.forEach((node, index) => {
    const position = positions.get(node.id);
    if (!position) {
      return;
    }
    const wrapper = document.createElementNS(svgNS, "g");
    wrapper.setAttribute("transform", `translate(${position.x}, ${position.y})`);
    const group = document.createElementNS(svgNS, "g");
    group.classList.add("node");
    group.style.animationDelay = `${index * 0.06}s`;
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("r", radius.toFixed(2));
    circle.classList.add("node-circle", node.type);
    const label = document.createElementNS(svgNS, "text");
    label.classList.add("node-label");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.textContent = truncateLabel(node.id, 12);
    const title = document.createElementNS(svgNS, "title");
    title.textContent = node.id;
    group.append(title, circle, label);
    wrapper.appendChild(group);
    nodes.appendChild(wrapper);
  });
  svg.append(edges, nodes);
  return svg;
}
function renderSnapshot(data) {
  snapshot = data;
  graphContainer.innerHTML = "";
  if (data.graph.nodes.length === 0) {
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    placeholder.textContent = "No nodes in topology.";
    graphContainer.appendChild(placeholder);
    setStatus("No nodes in topology");
    return;
  }
  const rect = graphContainer.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(320, Math.floor(rect.height));
  const svg = buildSvg(data, width, height);
  graphContainer.appendChild(svg);
  setStatus(`Updated ${formatTime(data.updatedAt)}`);
}
async function loadSnapshot() {
  console.log("Loading graph snapshot...");
  const res = await fetch("http://localhost:5001/api/graph");
  if (!res.ok) {
    throw new Error("Failed to load graph snapshot");
  }
  console.log("Loaded graph snapshot");
  const data = await res.json();
  renderSnapshot(data);
}
var resizeObserver = new ResizeObserver(() => {
  if (!snapshot) {
    return;
  }
  cancelAnimationFrame(resizeHandle);
  resizeHandle = requestAnimationFrame(() => {
    if (snapshot) {
      renderSnapshot(snapshot);
    }
  });
});
resizeObserver.observe(graphContainer);
console.log("Starting app...");
loadSnapshot().catch((err) => {
  console.error(err);
  setStatus("Offline");
});
console.log("ABCCC");
