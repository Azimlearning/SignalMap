'use client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDashboardStore } from '@/store/dashboardStore'
import type { DashboardFilters } from '@/lib/types'

const INDUSTRIES: { value: DashboardFilters['industry']; label: string }[] = [
  { value: 'all', label: 'All Industries' },
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'other', label: 'Other' },
]

const CITIES: { value: DashboardFilters['city']; label: string }[] = [
  { value: 'all', label: 'All Cities' },
  { value: 'kuala-lumpur', label: 'Kuala Lumpur' },
  { value: 'selangor', label: 'Selangor' },
  { value: 'penang', label: 'Penang' },
  { value: 'johor', label: 'Johor' },
  { value: 'remote', label: 'Remote' },
  { value: 'other', label: 'Other' },
]

const SENIORITIES: { value: DashboardFilters['seniority']; label: string }[] = [
  { value: 'all', label: 'All Levels' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
]

export function FilterPanel() {
  const filters = useDashboardStore(s => s.filters)
  const setFilter = useDashboardStore(s => s.setFilter)
  const totalPostings = useDashboardStore(s => s.totalPostings)
  const skillDemands = useDashboardStore(s => s.skillDemands)
  const pipelineStatus = useDashboardStore(s => s.pipelineStatus)

  const sourceLabel = pipelineStatus?.dataFreshness === 'live'
    ? 'Live (JSearch + seed)'
    : 'Seed data'

  return (
    <aside className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Filters
        </h2>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">Industry</label>
          <Select
            value={filters.industry}
            onValueChange={v => setFilter('industry', v ?? 'all')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Industries" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">City</label>
          <Select
            value={filters.city}
            onValueChange={v => setFilter('city', v ?? 'all')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">Seniority</label>
          <Select
            value={filters.seniority}
            onValueChange={v => setFilter('seniority', v ?? 'all')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              {SENIORITIES.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t pt-4 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Dataset
        </h2>
        <dl className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Postings indexed</dt>
            <dd className="font-semibold text-gray-900">{totalPostings || '—'}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Skills tracked</dt>
            <dd className="font-semibold text-gray-900">{skillDemands.length || '—'}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Source</dt>
            <dd className="font-semibold text-gray-900">{sourceLabel}</dd>
          </div>
        </dl>
      </div>

      <div className="border-t pt-4 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Legend
        </h2>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm bg-brand-rising shrink-0" />
            <span className="text-gray-600">Rising demand</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm bg-brand-primary shrink-0" />
            <span className="text-gray-600">Stable demand</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm bg-brand-falling shrink-0" />
            <span className="text-gray-600">Falling demand</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
