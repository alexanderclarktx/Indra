import { IndraVersion, Graph, Node, ProcessingEvent } from "@indra/core"

const svgNS = "http://www.w3.org/2000/svg"
const labelMaxLength = 12
const labelPadding = 16
const minRadius = 22
const maxRadius = 44

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) {
    throw new Error(`Missing element with id "${id}"`)
  }
  return element as T
}

const graphContainer = getRequiredElement<HTMLDivElement>("graph")
const status = getRequiredElement<HTMLDivElement>("status")
const title = getRequiredElement<HTMLDivElement>("graph-title")
const version = getRequiredElement<HTMLDivElement>("version")
const processingList = getRequiredElement<HTMLDivElement>("processing-list")
const processingCount = getRequiredElement<HTMLDivElement>("processing-count")

let snapshot: Graph | null = null
let resizeHandle = 0
let tooltip: HTMLDivElement | null = null
let activeNodeId: string | null = null
let clickAwayBound = false
let refreshInFlight = false
const refreshIntervalMs = 2000
let currentLayout: SvgLayout | null = null

version.textContent = IndraVersion

function setStatus(text: string): void {
  status.textContent = text
}

function setTitle(text: string): void {
  title.textContent = `Indra Topology: ${text}`
}

function ensureTooltip(): HTMLDivElement {
  if (!tooltip) {
    tooltip = document.createElement("div")
    tooltip.className = "node-tooltip"
    tooltip.setAttribute("aria-hidden", "true")
    tooltip.addEventListener("click", (event) => {
      event.stopPropagation()
    })
  }
  graphContainer.appendChild(tooltip)
  return tooltip
}

function hideTooltip(): void {
  if (tooltip) {
    tooltip.classList.remove("is-open")
    tooltip.setAttribute("aria-hidden", "true")
  }
  activeNodeId = null
}

function ensureClickAwayHandler(): void {
  if (clickAwayBound) {
    return
  }
  document.addEventListener("click", () => {
    hideTooltip()
  })
  clickAwayBound = true
}

type NodePosition = {
  x: number
  y: number
  depth: number
}

type FlatNode = Omit<Node, "children"> & {
  parentId: string | null
}

function flattenNodes(roots: Node[]): FlatNode[] {
  const result: FlatNode[] = []
  const queue: Array<{ node: Node; parentId: string | null }> = roots.map((node) => ({
    node,
    parentId: null,
  }))

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      continue
    }
    const { node, parentId } = current
    const { children, ...rest } = node
    result.push({ ...rest, parentId })
    children?.forEach((child) => {
      queue.push({ node: child, parentId: node.id })
    })
  }

  return result
}

type LayoutResult = {
  positions: Map<string, NodePosition>
  radius: number
}

function buildLayout(
  nodes: FlatNode[],
  width: number,
  height: number,
  radius: number
): LayoutResult {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const childrenByParent = new Map<string, FlatNode[]>()

  nodes.forEach((node) => {
    if (!node.parentId || !nodeById.has(node.parentId)) {
      return
    }
    const list = childrenByParent.get(node.parentId) ?? []
    list.push(node)
    childrenByParent.set(node.parentId, list)
  })

  const roots = nodes.filter((node) => !node.parentId || !nodeById.has(node.parentId))
  const depthMap = new Map<string, number>()
  const queue: Array<{ node: FlatNode; depth: number }> = roots.map((node) => ({
    node,
    depth: 0,
  }))

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || depthMap.has(current.node.id)) {
      continue
    }
    depthMap.set(current.node.id, current.depth)
    const children = childrenByParent.get(current.node.id) ?? []
    children.forEach((child) => {
      queue.push({ node: child, depth: current.depth + 1 })
    })
  }

  nodes.forEach((node) => {
    if (!depthMap.has(node.id)) {
      depthMap.set(node.id, 0)
    }
  })

  const levels = new Map<number, FlatNode[]>()
  nodes.forEach((node) => {
    const depth = depthMap.get(node.id) ?? 0
    const list = levels.get(depth) ?? []
    list.push(node)
    levels.set(depth, list)
  })

  const depthValues = Array.from(levels.keys())
  const maxDepth = depthValues.length > 0 ? Math.max(...depthValues) : 0
  const paddingX = Math.max(radius * 2.4, width * 0.12)
  const paddingY = Math.max(radius * 2, height * 0.08)
  const availableWidth = Math.max(0, width - paddingX * 2)
  const availableHeight = Math.max(0, height - paddingY * 2)

  const positions = new Map<string, NodePosition>()

  const placeLevel = (nodesAtLevel: FlatNode[], depth: number, x: number) => {
    const count = nodesAtLevel.length
    if (count === 0) {
      return
    }
    if (count === 1) {
      positions.set(nodesAtLevel[0].id, { x, y: height / 2, depth })
      return
    }
    const gap = count > 1 ? availableHeight / (count - 1) : availableHeight
    nodesAtLevel.forEach((node, index) => {
      const y = paddingY + index * gap
      positions.set(node.id, { x, y, depth })
    })
  }

  if (maxDepth === 0) {
    const nodesAtLevel = levels.get(0) ?? []
    placeLevel(nodesAtLevel, 0, width / 2)
  } else {
    const horizontalGap = availableWidth / maxDepth
    levels.forEach((nodesAtLevel, depth) => {
      const x = paddingX + depth * horizontalGap
      placeLevel(nodesAtLevel, depth, x)
    })
  }

  return { positions, radius }
}

function truncateLabel(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, Math.max(1, maxLength - 3))}...`
}

function getNodeLabel(id: string): string {
  return truncateLabel(id, labelMaxLength)
}

function measureMaxLabelWidth(labels: string[]): number {
  if (labels.length === 0 || !document.body) {
    return 0
  }
  const svg = document.createElementNS(svgNS, "svg")
  svg.setAttribute("width", "0")
  svg.setAttribute("height", "0")
  svg.setAttribute("aria-hidden", "true")
  svg.style.position = "absolute"
  svg.style.visibility = "hidden"
  svg.style.pointerEvents = "none"
  svg.style.left = "-9999px"
  svg.style.top = "-9999px"

  const text = document.createElementNS(svgNS, "text")
  text.classList.add("node-label")
  svg.appendChild(text)
  document.body.appendChild(svg)

  let maxWidth = 0
  try {
    labels.forEach((label) => {
      text.textContent = label
      maxWidth = Math.max(maxWidth, text.getComputedTextLength())
    })
  } finally {
    document.body.removeChild(svg)
  }
  return maxWidth
}

function getRequiredRadius(nodes: FlatNode[]): number {
  const labels = nodes.map((node) => getNodeLabel(node.id))
  const maxWidth = measureMaxLabelWidth(labels)
  if (maxWidth <= 0) {
    return 0
  }
  return maxWidth / 2 + labelPadding
}

function getLayoutRadius(nodes: FlatNode[], width: number, height: number): number {
  const baseRadius = Math.max(
    minRadius,
    Math.min(maxRadius, Math.min(width, height) * 0.05)
  )
  const labelRadius = getRequiredRadius(nodes)
  return Math.max(baseRadius, labelRadius)
}

type SvgLayout = LayoutResult & {
  svg: SVGSVGElement
  width: number
  height: number
  nodeCounts: Map<string, SVGTextElement>
}

function buildSvg(flatNodes: FlatNode[], width: number, height: number): SvgLayout {
  const svg = document.createElementNS(svgNS, "svg")
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`)
  svg.setAttribute("width", `${width}`)
  svg.setAttribute("height", `${height}`)

  const radius = getLayoutRadius(flatNodes, width, height)
  const { positions } = buildLayout(flatNodes, width, height, radius)
  const edges = document.createElementNS(svgNS, "g")
  const nodes = document.createElementNS(svgNS, "g")
  const nodeCounts = new Map<string, SVGTextElement>()

  const edgesList = flatNodes
    .map((node) => {
      if (!node.parentId) {
        return null
      }
      const parentPos = positions.get(node.parentId)
      const nodePos = positions.get(node.id)
      if (!parentPos || !nodePos) {
        return null
      }
      const dx = nodePos.x - parentPos.x
      const dy = nodePos.y - parentPos.y
      const distance = Math.hypot(dx, dy)
      if (distance <= radius * 2) {
        return null
      }
      const ux = dx / distance
      const uy = dy / distance
      return {
        node,
        x1: parentPos.x + ux * radius,
        y1: parentPos.y + uy * radius,
        x2: nodePos.x - ux * radius,
        y2: nodePos.y - uy * radius,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  edgesList.forEach((edge, index) => {
    const line = document.createElementNS(svgNS, "line")
    line.setAttribute("x1", edge.x1.toFixed(2))
    line.setAttribute("y1", edge.y1.toFixed(2))
    line.setAttribute("x2", edge.x2.toFixed(2))
    line.setAttribute("y2", edge.y2.toFixed(2))
    line.classList.add("edge")
    line.style.animationDelay = `${index * 0.08}s`
    edges.appendChild(line)
  })

  flatNodes.forEach((node, index) => {
    const position = positions.get(node.id)
    if (!position) {
      return
    }
    const wrapper = document.createElementNS(svgNS, "g")
    wrapper.setAttribute("transform", `translate(${position.x}, ${position.y})`)

    const group = document.createElementNS(svgNS, "g")
    group.classList.add("node")
    group.style.animationDelay = `${index * 0.06}s`
    group.dataset.nodeId = node.id

    const circle = document.createElementNS(svgNS, "circle")
    circle.setAttribute("r", radius.toFixed(2))
    circle.classList.add("node-circle", "agent")

    const label = document.createElementNS(svgNS, "text")
    label.classList.add("node-label")
    label.setAttribute("text-anchor", "middle")
    label.setAttribute("dominant-baseline", "middle")
    label.textContent = getNodeLabel(node.id)

    const count = document.createElementNS(svgNS, "text")
    count.classList.add("node-count")
    count.setAttribute("text-anchor", "middle")
    count.setAttribute("dominant-baseline", "middle")
    count.setAttribute("y", `${-(radius + 12)}`)
    count.textContent = String(node.processed ?? 0)
    nodeCounts.set(node.id, count)

    const title = document.createElementNS(svgNS, "title")
    title.textContent = node.id

    group.append(title, circle, label, count)
    wrapper.appendChild(group)
    nodes.appendChild(wrapper)
  })

  svg.append(edges, nodes)
  return { svg, positions, radius, width, height, nodeCounts }
}

function setTooltipContent(tooltipEl: HTMLDivElement, node: FlatNode): void {
  tooltipEl.innerHTML = ""
  const rows: Array<{ label: string; value: string }> = [
    { label: "name", value: node.id },
  ]

  // if (node.type === "agent") {
  rows.push({ label: "prompt", value: node.prompt })
  // } else {
  //   rows.push({ label: "code", value: node.code })
  // }

  rows.forEach((row) => {
    const rowEl = document.createElement("div")
    rowEl.className = "node-tooltip-row"

    const key = document.createElement("span")
    key.className = "node-tooltip-key"
    key.textContent = `${row.label}:`

    const value = document.createElement("span")
    value.className = "node-tooltip-value"
    value.textContent = row.value

    rowEl.append(key, value)
    tooltipEl.appendChild(rowEl)
  })
}

function positionTooltip(position: NodePosition, layout: SvgLayout): void {
  if (!tooltip) {
    return
  }
  const rect = graphContainer.getBoundingClientRect()
  const scaleX = rect.width / layout.width
  const scaleY = rect.height / layout.height
  const x = position.x * scaleX
  const y = position.y * scaleY
  const offsetY = (layout.radius + 12) * scaleY

  tooltip.style.visibility = "hidden"
  tooltip.classList.add("is-open")
  tooltip.setAttribute("aria-hidden", "false")

  requestAnimationFrame(() => {
    if (!tooltip) {
      return
    }
    const tooltipRect = tooltip.getBoundingClientRect()
    const margin = 8
    let left = x - tooltipRect.width / 2
    let top = y + offsetY
    left = Math.min(Math.max(margin, left), rect.width - tooltipRect.width - margin)
    top = Math.min(Math.max(margin, top), rect.height - tooltipRect.height - margin)
    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
    tooltip.style.visibility = "visible"
  })
}

function attachNodeInteractions(nodes: FlatNode[], layout: SvgLayout): void {
  const tooltipEl = ensureTooltip()
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const groups = layout.svg.querySelectorAll<SVGGElement>(".node")

  groups.forEach((group) => {
    const nodeId = group.dataset.nodeId
    if (!nodeId) {
      return
    }
    const node = nodesById.get(nodeId)
    const position = layout.positions.get(nodeId)
    if (!node || !position) {
      return
    }

    group.addEventListener("click", (event) => {
      event.stopPropagation()
      if (activeNodeId === node.id) {
        hideTooltip()
        return
      }
      activeNodeId = node.id
      setTooltipContent(tooltipEl, node)
      positionTooltip(position, layout)
    })
  })
}

function formatDuration(durationMs: number): string {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(2)}s`
  }
  return `${durationMs}ms`
}

function renderProcessingEvents(events: ProcessingEvent[] | undefined): void {
  const list = events ?? []
  processingList.innerHTML = ""
  processingCount.textContent = `${list.length} event${list.length === 1 ? "" : "s"}`

  if (list.length === 0) {
    const empty = document.createElement("div")
    empty.className = "processing-empty"
    empty.textContent = "No processing events yet."
    processingList.appendChild(empty)
    return
  }

  const sorted = [...list].sort((a, b) => b.startedAt - a.startedAt)
  sorted.forEach((event) => {
    const card = document.createElement("article")
    card.className = "processing-card"

    const header = document.createElement("div")
    header.className = "processing-card-header"

    const node = document.createElement("div")
    node.className = "processing-node"
    node.textContent = event.nodeId

    const time = document.createElement("div")
    time.className = "processing-time"
    time.textContent = formatDuration(event.durationMs)

    header.append(node, time)
    card.appendChild(header)

    if (event.inputMessage) {
      const input = document.createElement("div")
      input.className = "processing-row"

      const label = document.createElement("div")
      label.className = "processing-label"
      label.textContent = "Input"

      const message = document.createElement("div")
      message.className = "processing-message"
      message.textContent = event.inputMessage

      input.append(label, message)
      card.appendChild(input)
    }

    if (event.outputMessage) {
      const output = document.createElement("div")
      output.className = "processing-row"

      const label = document.createElement("div")
      label.className = "processing-label"
      label.textContent = "Output"

      const message = document.createElement("div")
      message.className = "processing-message"
      message.textContent = event.outputMessage

      output.append(label, message)
      card.appendChild(output)
    }

    processingList.appendChild(card)
  })
}

function renderSnapshot(data: Graph): void {
  snapshot = data
  graphContainer.innerHTML = ""
  hideTooltip()
  ensureClickAwayHandler()
  setTitle(data.name)

  const flatNodes = flattenNodes(data.nodes)

  if (flatNodes.length === 0) {
    const placeholder = document.createElement("div")
    placeholder.className = "placeholder"
    placeholder.textContent = "No nodes in topology."
    graphContainer.appendChild(placeholder)
    setStatus("No nodes in topology")
    currentLayout = null
    return
  }

  const rect = graphContainer.getBoundingClientRect()
  const width = Math.max(320, Math.floor(rect.width))
  const height = Math.max(320, Math.floor(rect.height))
  const layout = buildSvg(flatNodes, width, height)
  graphContainer.appendChild(layout.svg)
  attachNodeInteractions(flatNodes, layout)
  currentLayout = layout
}

function canUpdateCounts(current: Graph, nextFlatNodes: FlatNode[]): boolean {
  const currentFlatNodes = flattenNodes(current.nodes)
  if (currentFlatNodes.length !== nextFlatNodes.length) {
    return false
  }
  const currentById = new Map(currentFlatNodes.map((node) => [node.id, node.parentId]))
  for (const node of nextFlatNodes) {
    const existingParentId = currentById.get(node.id)
    if (existingParentId === undefined || existingParentId !== node.parentId) {
      return false
    }
  }
  return true
}

function updateNodeCounts(data: Graph): boolean {
  if (!snapshot || !currentLayout) {
    return false
  }
  const nextFlatNodes = flattenNodes(data.nodes)
  if (!canUpdateCounts(snapshot, nextFlatNodes)) {
    return false
  }
  nextFlatNodes.forEach((node) => {
    const countEl = currentLayout?.nodeCounts.get(node.id)
    if (countEl) {
      countEl.textContent = String(node.processed ?? 0)
    }
  })
  snapshot = data
  return true
}

async function loadSnapshot(): Promise<void> {
  if (refreshInFlight) {
    return
  }
  refreshInFlight = true
  try {
    const res = await fetch("http://localhost:5001/api/graph")
    if (!res.ok) {
      throw new Error("Failed to load graph snapshot")
    }
    const data = (await res.json()) as Graph
    if (!updateNodeCounts(data)) {
      renderSnapshot(data)
    }
    renderProcessingEvents(data.processingEvents)
  } finally {
    refreshInFlight = false
  }
}

const resizeObserver = new ResizeObserver(() => {
  if (!snapshot) {
    return
  }
  cancelAnimationFrame(resizeHandle)
  resizeHandle = requestAnimationFrame(() => {
    if (snapshot) {
      renderSnapshot(snapshot)
    }
  })
})

resizeObserver.observe(graphContainer)

if (document.fonts) {
  document.fonts
    .ready
    .then(() => {
      if (snapshot) {
        renderSnapshot(snapshot)
      }
    })
    .catch(() => {})
}

loadSnapshot().catch((err) => {
  console.error(err)
  setStatus("Offline")
})

setInterval(() => {
  loadSnapshot().catch((err) => {
    console.error(err)
    setStatus("Offline")
  })
}, refreshIntervalMs)
