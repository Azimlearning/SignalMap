// All shared types for SignalMap — the authoritative source.
// All agents import from here. No duplicate type definitions elsewhere.

export interface JobPosting {
  id: string
  title: string
  company: string
  industry: Industry
  city: City
  salaryMin?: number
  salaryMax?: number
  seniority: 'junior' | 'mid' | 'senior' | 'lead'
  rawDescription: string
  extractedSkills?: ExtractedSkill[]
  postedAt: string // ISO date
  source: 'seed' | 'jobstreet' | 'myfuturejobs'
}

export interface ExtractedSkill {
  name: string           // normalized: "React.js"
  category: SkillCategory
  confidence: number     // 0-1, Claude's confidence in extraction
  frequency: number      // how often mentioned in this JD
}

export interface SkillDemand {
  skillName: string
  postingCount: number
  percentageOfTotal: number
  industries: Industry[]
  cities: City[]
  avgSalaryMin?: number
  avgSalaryMax?: number
  trend: 'rising' | 'stable' | 'falling'
  trendPercentage?: number
}

export interface CandidateAnalysis {
  inputSkills: string[]
  matchScore: number           // 0-100
  matchedSkills: string[]
  missingHighDemandSkills: MissingSkill[]
  recommendedRoles: RecommendedRole[]
  marketPositioning: string    // Claude's narrative summary
}

export interface MissingSkill {
  name: string
  demandRank: number           // rank in current market demand
  estimatedLearningWeeks: number
  resourceSuggestion: string
}

export interface RecommendedRole {
  title: string
  matchPercentage: number
  industry: Industry
  salaryRange: string
  topRequiredSkills: string[]
}

export type Industry =
  | 'technology'
  | 'finance'
  | 'healthcare'
  | 'engineering'
  | 'education'
  | 'retail'
  | 'manufacturing'
  | 'other'

export type City =
  | 'kuala-lumpur'
  | 'selangor'
  | 'penang'
  | 'johor'
  | 'remote'
  | 'other'

export type SkillCategory =
  | 'programming-language'
  | 'framework-library'
  | 'cloud-devops'
  | 'data-analytics'
  | 'design'
  | 'management'
  | 'soft-skill'
  | 'domain-knowledge'
  | 'certification'
  | 'tool'

export interface DashboardFilters {
  industry: Industry | 'all'
  city: City | 'all'
  seniority: JobPosting['seniority'] | 'all'
  timeWindow: '7d' | '30d' | '90d' | 'all'
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
  timestamp: string
}
