import type { NextRequest } from 'next/server'
import type { ApiResponse, SkillDemand } from '@/lib/types'
import { loadSeedJobs } from '@/lib/pipeline/loader'
import { transformJobs } from '@/lib/pipeline/transformer'
import { computeTrendingSkills } from '@/lib/pipeline/aggregator'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '5', 10)))

    const jobs = transformJobs(loadSeedJobs())
    const trending = computeTrendingSkills(jobs, limit)

    const body: ApiResponse<SkillDemand[]> = {
      data: trending,
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
