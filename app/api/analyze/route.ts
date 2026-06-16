import type { NextRequest } from 'next/server'
import type { ApiResponse, CandidateAnalysis, MissingSkill } from '@/lib/types'
import { analyzeCandidate } from '@/lib/claude/analyzer'
import { computeSkillGap } from '@/lib/analyzer/gap'
import { computeSkillDemand } from '@/lib/pipeline/aggregator'
import { loadAllJobs } from '@/lib/pipeline/loader'
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

    const jobs = transformJobs(loadAllJobs())
    const marketDemand = computeSkillDemand(jobs, { limit: 20, sort: 'demand' })

    let analysis: CandidateAnalysis
    try {
      analysis = await analyzeCandidate(candidateSkills, marketDemand)
    } catch {
      // AI unavailable — fall back to local gap computation so the demo never hard-fails
      const gap = computeSkillGap(candidateSkills, marketDemand)
      const missingHighDemandSkills: MissingSkill[] = gap.missingSkills
        .slice(0, 5)
        .map((name) => {
          const rank = marketDemand.findIndex(s => s.skillName === name)
          return {
            name,
            demandRank: rank >= 0 ? rank + 1 : 99,
            estimatedLearningWeeks: 4,
            resourceSuggestion: 'Search Coursera or YouTube for beginner courses',
          }
        })
      analysis = {
        inputSkills: candidateSkills,
        matchScore: gap.quickScore,
        matchedSkills: gap.matchedSkills,
        missingHighDemandSkills,
        recommendedRoles: [],
        marketPositioning: `Based on your ${candidateSkills.length} skills, you match ${gap.matchedSkills.length} of the top 20 in-demand skills in Malaysia. (AI narrative unavailable — detailed analysis will appear when the AI service is reachable.)`,
      }
    }

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
