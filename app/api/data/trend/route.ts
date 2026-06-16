import type { NextRequest } from 'next/server'
import type { ApiResponse } from '@/lib/types'
import { getTopSkillsWithTimeSeries, listSnapshotDates } from '@/lib/pipeline/history'

export interface SkillTrendSeries {
  skillName: string
  series: Array<{ date: string; count: number }>
}

export interface TrendResponse {
  skills: SkillTrendSeries[]
  snapshotCount: number
  hasRealData: boolean
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const limit = Math.min(
      10,
      Math.max(1, parseInt(new URL(request.url).searchParams.get('limit') ?? '6', 10)),
    )

    const snapshotCount = listSnapshotDates().length
    const skills = getTopSkillsWithTimeSeries(limit)

    const body: ApiResponse<TrendResponse> = {
      data: {
        skills,
        snapshotCount,
        hasRealData: snapshotCount >= 2,
      },
      success: true,
      timestamp: new Date().toISOString(),
    }

    return Response.json(body)
  } catch (error) {
    return Response.json(
      {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse<null>,
      { status: 500 },
    )
  }
}
