'use client'
import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { SkillDemand } from '@/lib/types'
import type { TrendResponse, SkillTrendSeries } from '@/app/api/data/trend/route'
import { useDashboardStore } from '@/store/dashboardStore'
import { Skeleton } from '@/components/ui/skeleton'

// ── Synthetic fallback (used when only 1 snapshot exists) ────────────────────

const DAYS = 30
const SEED_DATE = new Date('2026-06-15')

function dayLabel(daysAgo: number): string {
  const d = new Date(SEED_DATE)
  d.setDate(d.getDate() - (DAYS - 1 - daysAgo))
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function generateSeries(skill: SkillDemand): Array<{ day: string; count: number }> {
  const end = skill.postingCount
  const pct = skill.trendPercentage ?? 0
  const start = Math.max(1, Math.round(end / (1 + pct / 100)))

  return Array.from({ length: DAYS }, (_, i) => {
    const t = i / (DAYS - 1)
    const smooth = t * t * (3 - 2 * t)
    const noise = 1 + (Math.sin(i * 2.3 + skill.skillName.length) * 0.05)
    return { day: dayLabel(i), count: Math.max(0, Math.round((start + (end - start) * smooth) * noise)) }
  })
}

// ── Color map ────────────────────────────────────────────────────────────────

const TREND_COLOR: Record<SkillDemand['trend'], string> = {
  rising: '#16A34A',
  stable: '#3730A3',
  falling: '#DC2626',
}

// ── Real-data sparkline ───────────────────────────────────────────────────────

function RealSparkline({ series: rawSeries, color }: {
  series: SkillTrendSeries
  color: string
}) {
  const data = rawSeries.series.map(p => ({
    day: p.date.slice(5), // "MM-DD"
    count: p.count,
  }))

  const latest = data[data.length - 1]?.count ?? 0
  const first = data[0]?.count ?? 0
  const pct = first > 0 ? Math.round(((latest - first) / first) * 100) : null

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-800">{rawSeries.skillName}</span>
        <span className="text-xs font-semibold" style={{ color }}>
          {pct != null ? `${pct > 0 ? '+' : ''}${pct}%` : '—'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={48}>
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
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
          <Line type="monotone" dataKey="count" stroke={color} strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Synthetic sparkline (fallback) ───────────────────────────────────────────

function SyntheticSparkline({ skill }: { skill: SkillDemand }) {
  const series = generateSeries(skill)
  const color = TREND_COLOR[skill.trend]
  const pct = skill.trendPercentage

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-800">{skill.skillName}</span>
        <span className="text-xs font-semibold" style={{ color }}>
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
          <Line type="monotone" dataKey="count" stroke={color} strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function TrendLine() {
  const skillDemands = useDashboardStore(s => s.skillDemands)
  const isLoading = useDashboardStore(s => s.isLoadingSkills)

  const [trendData, setTrendData] = useState<TrendResponse | null>(null)
  const [trendLoading, setTrendLoading] = useState(true)

  useEffect(() => {
    fetch('/api/data/trend?limit=6')
      .then(r => r.json())
      .then((json: { success: boolean; data: TrendResponse }) => {
        if (json.success) setTrendData(json.data)
      })
      .catch(() => {})
      .finally(() => setTrendLoading(false))
  }, [])

  const topSkills = skillDemands
    .filter(s => s.trendPercentage != null)
    .slice(0, 6)

  if (isLoading || trendLoading) {
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

  // Real data path: ≥2 snapshots available
  if (trendData?.hasRealData && trendData.skills.length > 0) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-brand-teal font-medium">
          Real trends · {trendData.snapshotCount} snapshots · {trendData.skills[0]?.series[0]?.date} → {trendData.skills[0]?.series[trendData.skills[0].series.length - 1]?.date}
        </p>
        {trendData.skills.map((s, i) => (
          <RealSparkline
            key={s.skillName}
            series={s}
            color={TREND_COLOR[topSkills[i]?.trend ?? 'stable']}
          />
        ))}
      </div>
    )
  }

  // Fallback: synthetic projection
  if (topSkills.length === 0) {
    return <p className="text-sm text-gray-400">No trend data available for current filters.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 italic">
        Projected trend · based on current snapshot signals
      </p>
      {topSkills.map(skill => (
        <SyntheticSparkline key={skill.skillName} skill={skill} />
      ))}
    </div>
  )
}
