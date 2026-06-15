'use client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { SkillDemand } from '@/lib/types'
import { useDashboardStore } from '@/store/dashboardStore'
import { Skeleton } from '@/components/ui/skeleton'

const DAYS = 30
const SEED_DATE = new Date('2026-06-15')

function dayLabel(daysAgo: number): string {
  const d = new Date(SEED_DATE)
  d.setDate(d.getDate() - (DAYS - 1 - daysAgo))
  return `${d.getDate()}/${d.getMonth() + 1}`
}

/**
 * Generates a synthetic 30-day demand series for a skill.
 * Uses the trend direction + trendPercentage to produce a plausible curve
 * from the seed data (which only has a single current-day snapshot).
 */
function generateSeries(skill: SkillDemand): Array<{ day: string; count: number }> {
  const end = skill.postingCount
  const pct = skill.trendPercentage ?? 0
  const start = Math.max(1, Math.round(end / (1 + pct / 100)))

  return Array.from({ length: DAYS }, (_, i) => {
    // Smooth sigmoid interpolation from start → end over 30 days
    const t = i / (DAYS - 1)
    const smooth = t * t * (3 - 2 * t) // smoothstep
    // Add slight noise (±5%) for realism
    const noise = 1 + (Math.sin(i * 2.3 + skill.skillName.length) * 0.05)
    const count = Math.max(0, Math.round((start + (end - start) * smooth) * noise))
    return { day: dayLabel(i), count }
  })
}

const TREND_COLOR: Record<SkillDemand['trend'], string> = {
  rising: '#16A34A',
  stable: '#3730A3',
  falling: '#DC2626',
}

interface SparklineProps {
  skill: SkillDemand
}

function Sparkline({ skill }: SparklineProps) {
  const series = generateSeries(skill)
  const color = TREND_COLOR[skill.trend]
  const pct = skill.trendPercentage

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-800">{skill.skillName}</span>
        <span
          className="text-xs font-semibold"
          style={{ color }}
        >
          {pct != null ? `${pct > 0 ? '+' : ''}${pct}%` : '—'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={48}>
        <LineChart data={series} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <XAxis dataKey="day" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="rounded border bg-white px-2 py-1 shadow text-xs">
                  <span className="text-gray-500">{label}: </span>
                  <span className="font-semibold">{payload[0].value} jobs</span>
                </div>
              )
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TrendLine() {
  const skillDemands = useDashboardStore(s => s.skillDemands)
  const isLoading = useDashboardStore(s => s.isLoadingSkills)

  // Show top 6 skills that have a trend signal
  const topSkills = skillDemands
    .filter(s => s.trendPercentage != null)
    .slice(0, 6)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-8" />
            </div>
            <Skeleton className="h-12 w-full rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (topSkills.length === 0) {
    return (
      <p className="text-sm text-gray-400">No trend data available for current filters.</p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 italic">
        Simulated 30-day trend · based on seed data signals
      </p>
      {topSkills.map(skill => (
        <Sparkline key={skill.skillName} skill={skill} />
      ))}
    </div>
  )
}
