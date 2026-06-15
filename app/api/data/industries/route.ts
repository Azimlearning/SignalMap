import type { ApiResponse } from '@/lib/types'
import type { IndustryStat } from '@/lib/pipeline/aggregator'
import { loadAllJobs } from '@/lib/pipeline/loader'
import { transformJobs } from '@/lib/pipeline/transformer'
import { computeIndustryStats } from '@/lib/pipeline/aggregator'

export async function GET(): Promise<Response> {
  try {
    const jobs = transformJobs(loadAllJobs())
    const stats = computeIndustryStats(jobs)

    const body: ApiResponse<IndustryStat[]> = {
      data: stats,
      success: true,
      timestamp: new Date().toISOString(),
    }

    return Response.json(body)
  } catch (error) {
    const body: ApiResponse<IndustryStat[]> = {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
    return Response.json(body, { status: 500 })
  }
}
