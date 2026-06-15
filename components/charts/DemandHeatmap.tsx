'use client'
import { useEffect, useState } from 'react'
import type { SkillDemand, Industry, ApiResponse } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: 'technology', label: 'Tech' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Health' },
  { value: 'engineering', label: 'Eng.' },
  { value: 'other', label: 'Other' },
]

const TOP_N_SKILLS = 12
const TOP_N_PER_INDUSTRY = 20

interface Cell {
  skillName: string
  counts: Record<Industry, number>
  maxCount: number
}

function buildMatrix(byIndustry: Map<Industry, SkillDemand[]>): Cell[] {
  // Collect all unique skills across industries
  const skillSet = new Set<string>()
  byIndustry.forEach(demands => demands.forEach(d => skillSet.add(d.skillName)))

  // Score skills by total cross-industry count
  const totals = new Map<string, number>()
  byIndustry.forEach(demands =>
    demands.forEach(d => totals.set(d.skillName, (totals.get(d.skillName) ?? 0) + d.postingCount))
  )

  const topSkills = Array.from(skillSet)
    .sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0))
    .slice(0, TOP_N_SKILLS)

  return topSkills.map(skillName => {
    const counts = {} as Record<Industry, number>
    let maxCount = 0
    INDUSTRIES.forEach(({ value }) => {
      const demand = byIndustry.get(value)?.find(d => d.skillName === skillName)
      const count = demand?.postingCount ?? 0
      counts[value] = count
      if (count > maxCount) maxCount = count
    })
    return { skillName, counts, maxCount }
  })
}

function heatColor(count: number, colMax: number): string {
  if (count === 0 || colMax === 0) return '#f8fafc'
  const ratio = count / colMax
  // Interpolate from indigo-50 → indigo-700
  if (ratio < 0.25) return '#eef2ff'  // indigo-50
  if (ratio < 0.5)  return '#c7d2fe'  // indigo-200
  if (ratio < 0.75) return '#818cf8'  // indigo-400
  return '#3730a3'                     // indigo-700 (brand-primary)
}

function textColor(count: number, colMax: number): string {
  if (count === 0 || colMax === 0) return '#94a3b8'
  return count / colMax >= 0.75 ? '#ffffff' : '#1e293b'
}

export function DemandHeatmap() {
  const [matrix, setMatrix] = useState<Cell[]>([])
  const [colMaxes, setColMaxes] = useState<Partial<Record<Industry, number>>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const results = await Promise.all(
          INDUSTRIES.map(async ({ value }) => {
            const res = await fetch(`/api/data/skills?industry=${value}&limit=${TOP_N_PER_INDUSTRY}`)
            const json = (await res.json()) as ApiResponse<SkillDemand[]>
            return { industry: value, demands: json.success ? json.data : [] }
          })
        )

        const byIndustry = new Map<Industry, SkillDemand[]>()
        results.forEach(({ industry, demands }) => byIndustry.set(industry, demands))

        const cells = buildMatrix(byIndustry)

        // Column max per industry (for normalization)
        const maxes: Partial<Record<Industry, number>> = {}
        INDUSTRIES.forEach(({ value }) => {
          maxes[value] = Math.max(...cells.map(c => c.counts[value] ?? 0), 1)
        })

        setMatrix(cells)
        setColMaxes(maxes)
      } catch {
        setError('Failed to load heatmap data.')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-6 w-28" />
            {INDUSTRIES.map(ind => <Skeleton key={ind.value} className="h-6 flex-1" />)}
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left py-1.5 pr-3 font-medium text-gray-400 w-32 whitespace-nowrap">
              Skill
            </th>
            {INDUSTRIES.map(ind => (
              <th
                key={ind.value}
                className="text-center py-1.5 px-1 font-medium text-gray-500 whitespace-nowrap"
              >
                {ind.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map(row => (
            <tr key={row.skillName} className="group">
              <td className="py-0.5 pr-3 font-medium text-gray-700 whitespace-nowrap group-hover:text-brand-primary transition-colors">
                {row.skillName}
              </td>
              {INDUSTRIES.map(ind => {
                const count = row.counts[ind.value] ?? 0
                const colMax = colMaxes[ind.value] ?? 1
                return (
                  <td key={ind.value} className="py-0.5 px-1 text-center">
                    <div
                      className="mx-auto rounded flex items-center justify-center font-semibold transition-transform group-hover:scale-105"
                      style={{
                        width: 36,
                        height: 24,
                        background: heatColor(count, colMax),
                        color: textColor(count, colMax),
                        fontSize: 10,
                      }}
                      title={`${row.skillName} · ${ind.label}: ${count} postings`}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <span>Low</span>
        {['#eef2ff', '#c7d2fe', '#818cf8', '#3730a3'].map(c => (
          <span key={c} className="inline-block w-5 h-3 rounded-sm" style={{ background: c }} />
        ))}
        <span>High</span>
        <span className="ml-3">· cell = posting count</span>
      </div>
    </div>
  )
}
