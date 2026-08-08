import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  buildMoneyFlowGraph,
  layoutSankey,
  type FlowTone,
  type SankeyLayout,
  type SankeyLink,
  type SankeyNode,
} from '../../lib/flowGraph'
import { formatMoney } from '../../lib/money'
import type { MonthlySummary } from '../../lib/summary'

const LEGEND: { tone: FlowTone; label: string; swatch: string }[] = [
  { tone: 'income', label: 'Paychecks', swatch: 'bg-ink' },
  { tone: 'account', label: 'Accounts', swatch: 'bg-ink-faint' },
  { tone: 'wealth', label: 'Wealth-building', swatch: 'bg-accent' },
  { tone: 'spend', label: 'Spending', swatch: 'bg-clay' },
  { tone: 'leftover', label: 'Unallocated', swatch: 'bg-line' },
  { tone: 'shortfall', label: 'Shortfall', swatch: 'bg-danger' },
]

const MOBILE_BREAKPOINT = 640

/**
 * Proportional Sankey of the month's money movement.
 * Horizontal on desktop, top-to-bottom on mobile — no sideways scroll.
 */
export function FlowSankey({ summary }: { summary: MonthlySummary }) {
  const gradientPrefix = useId().replace(/[^a-zA-Z0-9]/g, '')
  const shellRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [focusedNode, setFocusedNode] = useState<string | null>(null)
  const [activeLink, setActiveLink] = useState<number | null>(null)
  const [pinnedLink, setPinnedLink] = useState<number | null>(null)

  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const isMobile = width > 0 && width < MOBILE_BREAKPOINT
  const orientation = isMobile ? 'vertical' : 'horizontal'
  const chartHeight = isMobile
    ? Math.round(Math.min(560, Math.max(420, width * 1.45)))
    : Math.round(Math.min(460, Math.max(340, width * 0.68)))

  const layout: SankeyLayout | null = useMemo(() => {
    if (width < 40) return null
    // Leave room for labels sitting outside the node stack.
    const pad = isMobile
      ? { w: 22, h: 36 }
      : { w: 118, h: 8 }
    return layoutSankey(buildMoneyFlowGraph(summary), {
      width: Math.max(120, width - pad.w * 2),
      height: Math.max(200, chartHeight - pad.h * 2),
      orientation,
      nodeWidth: isMobile ? 9 : 14,
      gap: isMobile ? 9 : 16,
    })
  }, [summary, width, chartHeight, isMobile, orientation])

  if (layout && layout.links.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-ink-soft">
        No money moved this month — add income or spending to see the flow.
      </p>
    )
  }

  const highlighted = pinnedLink ?? activeLink
  const detailLink = highlighted !== null && layout ? layout.links[highlighted] : null
  const tonesPresent = new Set(layout?.nodes.map((n) => n.tone) ?? [])

  const ribbonOpacity = (index: number, sourceId: string, targetId: string) => {
    if (highlighted === index) return 0.9
    if (focusedNode !== null) {
      return sourceId === focusedNode || targetId === focusedNode ? 0.78 : 0.1
    }
    if (highlighted !== null) return 0.16
    return 0.58
  }

  function selectLink(index: number) {
    setPinnedLink((prev) => (prev === index ? null : index))
  }

  function focusNode(id: string | null) {
    setFocusedNode(id)
    if (id) setPinnedLink(null)
  }

  const padX = isMobile ? 28 : 118
  const padY = isMobile ? 36 : 4
  const vbW = layout ? layout.width + padX + (isMobile ? 8 : padX) : width || 320
  const vbH = layout ? layout.height + padY * 2 : chartHeight
  const offsetX = isMobile ? 28 : padX
  const offsetY = padY

  const stageLabels =
    isMobile && layout
      ? [
          { label: 'In', y: offsetY + avgColumnY(layout, 0) },
          { label: 'Thru', y: offsetY + avgColumnY(layout, 1) },
          ...(layout.nodes.some((n) => n.column === 2)
            ? [{ label: 'Joint', y: offsetY + avgColumnY(layout, 2) }]
            : []),
          {
            label: 'Out',
            y:
              offsetY +
              avgColumnY(layout, Math.max(...layout.nodes.map((n) => n.column))),
          },
        ]
      : []

  return (
    <div className="sankey-shell">
      <div
        ref={shellRef}
        className="relative overflow-hidden rounded-xl bg-paper ring-1 ring-line/80"
      >

        {stageLabels.length > 0 && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-12" aria-hidden>
            {stageLabels.map((stage) => (
              <span
                key={stage.label}
                className="absolute left-1.5 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint/80"
                style={{ top: `${(stage.y / vbH) * 100}%` }}
              >
                {stage.label}
              </span>
            ))}
          </div>
        )}

        {width === 0 || !layout ? (
          <div className="flex h-64 items-center justify-center sm:h-80" aria-hidden>
            <div className="h-1.5 w-24 animate-pulse rounded-full bg-line" />
          </div>
        ) : (
          <svg
            key={`${summary.key}-${orientation}-${Math.round(width)}`}
            viewBox={`0 0 ${vbW} ${vbH}`}
            className="sankey-svg relative z-[1] w-full touch-manipulation"
            style={{ height: chartHeight }}
            role="img"
            aria-label={`Money flow for ${summary.label}: ${formatMoney(summary.combinedIncome)} in, ${formatMoney(summary.combinedOutflow)} spent, ${formatMoney(summary.netWealthChange)} net wealth. Tap a ribbon for details.`}
          >
            <defs>
              {layout.links.map((link, i) => (
                <linearGradient
                  key={i}
                  id={`${gradientPrefix}-${i}`}
                  gradientUnits="userSpaceOnUse"
                  x1={link.sx + offsetX}
                  y1={link.sy + offsetY}
                  x2={link.tx + offsetX}
                  y2={link.ty + offsetY}
                >
                  <stop offset="0%" stopColor={link.source.color} />
                  <stop offset="100%" stopColor={link.target.color} />
                </linearGradient>
              ))}
            </defs>

            <g transform={`translate(${offsetX}, ${offsetY})`}>
              {layout.links.map((link, i) => {
                return (
                  <path
                    key={i}
                    d={link.path}
                    fill={`url(#${gradientPrefix}-${i})`}
                    fillOpacity={ribbonOpacity(i, link.source.id, link.target.id)}
                    className="sankey-ribbon cursor-pointer"
                    style={{
                      transition: 'fill-opacity 0.22s ease',
                    }}
                    onMouseEnter={() => setActiveLink(i)}
                    onMouseLeave={() => setActiveLink(null)}
                    onClick={() => selectLink(i)}
                  >
                    <title>
                      {`${link.source.label} → ${link.target.label}: ${formatMoney(link.value)}/mo`}
                    </title>
                  </path>
                )
              })}

              {layout.nodes.map((node) => {
                const active = highlighted !== null ? layout.links[highlighted] : null
                const involved =
                  focusedNode === node.id ||
                  active?.source.id === node.id ||
                  active?.target.id === node.id
                const dimmed =
                  (focusedNode !== null || highlighted !== null) && !involved
                return (
                  <NodeGroup
                    key={node.id}
                    node={node}
                    layout={layout}
                    isMobile={isMobile}
                    focused={focusedNode === node.id || involved}
                    dimmed={dimmed}
                    onFocus={() => focusNode(node.id)}
                    onBlur={() => focusNode(null)}
                  />
                )
              })}
            </g>
          </svg>
        )}

        {/* Touch / hover detail card */}
        <div
          className={`pointer-events-none absolute inset-x-3 bottom-3 z-[2] transition-all duration-200 sm:inset-x-auto sm:left-1/2 sm:w-auto sm:max-w-[min(92%,28rem)] sm:-translate-x-1/2 ${
            detailLink
              ? 'translate-y-0 opacity-100'
              : 'translate-y-2 opacity-0'
          }`}
        >
          {detailLink && <FlowDetailCard link={detailLink} />}
        </div>
      </div>

      <p className="mt-2.5 text-center text-[11px] text-ink-faint sm:hidden">
        Tap a ribbon to see the amount
      </p>

      <div className="mt-3.5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 sm:justify-start">
        {LEGEND.filter((entry) => tonesPresent.has(entry.tone)).map((entry) => (
          <span
            key={entry.tone}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-soft"
          >
            <span className={`size-1.5 rounded-full ${entry.swatch}`} aria-hidden />
            {entry.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function FlowDetailCard({ link }: { link: SankeyLink }) {
  return (
    <div className="pointer-events-none flex items-center justify-between gap-3 rounded-xl bg-card px-3.5 py-2.5 text-ink ring-1 ring-line">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-ink-soft">
          {link.source.label}
          <span className="mx-1.5 text-ink-faint">→</span>
          {link.target.label}
        </p>
      </div>
      <p className="num shrink-0 text-sm font-semibold tracking-tight">
        {formatMoney(link.value)}
        <span className="ml-0.5 text-[10px] font-medium text-ink-faint">/mo</span>
      </p>
    </div>
  )
}

function NodeGroup({
  node,
  layout,
  isMobile,
  dimmed,
  onFocus,
  onBlur,
}: {
  node: SankeyNode
  layout: SankeyLayout
  isMobile: boolean
  focused?: boolean
  dimmed: boolean
  onFocus: () => void
  onBlur: () => void
}) {
  const vertical = layout.orientation === 'vertical'
  const lastColumn = Math.max(...layout.nodes.map((n) => n.column))
  const isLast = node.column === lastColumn
  const isFirst = node.column === 0
  const isMiddle = !isFirst && !isLast

  const barW = vertical ? node.height : layout.nodeWidth
  const barH = vertical ? layout.nodeWidth : node.height

  let labelX: number
  let labelY: number
  let anchor: 'start' | 'middle' | 'end'
  let amountBelow = false
  if (vertical) {
    labelX = node.x + node.height / 2
    anchor = 'middle'
    if (isLast) {
      labelY = node.y + layout.nodeWidth + 12
      amountBelow = true
    } else {
      // Stack name + amount above the bar so neither sits on the node.
      labelY = node.y - 18
      amountBelow = true
    }
  } else {
    labelX = isLast ? node.x - 8 : node.x + layout.nodeWidth + 8
    labelY = node.y + node.height / 2 + 3.5
    anchor = isLast ? 'end' : 'start'
  }

  const shortLabel = shortenLabel(node.label, isMobile)
  // Middle nodes on a phone sit in the ribbon lane — label ends only.
  const showLabel = !isMobile || !isMiddle
  const showAmount = showLabel && (!isMobile || !isMiddle || isFirst || isLast)

  return (
    <g
      tabIndex={0}
      role="img"
      aria-label={`${node.label}: ${formatMoney(node.value)} per month`}
      className="cursor-default outline-none"
      style={{
        opacity: dimmed ? 0.32 : 1,
        transition: 'opacity 0.2s ease',
      }}
      onMouseEnter={onFocus}
      onMouseLeave={onBlur}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <rect
        x={node.x}
        y={node.y}
        width={barW}
        height={barH}
        rx={4}
        fill={node.color}
      />
      {vertical && node.height >= 22 && (
        <rect
          x={node.x + 2}
          y={node.y + 2}
          width={Math.max(0, node.height - 4)}
          height={Math.max(0, layout.nodeWidth - 4)}
          rx={2}
          fill="rgb(255 255 255 / 0.12)"
          pointerEvents="none"
        />
      )}
      {showLabel && (
        <text
          x={labelX}
          y={labelY}
          textAnchor={anchor}
          fontSize={isMobile ? 10 : 11}
          style={{
            paintOrder: 'stroke',
            stroke: '#070c0b',
            strokeWidth: isMobile ? 3.5 : 3.25,
            strokeLinejoin: 'round',
            pointerEvents: 'none',
          }}
        >
          <tspan
            fontWeight={600}
            fill={node.tone === 'shortfall' ? '#ff6b4a' : '#e8f0ed'}
          >
            {shortLabel}
          </tspan>
          {showAmount && (
            <tspan
              className="num"
              fill="#8fa39b"
              dx={amountBelow ? 0 : 5}
              dy={amountBelow ? 11 : 0}
              x={amountBelow ? labelX : undefined}
              textAnchor={anchor}
              fontSize={isMobile ? 9.5 : 11}
              fontWeight={500}
            >
              {formatMoney(node.value)}
            </tspan>
          )}
        </text>
      )}
    </g>
  )
}

function shortenLabel(label: string, mobile: boolean): string {
  if (!mobile) return label
  return label
    .replace("'s pay", '')
    .replace(' · Checking', '')
    .replace('Joint checking', 'Joint')
    .replace('Shared bills', 'Shared')
    .replace('Personal bills', 'Bills')
    .replace('Credit cards', 'Cards')
    .replace('Other spend', 'Other')
    .replace('Investments', 'Invest')
    .replace('Retirement', 'Retire')
    .replace('Unallocated', 'Left')
    .replace('Shortfall', 'Gap')
}

function avgColumnY(layout: SankeyLayout, column: number): number {
  const col = layout.nodes.filter((n) => n.column === column)
  if (col.length === 0) return 0
  const mid =
    col.reduce((sum, n) => sum + n.y + layout.nodeWidth / 2, 0) / col.length
  return mid
}
