import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthlySummary } from '../../lib/summary'
import { formatMoney, formatMonthAxis } from '../../lib/money'

interface Props {
  summaries: MonthlySummary[]
  selectedKey?: string
}

export function TrendChart({ summaries, selectedKey }: Props) {
  const rows = summaries.map((s) => ({
    label: formatMonthAxis(s.month),
    key: s.key,
    loggedSpend: Math.round(s.loggedOutflow),
    income: Math.round(s.combinedIncome),
    invested: Math.round(s.netWealthChange),
  }))

  return (
    <div>
      <div
        className="h-52 w-full"
        role="img"
        aria-label="Spending trend chart. See the data summary below."
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="investedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1fd6b5" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#1fd6b5" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0a070" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#f0a070" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#1e2c28" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#8fa39b' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fontSize: 11, fill: '#5c7169' }}
              tickFormatter={(v: number) => {
                if (v >= 1000) return `${Math.round(v / 1000)}k`
                return String(Math.round(v))
              }}
            />
            <Tooltip
              formatter={(value, name) => [formatMoney(Number(value)), String(name)]}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #1e2c28',
                background: '#111917',
                color: '#e8f0ed',
                boxShadow: 'none',
                fontSize: 12,
              }}
            />
            {selectedKey && (
              <ReferenceLine
                x={rows.find((r) => r.key === selectedKey)?.label}
                stroke="#1fd6b5"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                strokeOpacity={0.55}
              />
            )}
            {/* Solid: logged card + debit spend (truly month-specific) */}
            <Area
              type="monotone"
              dataKey="loggedSpend"
              name="Logged spend"
              stroke="#f0a070"
              strokeWidth={2}
              fill="url(#spendFill)"
              dot={false}
            />
            {/* Dashed: income — uses current setup for every month */}
            <Area
              type="monotone"
              dataKey="income"
              name="Income (today's setup)"
              stroke="#8fa39b"
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="transparent"
              dot={false}
            />
            {/* Dashed: net wealth — uses current setup for every month; dips if overspent */}
            <Area
              type="monotone"
              dataKey="invested"
              name="Net wealth (today's setup)"
              stroke="#1fd6b5"
              strokeWidth={2.5}
              strokeDasharray="5 4"
              fill="url(#investedFill)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 text-xs text-ink-soft">
          <span className="h-0.5 w-4 rounded-full bg-clay" />
          Logged spend
        </span>
        <span className="flex items-center gap-1.5 text-xs text-ink-soft">
          <span
            className="h-0.5 w-4 rounded-full"
            style={{
              background: 'repeating-linear-gradient(to right, #8fa39b 0, #8fa39b 4px, transparent 4px, transparent 7px)',
            }}
          />
          Income
        </span>
        <span className="flex items-center gap-1.5 text-xs text-ink-soft">
          <span
            className="h-0.5 w-4 rounded-full"
            style={{
              background: 'repeating-linear-gradient(to right, #1fd6b5 0, #1fd6b5 4px, transparent 4px, transparent 7px)',
            }}
          />
          Net wealth
        </span>
      </div>

      {/* Accessible text summary — visible on mobile, screen-reader accessible everywhere */}
      <div className="mt-3 space-y-1 sm:hidden" aria-hidden>
        {summaries.map((s) => (
          <p key={s.key} className="flex justify-between text-xs text-ink-soft">
            <span>{formatMonthAxis(s.month)}</span>
            <span className="num">
              spent {formatMoney(s.loggedOutflow)} · net wealth {formatMoney(s.netWealthChange)}
            </span>
          </p>
        ))}
      </div>
      <table className="sr-only" aria-label="Monthly spending and savings data">
        <caption>Spending trend — last {summaries.length} months</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Logged spend</th>
            <th scope="col">Income</th>
            <th scope="col">Net wealth</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <tr key={s.key}>
              <td>{s.label}</td>
              <td>{formatMoney(s.loggedOutflow)}</td>
              <td>{formatMoney(s.combinedIncome)}</td>
              <td>{formatMoney(s.netWealthChange)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
