'use client'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useDashboardStore } from '@/store/dashboardStore'
import { Skeleton } from '@/components/ui/skeleton'
import type { SkillDemand } from '@/lib/types'

function TrendBadge({ skill }: { skill: SkillDemand }) {
  const pct = skill.trendPercentage ?? 0
  const isRising = skill.trend === 'rising'
  const isFalling = skill.trend === 'falling'

  let colorClass = 'bg-gray-50 border-gray-200 text-gray-700'
  let pctClass = 'text-gray-500'
  if (isRising) { colorClass = 'bg-green-50 border-green-200 text-green-800'; pctClass = 'text-green-600' }
  if (isFalling) { colorClass = 'bg-red-50 border-red-200 text-red-700'; pctClass = 'text-red-500' }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${colorClass}`}>
      {isRising && <TrendingUp className="w-3.5 h-3.5" aria-hidden />}
      {isFalling && <TrendingDown className="w-3.5 h-3.5" aria-hidden />}
      {!isRising && !isFalling && <Minus className="w-3.5 h-3.5" aria-hidden />}
      <span>{skill.skillName}</span>
      {skill.trendPercentage != null && (
        <span className={`text-xs font-semibold ${pctClass}`}>
          {pct > 0 ? '+' : ''}{pct}%
        </span>
      )}
    </div>
  )
}

export function TrendingSkills() {
  const trendingSkills = useDashboardStore(s => s.trendingSkills)
  const isLoading = useDashboardStore(s => s.isLoadingTrending)

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold text-gray-900 text-base">Trending Skills</h2>
        <p className="text-xs text-gray-500 mt-0.5">Fastest-growing demand signals in Malaysia</p>
      </div>

      {isLoading && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-32 rounded-full" />
          ))}
        </div>
      )}

      {!isLoading && trendingSkills.length === 0 && (
        <p className="text-sm text-gray-400">No trending data available.</p>
      )}

      {!isLoading && trendingSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {trendingSkills.map(skill => (
            <TrendBadge key={skill.skillName} skill={skill} />
          ))}
        </div>
      )}
    </section>
  )
}
