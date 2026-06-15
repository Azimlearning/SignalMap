'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { SkillDemand } from '@/lib/types'

interface Props {
  data: SkillDemand[]
}

const TREND_COLOR: Record<SkillDemand['trend'], string> = {
  rising: '#16A34A',
  stable: '#3730A3',
  falling: '#DC2626',
}

interface ChartRow {
  skill: string
  count: number
  pct: number
  trend: SkillDemand['trend']
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: ChartRow }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-900 mb-0.5">{d.skill}</p>
      <p className="text-gray-600">
        {d.count} postings · {d.pct}% of total
      </p>
    </div>
  )
}

export function SkillsBarChart({ data }: Props) {
  const chartData: ChartRow[] = data.map(s => ({
    skill: s.skillName,
    count: s.postingCount,
    pct: s.percentageOfTotal,
    trend: s.trend,
  }))

  const height = Math.max(320, chartData.length * 30)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
      >
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
        />
        <YAxis
          dataKey="skill"
          type="category"
          width={130}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: '#1e293b' }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={TREND_COLOR[entry.trend]} fillOpacity={0.88} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
