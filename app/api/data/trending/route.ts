import type { NextRequest } from 'next/server'
import type { ApiResponse, SkillDemand } from '@/lib/types'
import { loadAllJobs } from '@/lib/pipeline/loader'
import { transformJobs } from '@/lib/pipeline/transformer'
import { computeSkillDemand, computeTrendingSkills } from '@/lib/pipeline/aggregator'
import { enrichWithHistoricalTrends } from '@/lib/pipeline/history'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '5', 10)))

    const jobs = transformJobs(loadAllJobs())

    // Enrich a wider pool with real historical trends, then re-filter for rising
    const allSkills = enrichWithHistoricalTrends(
      computeSkillDemand(jobs, { limit: 100, sort: 'demand' }),
      jobs.length
    )
    const historicalTrending = allSkills
      .filter(s => s.trend === 'rising' && s.trendPercentage != null)
      .sort((a, b) => (b.trendPercentage ?? 0) - (a.trendPercentage ?? 0))
      .slice(0, limit)

    // Fall back to aggregator's seed-based trending if no historical data available
    const result = historicalTrending.length > 0
      ? historicalTrending
      : computeTrendingSkills(jobs, limit)

    const body: ApiResponse<SkillDemand[]> = {
      data: result,
      success: true,
      timestamp: new Date().toISOString(),
    }

    return Response.json(body)
  } catch (error) {
    const body: ApiResponse<SkillDemand[]> = {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
    return Response.json(body, { status: 500 })
  }
}
