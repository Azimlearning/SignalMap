import type { SkillDemand } from '@/lib/types'

export interface GapResult {
  matchedSkills: string[]
  missingSkills: string[]
  quickScore: number
}

export function computeSkillGap(
  candidateSkills: string[],
  marketDemand: SkillDemand[],
): GapResult {
  const normalizedCandidate = candidateSkills.map(s => s.toLowerCase().trim())
  const topSkills = marketDemand.slice(0, 20)

  const matchedSkills: string[] = []
  const missingSkills: string[] = []

  for (const demand of topSkills) {
    const skillLower = demand.skillName.toLowerCase()
    const isMatch = normalizedCandidate.some(
      cs => cs === skillLower || cs.includes(skillLower) || skillLower.includes(cs),
    )

    if (isMatch) {
      matchedSkills.push(demand.skillName)
    } else {
      missingSkills.push(demand.skillName)
    }
  }

  const quickScore =
    topSkills.length > 0
      ? Math.round((matchedSkills.length / topSkills.length) * 100)
      : 0

  return { matchedSkills, missingSkills, quickScore }
}
