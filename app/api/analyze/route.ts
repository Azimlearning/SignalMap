import type { NextRequest } from 'next/server'
import type { ApiResponse, CandidateAnalysis } from '@/lib/types'
import { analyzeCandidate } from '@/lib/claude/analyzer'
import { computeSkillDemand } from '@/lib/pipeline/aggregator'
import { loadSeedJobs } from '@/lib/pipeline/loader'
import { transformJobs } from '@/lib/pipeline/transformer'

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json() as { skills?: unknown }

    if (!Array.isArray(body.skills) || body.skills.length === 0) {
      const errBody: ApiResponse<null> = {
        data: null,
        success: false,
        error: 'skills must be a non-empty array',
        timestamp: new Date().toISOString(),
      }
      return Response.json(errBody, { status: 400 })
    }

    const candidateSkills = (body.skills as unknown[])
      .filter((s): s is string => typeof s === 'string')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, 50)

    if (candidateSkills.length === 0) {
      const errBody: ApiResponse<null> = {
        data: null,
        success: false,
        error: 'No valid skill strings provided',
        timestamp: new Date().toISOString(),
      }
      return Response.json(errBody, { status: 400 })
    }

    const jobs = transformJobs(loadSeedJobs())
    const marketDemand = computeSkillDemand(jobs, { limit: 20, sort: 'demand' })
    const analysis = await analyzeCandidate(candidateSkills, marketDemand)

    const responseBody: ApiResponse<CandidateAnalysis> = {
      data: analysis,
      success: true,
      timestamp: new Date().toISOString(),
    }

    return Response.json(responseBody)
  } catch (error) {
    const errBody: ApiResponse<null> = {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
      timestamp: new Date().toISOString(),
    }
    return Response.json(errBody, { status: 500 })
  }
}
