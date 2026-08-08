import { useId, useMemo, useState } from 'react'
import {
  buildMoneyFlowGraph,
  layoutSankey,
  type FlowTone,
  type SankeyLayout,
} from '../../lib/flowGraph'
import { formatMoney } from '../../lib/money'
import type { MonthlySummary } from '../../lib/summary'

const WIDTH = 620
const HEIGHT = 440
const NODE_WIDTH = 12

const LEGEND: { tone: FlowTone; label: string; className: string }[] = [
  { tone: 'income', label: 'Paychecks', className: 'bg-ink' },
  { tone: 'account', label: 'Accounts', className: 'bg-ink-faint' },
  { tone: 'wealth', label: 'Wealth-building', className: 'bg-accent' },
  { tone: 'spend', label: 'Spending', className: 'bg-clay' },
  { tone: 'leftover', label: 'Unallocated', className: 'bg-line' },
  { tone: 'shortfall', label: 'Shortfall (over income)', className: 'bg-danger' },
]

/**
 * Proportional Sankey diagram of the month's money movement.
 * Ribbon thickness encodes dollars, so a heavy-spend month is
 * visibly wider on the spend side than the saved side.
 */
export function FlowSankey({ summary }: { summary: MonthlySummary }) {
  const gradientPrefix = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [focusedNode, setFocusedNode] = useState<string | null>(null)
  const [hoveredLink, setHoveredLink] = useState<number | null>(null)

  const layout: SankeyLayout = useMemo(
    () =>
      layoutSankey(buildMoneyFlowGraph(summary), {
        width: WIDTH,
        height: HEIGHT,
        nodeWidth: NODE_WIDTH,
      }),
    [summary],
  )

  if (layout.links.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-ink-soft">
        No money moved this month — add income or spending to see the flow.
      </p>
    )
  }

  const lastColumn = Math.max(...layout.nodes.map((n) => n.column))
  const tonesPresent = new Set(layout.nodes.map((n) => n.tone))

  const ribbonOpacity = (index: number, sourceId: string, targetId: string) => {
    if (hoveredLink === index) return 0.72
    if (focusedNode !== null) {
      return sourceId === focusedNode || targetId === focusedNode ? 0.66 : 0.07
    }
    return 0.42
  }

  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <svg
          key={summary.key}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="rise w-full min-w-[560px]"
          role="img"
          aria-label={`Money flow for ${summary.label}: ${formatMoney(summary.combinedIncome)} in, ${formatMoney(summary.combinedOutflow)} spent, ${formatMoney(summary.netWealthChange)} net wealth.`}
        >
          <defs>
            {layout.links.map((link, i) => (
              <linearGradient
                key={i}
                id={`${gradientPrefix}-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={link.sx}
                y1={link.sy}
                x2={link.tx}
                y2={link.ty}
              >
                <stop offset="0%" stopColor={link.source.color} />
                <stop offset="100%" stopColor={link.target.color} />
              </linearGradient>
            ))}
          </defs>

          {layout.links.map((link, i) => (
            <path
              key={i}
              d={link.path}
              fill={`url(#${gradientPrefix}-${i})`}
              fillOpacity={ribbonOpacity(i, link.source.id, link.target.id)}
              style={{ transition: 'fill-opacity 0.2s ease' }}
              onMouseEnter={() => setHoveredLink(i)}
              onMouseLeave={() => setHoveredLink(null)}
            >
              <title>
                {`${link.source.label} → ${link.target.label}: ${formatMoney(link.value)}/mo`}
              </title>
            </path>
          ))}

          {layout.nodes.map((node) => {
            const isLast = node.column === lastColumn
            const labelX = isLast ? node.x - 7 : node.x + layout.nodeWidth + 7
            return (
              <g
                key={node.id}
                tabIndex={0}
                role="img"
                aria-label={`${node.label}: ${formatMoney(node.value)} per month`}
                className="cursor-default outline-none"
                onMouseEnter={() => setFocusedNode(node.id)}
                onMouseLeave={() => setFocusedNode(null)}
                onFocus={() => setFocusedNode(node.id)}
                onBlur={() => setFocusedNode(null)}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={layout.nodeWidth}
                  height={node.height}
                  rx={3}
                  fill={node.color}
                />
                <text
                  x={labelX}
                  y={node.y + node.height / 2 + 3.5}
                  textAnchor={isLast ? 'end' : 'start'}
                  fontSize={11}
                  style={{
                    paintOrder: 'stroke',
                    stroke: '#ffffff',
                    strokeWidth: 3,
                    strokeLinejoin: 'round',
                  }}
                >
                  <tspan
                    fontWeight={600}
                    fill={node.tone === 'shortfall' ? '#b3452f' : '#172723'}
                  >
                    {node.label}
                  </tspan>
                  <tspan className="num" fill="#66746f" dx={5}>
                    {formatMoney(node.value)}
                  </tspan>
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs text-ink-soft">
        {LEGEND.filter((entry) => tonesPresent.has(entry.tone)).map((entry) => (
          <span key={entry.tone} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${entry.className}`} aria-hidden />
            {entry.label}
          </span>
        ))}
      </div>
    </div>
  )
}
