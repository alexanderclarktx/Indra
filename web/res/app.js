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
var tooltip = null;
var activeNodeId = null;
var clickAwayBound = false;
function setStatus(text) {
  status.textContent = text;
}
function ensureTooltip() {
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "node-tooltip";
    tooltip.setAttribute("aria-hidden", "true");
    tooltip.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }
  graphContainer.appendChild(tooltip);
  return tooltip;
}
function hideTooltip() {
  if (tooltip) {
    tooltip.classList.remove("is-open");
    tooltip.setAttribute("aria-hidden", "true");
  }
  activeNodeId = null;
}
function ensureClickAwayHandler() {
  if (clickAwayBound) {
    return;
  }
  document.addEventListener("click", () => {
    hideTooltip();
  });
  clickAwayBound = true;
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
  const paddingX = Math.max(radius * 2.4, width * 0.12);
  const paddingY = Math.max(radius * 2, height * 0.08);
  const availableWidth = Math.max(0, width - paddingX * 2);
  const availableHeight = Math.max(0, height - paddingY * 2);
  const positions = new Map;
  const placeLevel = (nodesAtLevel, depth, x) => {
    const count = nodesAtLevel.length;
    if (count === 0) {
      return;
    }
    if (count === 1) {
      positions.set(nodesAtLevel[0].id, { x, y: height / 2, depth });
      return;
    }
    const gap = count > 1 ? availableHeight / (count - 1) : availableHeight;
    nodesAtLevel.forEach((node, index) => {
      const y = paddingY + index * gap;
      positions.set(node.id, { x, y, depth });
    });
  };
  if (maxDepth === 0) {
    const nodesAtLevel = levels.get(0) ?? [];
    placeLevel(nodesAtLevel, 0, width / 2);
  } else {
    const horizontalGap = availableWidth / maxDepth;
    levels.forEach((nodesAtLevel, depth) => {
      const x = paddingX + depth * horizontalGap;
      placeLevel(nodesAtLevel, depth, x);
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
  const { positions, radius } = buildLayout(data.nodes, width, height);
  const edges = document.createElementNS(svgNS, "g");
  const nodes = document.createElementNS(svgNS, "g");
  const edgesList = data.nodes.map((node) => {
    if (!node.parentId) {
      return null;
    }
    const parentPos = positions.get(node.parentId);
    const nodePos = positions.get(node.id);
    if (!parentPos || !nodePos) {
      return null;
    }
    const dx = nodePos.x - parentPos.x;
    const dy = nodePos.y - parentPos.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= radius * 2) {
      return null;
    }
    const ux = dx / distance;
    const uy = dy / distance;
    return {
      node,
      x1: parentPos.x + ux * radius,
      y1: parentPos.y + uy * radius,
      x2: nodePos.x - ux * radius,
      y2: nodePos.y - uy * radius
    };
  }).filter((item) => Boolean(item));
  edgesList.forEach((edge, index) => {
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", edge.x1.toFixed(2));
    line.setAttribute("y1", edge.y1.toFixed(2));
    line.setAttribute("x2", edge.x2.toFixed(2));
    line.setAttribute("y2", edge.y2.toFixed(2));
    line.classList.add("edge");
    line.style.animationDelay = `${index * 0.08}s`;
    edges.appendChild(line);
  });
  data.nodes.forEach((node, index) => {
    const position = positions.get(node.id);
    if (!position) {
      return;
    }
    const wrapper = document.createElementNS(svgNS, "g");
    wrapper.setAttribute("transform", `translate(${position.x}, ${position.y})`);
    const group = document.createElementNS(svgNS, "g");
    group.classList.add("node");
    group.style.animationDelay = `${index * 0.06}s`;
    group.dataset.nodeId = node.id;
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("r", radius.toFixed(2));
    circle.classList.add("node-circle", "agent");
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
  return { svg, positions, radius, width, height };
}
function setTooltipContent(tooltipEl, node) {
  tooltipEl.innerHTML = "";
  const rows = [
    { label: "name", value: node.id }
  ];
  rows.push({ label: "prompt", value: node.prompt });
  rows.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "node-tooltip-row";
    const key = document.createElement("span");
    key.className = "node-tooltip-key";
    key.textContent = `${row.label}:`;
    const value = document.createElement("span");
    value.className = "node-tooltip-value";
    value.textContent = row.value;
    rowEl.append(key, value);
    tooltipEl.appendChild(rowEl);
  });
}
function positionTooltip(position, layout) {
  if (!tooltip) {
    return;
  }
  const rect = graphContainer.getBoundingClientRect();
  const scaleX = rect.width / layout.width;
  const scaleY = rect.height / layout.height;
  const x = position.x * scaleX;
  const y = position.y * scaleY;
  const offsetY = (layout.radius + 12) * scaleY;
  tooltip.style.visibility = "hidden";
  tooltip.classList.add("is-open");
  tooltip.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    if (!tooltip) {
      return;
    }
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 8;
    let left = x - tooltipRect.width / 2;
    let top = y + offsetY;
    left = Math.min(Math.max(margin, left), rect.width - tooltipRect.width - margin);
    top = Math.min(Math.max(margin, top), rect.height - tooltipRect.height - margin);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.visibility = "visible";
  });
}
function attachNodeInteractions(nodes, layout) {
  const tooltipEl = ensureTooltip();
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const groups = layout.svg.querySelectorAll(".node");
  groups.forEach((group) => {
    const nodeId = group.dataset.nodeId;
    if (!nodeId) {
      return;
    }
    const node = nodesById.get(nodeId);
    const position = layout.positions.get(nodeId);
    if (!node || !position) {
      return;
    }
    group.addEventListener("click", (event) => {
      event.stopPropagation();
      if (activeNodeId === node.id) {
        hideTooltip();
        return;
      }
      activeNodeId = node.id;
      setTooltipContent(tooltipEl, node);
      positionTooltip(position, layout);
    });
  });
}
function renderSnapshot(data) {
  snapshot = data;
  graphContainer.innerHTML = "";
  hideTooltip();
  ensureClickAwayHandler();
  if (data.nodes.length === 0) {
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
  const layout = buildSvg(data, width, height);
  graphContainer.appendChild(layout.svg);
  attachNodeInteractions(data.nodes, layout);
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
