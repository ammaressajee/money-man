import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { CategorySlice } from '../../lib/summary'
import { formatMoney, formatPercent } from '../../lib/money'

const BAR_COLORS = ['#1fd6b5', '#3ecfba', '#5eb0d4', '#f0a070', '#f5b48a', '#5c7169']

export function BreakdownChart({ slices }: { slices: CategorySlice[] }) {
  if (slices.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-soft">
        No spending recorded for this month yet.
      </p>
    )
  }

  const total = slices.reduce((sum, s) => sum + s.amount, 0)
  const height = Math.max(120, slices.length * 40)

  return (
    <div>
      <div
        style={{ height }}
        className="w-full"
        role="img"
        aria-label="Spending breakdown chart. See the list below for details."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={slices}
            layout="vertical"
            margin={{ top: 0, right: 72, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={108}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: '#e8f0ed' }}
            />
            <Bar dataKey="amount" radius={[6, 6, 6, 6]} barSize={16}>
              {slices.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
              <LabelList
                dataKey="amount"
                position="right"
                formatter={(v) => formatMoney(Number(v))}
                style={{ fontSize: 12, fill: '#8fa39b', fontVariantNumeric: 'tabular-nums' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Visible on small screens; screen-reader summary always available */}
      <ol
        className="mt-3 space-y-1 sm:hidden"
        aria-hidden
        aria-label="Spending breakdown"
      >
        {slices.map((s) => (
          <li key={s.name} className="flex justify-between text-xs text-ink-soft">
            <span>{s.name}</span>
            <span className="num">
              {formatMoney(s.amount)}
              {total > 0 && (
                <span className="ml-1 text-ink-faint">({formatPercent(s.amount / total)})</span>
              )}
            </span>
          </li>
        ))}
      </ol>
      <table className="sr-only" aria-label="Spending breakdown by category">
        <caption>Spending by category</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Amount</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {slices.map((s) => (
            <tr key={s.name}>
              <td>{s.name}</td>
              <td>{formatMoney(s.amount)}</td>
              <td>{total > 0 ? formatPercent(s.amount / total) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
