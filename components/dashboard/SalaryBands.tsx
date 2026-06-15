'use client'
import { useDashboardStore } from '@/store/dashboardStore'
import { Skeleton } from '@/components/ui/skeleton'
import { formatSalary } from '@/lib/utils'

export function SalaryBands() {
  const skillDemands = useDashboardStore(s => s.skillDemands)
  const isLoading = useDashboardStore(s => s.isLoadingSkills)

  const withSalary = skillDemands
    .filter(s => s.avgSalaryMin != null || s.avgSalaryMax != null)
    .slice(0, 8)

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold text-gray-900 text-base">Salary Intelligence</h2>
        <p className="text-xs text-gray-500 mt-0.5">Average salary band for top in-demand skills</p>
      </div>

      {isLoading && (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && withSalary.length === 0 && (
        <p className="text-sm text-gray-400">No salary data for current filters.</p>
      )}

      {!isLoading && withSalary.length > 0 && (
        <div className="divide-y divide-gray-100">
          {withSalary.map(skill => (
            <div
              key={skill.skillName}
              className="flex items-center justify-between py-2.5 gap-4"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-gray-800 truncate">
                  {skill.skillName}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {skill.postingCount} jobs
                </span>
              </div>
              <span className="text-sm font-semibold text-brand-teal shrink-0 tabular-nums">
                {formatSalary(skill.avgSalaryMin, skill.avgSalaryMax)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
