import { claudeClient, AI_MODELS } from '@/lib/claude/client'
import type { CandidateAnalysis, SkillDemand, Industry, MissingSkill, RecommendedRole } from '@/lib/types'

const VALID_INDUSTRIES = new Set<Industry>([
  'technology', 'finance', 'healthcare', 'engineering',
  'education', 'retail', 'manufacturing', 'other',
])

function coerceIndustry(val: unknown): Industry {
  if (typeof val === 'string' && VALID_INDUSTRIES.has(val as Industry)) {
    return val as Industry
  }
  return 'other'
}

const ANALYSIS_PROMPT = `You are a Malaysian job market career advisor.

Candidate skills: {CANDIDATE_SKILLS}
Current top 20 demanded skills in Malaysia:
{MARKET_DEMAND_DATA}

Analyse the fit and return ONLY valid JSON — no other text:
{
  "matchScore": 0-100,
  "matchedSkills": ["skill1", "skill2"],
  "missingHighDemandSkills": [
    {
      "name": "string",
      "demandRank": number,
      "estimatedLearningWeeks": number,
      "resourceSuggestion": "string (specific course or resource)"
    }
  ],
  "recommendedRoles": [
    {
      "title": "string",
      "matchPercentage": number,
      "industry": "technology|finance|healthcare|engineering|education|retail|manufacturing|other",
      "salaryRange": "RM X,XXX - RM X,XXX",
      "topRequiredSkills": ["skill1", "skill2", "skill3"]
    }
  ],
  "marketPositioning": "2-3 sentence narrative summary in context of Malaysian job market"
}`

interface RawAnalysis {
  matchScore: number
  matchedSkills: string[]
  missingHighDemandSkills: Array<{
    name: string
    demandRank: number
    estimatedLearningWeeks: number
    resourceSuggestion: string
  }>
  recommendedRoles: Array<{
    title: string
    matchPercentage: number
    industry: string
    salaryRange: string
    topRequiredSkills: string[]
  }>
  marketPositioning: string
}

export async function analyzeCandidate(
  candidateSkills: string[],
  marketDemand: SkillDemand[],
): Promise<CandidateAnalysis> {
  const marketData = marketDemand
    .slice(0, 20)
    .map(
      (s, i) =>
        `${i + 1}. ${s.skillName} (${s.postingCount} postings, ${s.percentageOfTotal.toFixed(1)}%, trend: ${s.trend})`,
    )
    .join('\n')

  const prompt = ANALYSIS_PROMPT
    .replace('{CANDIDATE_SKILLS}', candidateSkills.join(', '))
    .replace('{MARKET_DEMAND_DATA}', marketData)

  const completion = await claudeClient.chat.completions.create({
    model: AI_MODELS.analysis,
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  })

  const text = completion.choices[0]?.message?.content ?? ''
  if (!text) throw new Error('No content in AI response')

  // Regex fallback in case model wraps JSON in markdown fences
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No valid JSON in AI response')

  const raw = JSON.parse(jsonMatch[0]) as RawAnalysis

  const missingHighDemandSkills: MissingSkill[] = (raw.missingHighDemandSkills ?? []).map(s => ({
    name: s.name,
    demandRank: s.demandRank,
    estimatedLearningWeeks: s.estimatedLearningWeeks,
    resourceSuggestion: s.resourceSuggestion,
  }))

  const recommendedRoles: RecommendedRole[] = (raw.recommendedRoles ?? []).map(r => ({
    title: r.title,
    matchPercentage: r.matchPercentage,
    industry: coerceIndustry(r.industry),
    salaryRange: r.salaryRange,
    topRequiredSkills: r.topRequiredSkills ?? [],
  }))

  return {
    inputSkills: candidateSkills,
    matchScore: Math.min(100, Math.max(0, Math.round(raw.matchScore))),
    matchedSkills: raw.matchedSkills ?? [],
    missingHighDemandSkills,
    recommendedRoles,
    marketPositioning: raw.marketPositioning ?? '',
  }
}
