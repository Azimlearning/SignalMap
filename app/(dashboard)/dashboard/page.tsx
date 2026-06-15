'use client'
import { useEffect } from 'react'
import { useDashboardStore } from '@/store/dashboardStore'
import { FilterPanel } from '@/components/dashboard/FilterPanel'
import { DemandMap } from '@/components/dashboard/DemandMap'
import { TrendingSkills } from '@/components/dashboard/TrendingSkills'
import { SalaryBands } from '@/components/dashboard/SalaryBands'
import { FitAnalyser } from '@/components/candidate/FitAnalyser'
import { DemandHeatmap } from '@/components/charts/DemandHeatmap'
import { TrendLine } from '@/components/charts/TrendLine'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

function FreshnessBar() {
  const lastFetched = useDashboardStore(s => s.lastFetched)
  if (!lastFetched) return null
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <Clock className="w-3 h-3" aria-hidden />
      <span>
        Last updated{' '}
        {lastFetched.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
        {' · '}
        <span className="text-gray-300">Seed data · June 2026</span>
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const init = useDashboardStore(s => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Page header */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Malaysia Talent Demand Intelligence
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Real-time skill demand signals from Malaysian job postings · powered by Claude AI
            </p>
          </div>
          <FreshnessBar />
        </div>

        {/* Layout: stacked on mobile, sidebar on lg+ */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* Filter sidebar */}
          <div className="w-full lg:w-52 lg:shrink-0">
            <Card size="sm" className="lg:sticky lg:top-6">
              <CardContent className="pt-4 pb-4">
                <FilterPanel />
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4 sm:space-y-5">

            {/* Demand Map */}
            <Card>
              <CardContent className="pt-5">
                <DemandMap />
              </CardContent>
            </Card>

            {/* Trending + Salary — side by side on lg+ */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
              <Card>
                <CardContent className="pt-5">
                  <TrendingSkills />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <SalaryBands />
                </CardContent>
              </Card>
            </div>

            {/* Heatmap + Trend row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Skills × Industry Heatmap</CardTitle>
                </CardHeader>
                <CardContent>
                  <DemandHeatmap />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">30-Day Demand Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendLine />
                </CardContent>
              </Card>
            </div>

            {/* Candidate Fit Analyser */}
            <Card id="analyser">
              <CardContent className="pt-5">
                <FitAnalyser />
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
