'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { CareerPath, CareerLevel } from '@/app/api/data/career-paths/route'
import type { ApiResponse } from '@/lib/types'

const SENIORITY_COLOR: Record<string, string> = {
  junior: 'bg-blue-50 border-blue-200 text-blue-800',
  mid: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  senior: 'bg-violet-50 border-violet-200 text-violet-800',
  lead: 'bg-purple-50 border-purple-200 text-purple-800',
}

const INDUSTRY_ICONS: Record<string, string> = {
  technology: '💻',
  finance: '📊',
  healthcare: '🏥',
  engineering: '⚙️',
  manufacturing: '🏭',
  retail: '🛍️',
}

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return 'Salary varies'
  if (min && max) return `RM ${(min / 1000).toFixed(0)}k – ${(max / 1000).toFixed(0)}k/mo`
  if (min) return `From RM ${(min / 1000).toFixed(0)}k/mo`
  return `Up to RM ${(max! / 1000).toFixed(0)}k/mo`
}

function LevelCard({ level, isLast }: { level: CareerLevel; isLast: boolean }) {
  const colorClass = SENIORITY_COLOR[level.seniority] ?? 'bg-gray-50 border-gray-200 text-gray-800'

  return (
    <div className="flex gap-3">
      {/* Connector line */}
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${colorClass}`}>
          {level.seniority === 'junior' ? '1' : level.seniority === 'mid' ? '2' : level.seniority === 'senior' ? '3' : '4'}
        </div>
        {!isLast && <div className="mt-1 w-0.5 flex-1 bg-gray-200" />}
      </div>

      {/* Level content */}
      <div className={`mb-4 flex-1 rounded-lg border p-4 ${colorClass}`}>
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className="text-sm font-semibold">{level.label}</span>
            <span className="ml-2 text-xs opacity-70">{level.jobCount} postings</span>
          </div>
          <span className="text-xs font-medium opacity-80">
            {formatSalary(level.avgSalaryMin, level.avgSalaryMax)}
          </span>
        </div>

        {level.topTitles.length > 0 && (
          <p className="mb-2 text-xs opacity-75">
            e.g. {level.topTitles.slice(0, 2).join(', ')}
          </p>
        )}

        {level.topSkills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {level.topSkills.map(skill => (
              <span
                key={skill}
                className="rounded-full border border-current/20 bg-white/50 px-2 py-0.5 text-xs font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function IndustryPathCard({ path }: { path: CareerPath }) {
  const icon = INDUSTRY_ICONS[path.industry] ?? '📁'
  const topRole = path.levels[path.levels.length - 1]

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>{icon}</span>
          <span>{path.displayName}</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {path.totalJobs} jobs
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          {path.levels.map((level, i) => (
            <LevelCard key={level.seniority} level={level} isLast={i === path.levels.length - 1} />
          ))}
        </div>

        {/* CTA: search top role on Graduan */}
        {topRole?.topTitles[0] && (
          <a
            href={`https://www.graduan.com/job?keyword=${encodeURIComponent(topRole.topTitles[0])}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-md border border-brand-primary/20 bg-brand-primary/5 px-3 py-2 text-xs transition-colors hover:border-brand-primary/40 hover:bg-brand-primary/10"
          >
            <span className="font-medium text-brand-primary">
              Search {path.displayName} roles on Talentbank
            </span>
            <span className="text-brand-teal">→</span>
          </a>
        )}
      </CardContent>
    </Card>
  )
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  )
}

export default function CareerPathPage() {
  const [paths, setPaths] = useState<CareerPath[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeIndustry, setActiveIndustry] = useState<string>('all')

  useEffect(() => {
    fetch('/api/data/career-paths')
      .then(r => r.json())
      .then((json: ApiResponse<CareerPath[]>) => {
        if (json.success) setPaths(json.data)
        else setError(json.error ?? 'Failed to load career paths')
      })
      .catch(() => setError('Failed to load career paths'))
      .finally(() => setLoading(false))
  }, [])

  const displayed = activeIndustry === 'all'
    ? paths
    : paths.filter(p => p.industry === activeIndustry)

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Career Path Navigator
              </h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Real career progression ladders built from {loading ? '—' : paths.reduce((n, p) => n + p.totalJobs, 0)} live Malaysian job postings
              </p>
            </div>
            <Link
              href="/dashboard#analyser"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-primary/90"
            >
              Check my fit →
            </Link>
          </div>

          {/* Industry tabs */}
          {!loading && paths.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveIndustry('all')}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  activeIndustry === 'all'
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-brand-primary/40'
                }`}
              >
                All industries
              </button>
              {paths.map(p => (
                <button
                  key={p.industry}
                  onClick={() => setActiveIndustry(p.industry)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    activeIndustry === p.industry
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-brand-primary/40'
                  }`}
                >
                  {INDUSTRY_ICONS[p.industry]} {p.displayName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* How to read this */}
        <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          <strong>How to read:</strong> Each card shows the career progression ladder for that industry — from entry-level to leadership. Skills shown are the most in-demand at each level, extracted from real job postings.
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : displayed.map(path => (
                <IndustryPathCard key={path.industry} path={path} />
              ))
          }
        </div>

        {/* Module coverage callout */}
        <div className="mt-8 rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-5">
          <h2 className="mb-1 text-sm font-semibold text-brand-primary">Career OS · Module Coverage</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 text-xs text-gray-600 mt-3">
            {[
              { module: 'Talent Market Intelligence', status: 'live', link: '/dashboard' },
              { module: 'Career Path Navigator', status: 'live', link: '/career-path' },
              { module: 'Skill Gap Analysis', status: 'live', link: '/dashboard#analyser' },
              { module: 'Learning Path Recommender', status: 'live', link: '/dashboard#analyser' },
              { module: 'Employer Intelligence', status: 'live', link: '/dashboard' },
            ].map(({ module, status, link }) => (
              <Link
                key={module}
                href={link}
                className="flex items-center gap-1.5 rounded-lg border border-brand-rising/20 bg-white px-3 py-2 hover:border-brand-rising/40 transition-colors"
              >
                <span className="text-brand-rising">✓</span>
                <span className="font-medium">{module}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
