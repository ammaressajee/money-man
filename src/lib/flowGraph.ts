import { OWNER_LABELS, OWNERS } from '../types/db'
import type { MonthlySummary } from './summary'

/**
 * Builds the month's money movement as a Sankey graph:
 * paychecks → personal checking → joint checking → destinations,
 * with every ribbon sized proportionally to its dollar amount.
 */

export type FlowTone = 'income' | 'account' | 'wealth' | 'spend' | 'leftover' | 'shortfall'

export interface FlowNode {
  id: string
  label: string
  /** Logical depth: 0 sources, 1 personal checking, 2 joint, 3 destinations. */
  column: number
  color: string
  tone: FlowTone
}

export interface FlowLink {
  source: string
  target: string
  value: number
}

export interface FlowGraph {
  nodes: FlowNode[]
  links: FlowLink[]
}

/** Hex values mirror the CSS theme tokens in index.css (SVG needs literals). */
const TONE_COLORS = {
  income: '#172723',
  checking: '#3d5049',
  joint: '#6b7a74',
  save: '#4a9a8b',
  invest: '#0e7a6d',
  retire: '#2b5d70',
  jointBills: '#9c4f2e',
  bills: '#b96a45',
  cards: '#c58057',
  other: '#d29b78',
  leftover: '#a9b3ae',
  shortfall: '#b3452f',
} as const

/** Flows under 50¢/mo are noise — drop them so the diagram stays clean. */
const MIN_FLOW = 0.5

export function buildMoneyFlowGraph(summary: MonthlySummary): FlowGraph {
  const links: FlowLink[] = []
  const link = (source: string, target: string, value: number) => {
    if (value >= MIN_FLOW) links.push({ source, target, value })
  }

  for (const owner of OWNERS) {
    const s = summary[owner]
    const checking = `checking-${owner}`
    link(`income-${owner}`, checking, s.income)

    // Balance the account: leftover stays unallocated, a deficit is
    // covered from buffer/savings and shown as an inflow.
    const leftover = s.income - s.wealth - s.totalOutflow
    if (leftover <= -MIN_FLOW) link(`shortfall-${owner}`, checking, -leftover)

    link(checking, 'saving', s.saving)
    link(checking, 'investment', s.investing)
    link(checking, 'retirement', s.retirement)
    link(checking, 'joint', s.fairShare)
    link(checking, 'bills', s.personalExpenses)
    link(checking, 'cards', s.cardSpend)
    link(checking, 'other', s.otherSpend)
    if (leftover >= MIN_FLOW) link(checking, 'leftover', leftover)
  }

  link('joint', 'joint-bills', summary.jointExpenses)

  // Declaration order = vertical stacking order within each column.
  const nodes: FlowNode[] = [
    ...OWNERS.flatMap((owner): FlowNode[] => [
      {
        id: `income-${owner}`,
        label: `${OWNER_LABELS[owner]}'s pay`,
        column: 0,
        color: TONE_COLORS.income,
        tone: 'income',
      },
      {
        id: `shortfall-${owner}`,
        label: 'Shortfall',
        column: 0,
        color: TONE_COLORS.shortfall,
        tone: 'shortfall',
      },
    ]),
    ...OWNERS.map(
      (owner): FlowNode => ({
        id: `checking-${owner}`,
        label: `${OWNER_LABELS[owner]} · Checking`,
        column: 1,
        color: TONE_COLORS.checking,
        tone: 'account',
      }),
    ),
    { id: 'joint', label: 'Joint checking', column: 2, color: TONE_COLORS.joint, tone: 'account' },
    { id: 'saving', label: 'Savings', column: 3, color: TONE_COLORS.save, tone: 'wealth' },
    { id: 'investment', label: 'Investments', column: 3, color: TONE_COLORS.invest, tone: 'wealth' },
    { id: 'retirement', label: 'Retirement', column: 3, color: TONE_COLORS.retire, tone: 'wealth' },
    { id: 'joint-bills', label: 'Shared bills', column: 3, color: TONE_COLORS.jointBills, tone: 'spend' },
    { id: 'bills', label: 'Personal bills', column: 3, color: TONE_COLORS.bills, tone: 'spend' },
    { id: 'cards', label: 'Credit cards', column: 3, color: TONE_COLORS.cards, tone: 'spend' },
    { id: 'other', label: 'Other spend', column: 3, color: TONE_COLORS.other, tone: 'spend' },
    { id: 'leftover', label: 'Unallocated', column: 3, color: TONE_COLORS.leftover, tone: 'leftover' },
  ]

  const referenced = new Set(links.flatMap((l) => [l.source, l.target]))
  return { nodes: nodes.filter((n) => referenced.has(n.id)), links }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export interface SankeyNode extends FlowNode {
  value: number
  x: number
  y: number
  height: number
}

export interface SankeyLink {
  source: SankeyNode
  target: SankeyNode
  value: number
  /** Filled ribbon path whose thickness encodes the dollar amount. */
  path: string
  /** Gradient endpoints (userSpaceOnUse coordinates). */
  sx: number
  sy: number
  tx: number
  ty: number
}

export type SankeyOrientation = 'horizontal' | 'vertical'

export interface SankeyLayout {
  nodes: SankeyNode[]
  links: SankeyLink[]
  nodeWidth: number
  orientation: SankeyOrientation
  width: number
  height: number
}

interface LayoutOptions {
  width: number
  height: number
  nodeWidth?: number
  /** Gap between nodes in the same column (along the value axis). */
  gap?: number
  orientation?: SankeyOrientation
}

const MIN_NODE_SIZE = 3
const MIN_RIBBON = 1.5

export function layoutSankey(graph: FlowGraph, options: LayoutOptions): SankeyLayout {
  const { width, height } = options
  const orientation = options.orientation ?? 'horizontal'
  const nodeWidth = options.nodeWidth ?? (orientation === 'vertical' ? 10 : 12)
  const gap = options.gap ?? (orientation === 'vertical' ? 10 : 18)
  const vertical = orientation === 'vertical'

  // Compress logical depths to consecutive columns (e.g. joint may be absent).
  const depths = [...new Set(graph.nodes.map((n) => n.column))].sort((a, b) => a - b)
  const columnOf = new Map(depths.map((d, i) => [d, i]))
  const numCols = depths.length

  const byId = new Map<string, SankeyNode>()
  const nodes: SankeyNode[] = graph.nodes.map((n) => {
    const placed: SankeyNode = {
      ...n,
      column: columnOf.get(n.column)!,
      value: 0,
      x: 0,
      y: 0,
      height: 0,
    }
    byId.set(n.id, placed)
    return placed
  })

  const links = graph.links.map((l) => ({
    source: byId.get(l.source)!,
    target: byId.get(l.target)!,
    value: l.value,
  }))

  for (const n of nodes) {
    const inSum = links.reduce((a, l) => (l.target === n ? a + l.value : a), 0)
    const outSum = links.reduce((a, l) => (l.source === n ? a + l.value : a), 0)
    n.value = Math.max(inSum, outSum)
  }

  // One shared $→px scale along the value axis (height H, width V).
  const valueSpan = vertical ? width : height
  let scale = Infinity
  for (let c = 0; c < numCols; c++) {
    const col = nodes.filter((n) => n.column === c)
    const total = col.reduce((a, n) => a + n.value, 0)
    const available = valueSpan - (col.length - 1) * gap - 12
    if (total > 0) scale = Math.min(scale, available / total)
  }
  if (!Number.isFinite(scale)) scale = 0

  const flowSpan = vertical ? height - nodeWidth : width - nodeWidth
  for (let c = 0; c < numCols; c++) {
    const col = nodes.filter((n) => n.column === c)
    const stackSize =
      col.reduce((a, n) => a + Math.max(n.value * scale, MIN_NODE_SIZE), 0) +
      (col.length - 1) * gap
    const flowPos = numCols > 1 ? (c * flowSpan) / (numCols - 1) : 0
    let valuePos = (valueSpan - stackSize) / 2
    for (const n of col) {
      const size = Math.max(n.value * scale, MIN_NODE_SIZE)
      if (vertical) {
        n.x = valuePos
        n.y = flowPos
        n.height = size // width of the bar along the value axis
      } else {
        n.x = flowPos
        n.y = valuePos
        n.height = size
      }
      valuePos += size + gap
    }
  }

  // Stack ribbon anchors on each node face, ordered to minimize crossings.
  const outCursor = new Map<SankeyNode, number>()
  const inCursor = new Map<SankeyNode, number>()
  for (const n of nodes) {
    const outTotal = links.reduce((a, l) => (l.source === n ? a + l.value : a), 0) * scale
    const inTotal = links.reduce((a, l) => (l.target === n ? a + l.value : a), 0) * scale
    if (vertical) {
      outCursor.set(n, n.x + (n.height - outTotal) / 2)
      inCursor.set(n, n.x + (n.height - inTotal) / 2)
    } else {
      outCursor.set(n, n.y + (n.height - outTotal) / 2)
      inCursor.set(n, n.y + (n.height - inTotal) / 2)
    }
  }

  const anchored = links.map((l) => ({ ...l, a0: 0, a1: 0, b0: 0, b1: 0 }))
  const sortByTarget = (a: (typeof anchored)[0], b: (typeof anchored)[0]) =>
    vertical
      ? a.target.x - b.target.x || a.target.column - b.target.column
      : a.target.y - b.target.y || a.target.column - b.target.column
  const sortBySource = (a: (typeof anchored)[0], b: (typeof anchored)[0]) =>
    vertical
      ? a.source.x - b.source.x || a.source.column - b.source.column
      : a.source.y - b.source.y || a.source.column - b.source.column

  for (const l of [...anchored].sort(sortByTarget)) {
    const p0 = outCursor.get(l.source)!
    l.a0 = p0
    l.a1 = p0 + l.value * scale
    outCursor.set(l.source, l.a1)
  }
  for (const l of [...anchored].sort(sortBySource)) {
    const p0 = inCursor.get(l.target)!
    l.b0 = p0
    l.b1 = p0 + l.value * scale
    inCursor.set(l.target, l.b1)
  }

  const r = (n: number) => Math.round(n * 100) / 100
  const placedLinks: SankeyLink[] = anchored.map((l) => {
    const thickness = Math.max(l.value * scale, MIN_RIBBON)
    const sMid = (l.a0 + l.a1) / 2
    const tMid = (l.b0 + l.b1) / 2
    const s0 = sMid - thickness / 2
    const s1 = sMid + thickness / 2
    const t0 = tMid - thickness / 2
    const t1 = tMid + thickness / 2

    if (vertical) {
      const sy = l.source.y + nodeWidth
      const ty = l.target.y
      const c1 = sy + (ty - sy) * 0.5
      const c2 = ty - (ty - sy) * 0.5
      const path =
        `M ${r(s0)} ${r(sy)} ` +
        `C ${r(s0)} ${r(c1)} ${r(t0)} ${r(c2)} ${r(t0)} ${r(ty)} ` +
        `L ${r(t1)} ${r(ty)} ` +
        `C ${r(t1)} ${r(c2)} ${r(s1)} ${r(c1)} ${r(s1)} ${r(sy)} Z`
      return {
        source: l.source,
        target: l.target,
        value: l.value,
        path,
        sx: sMid,
        sy,
        tx: tMid,
        ty,
      }
    }

    const sx = l.source.x + nodeWidth
    const tx = l.target.x
    const c1 = sx + (tx - sx) * 0.5
    const c2 = tx - (tx - sx) * 0.5
    const path =
      `M ${r(sx)} ${r(s0)} ` +
      `C ${r(c1)} ${r(s0)} ${r(c2)} ${r(t0)} ${r(tx)} ${r(t0)} ` +
      `L ${r(tx)} ${r(t1)} ` +
      `C ${r(c2)} ${r(t1)} ${r(c1)} ${r(s1)} ${r(sx)} ${r(s1)} Z`
    return {
      source: l.source,
      target: l.target,
      value: l.value,
      path,
      sx,
      sy: sMid,
      tx,
      ty: tMid,
    }
  })

  return { nodes, links: placedLinks, nodeWidth, orientation, width, height }
}
