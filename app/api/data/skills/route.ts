import type { NextRequest } from 'next/server'
import type { ApiResponse, SkillDemand, Industry, City } from '@/lib/types'
import { loadSeedJobs } from '@/lib/pipeline/loader'
import { transformJobs } from '@/lib/pipeline/transformer'
import { computeSkillDemand } from '@/lib/pipeline/aggregator'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url)

    const industry = (searchParams.get('industry') ?? 'all') as Industry | 'all'
    const city = (searchParams.get('city') ?? 'all') as City | 'all'
    const seniority = (searchParams.get('seniority') ?? 'all') as 'junior' | 'mid' | 'senior' | 'lead' | 'all'
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const sort = (searchParams.get('sort') ?? 'demand') as 'demand' | 'alpha'

    const jobs = transformJobs(loadSeedJobs())
    const skills = computeSkillDemand(jobs, { industry, city, seniority, limit, sort })

    const body: ApiResponse<SkillDemand[]> = {
      data: skills,
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
