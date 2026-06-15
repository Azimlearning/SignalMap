'use client'
import { useDashboardStore } from '@/store/dashboardStore'
import { SkillsBarChart } from '@/components/charts/SkillsBarChart'
import { Skeleton } from '@/components/ui/skeleton'

function ChartSkeleton() {
  return (
    <div className="space-y-2.5 py-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-28 shrink-0" />
          <Skeleton
            className="h-5 rounded"
            style={{ width: `${90 - i * 7}%`, opacity: 1 - i * 0.06 }}
          />
        </div>
      ))}
    </div>
  )
}

export function DemandMap() {
  const skillDemands = useDashboardStore(s => s.skillDemands)
  const isLoading = useDashboardStore(s => s.isLoadingSkills)
  const error = useDashboardStore(s => s.error)
  const filters = useDashboardStore(s => s.filters)

  const activeFilters = ([filters.industry, filters.city, filters.seniority] as const).filter(
    v => v !== 'all',
  ).length

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 text-base">Skills Demand</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Top 20 most-required skills · bar colour = demand trend
          </p>
        </div>
        {activeFilters > 0 && (
          <span className="shrink-0 rounded-full bg-brand-teal/10 px-2.5 py-0.5 text-xs font-medium text-brand-teal">
            {activeFilters} filter{activeFilters > 1 ? 's' : ''} active
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load demand data: {error}
        </div>
      )}

      {isLoading && <ChartSkeleton />}

      {!isLoading && !error && skillDemands.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
          <p className="text-sm">No skills data for the selected filters.</p>
          <p className="text-xs mt-1">Try broadening your selection.</p>
        </div>
      )}

      {!isLoading && skillDemands.length > 0 && (
        <SkillsBarChart data={skillDemands} />
      )}
    </section>
  )
}
