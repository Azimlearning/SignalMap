import type { JobPosting, SkillDemand, Industry, City } from '@/lib/types'

export interface IndustryStat {
  industry: Industry
  displayName: string
  postingCount: number
  percentageOfTotal: number
  topSkills: string[]
}

// Manually curated trend signals for seed data.
// P1 real pipeline will compute these from 30-day historical deltas.
const SEED_TREND_MAP: Record<string, { trend: 'rising' | 'stable' | 'falling'; trendPercentage?: number }> = {
  'Python': { trend: 'rising', trendPercentage: 34 },
  'Machine Learning': { trend: 'rising', trendPercentage: 51 },
  'TypeScript': { trend: 'rising', trendPercentage: 42 },
  'AWS': { trend: 'rising', trendPercentage: 28 },
  'Docker': { trend: 'rising', trendPercentage: 25 },
  'React.js': { trend: 'rising', trendPercentage: 18 },
  'Power BI': { trend: 'rising', trendPercentage: 22 },
  'Kubernetes': { trend: 'rising', trendPercentage: 31 },
  'Next.js': { trend: 'rising', trendPercentage: 38 },
  'Data Analysis': { trend: 'rising', trendPercentage: 17 },
  'Cybersecurity': { trend: 'rising', trendPercentage: 44 },
  'Terraform': { trend: 'rising', trendPercentage: 29 },
  'Excel': { trend: 'falling', trendPercentage: -8 },
  'Java': { trend: 'falling', trendPercentage: -15 },
  'SAP': { trend: 'stable' },
  'SQL': { trend: 'stable' },
  'Communication': { trend: 'stable' },
  'Problem-solving': { trend: 'stable' },
  'Microsoft Office': { trend: 'falling', trendPercentage: -5 },
  'AutoCAD': { trend: 'stable' },
}

const INDUSTRY_DISPLAY_NAMES: Record<Industry, string> = {
  technology: 'Technology',
  finance: 'Finance',
  healthcare: 'Healthcare',
  engineering: 'Engineering',
  education: 'Education',
  retail: 'Retail',
  manufacturing: 'Manufacturing',
  other: 'Other',
}

export interface SkillFilter {
  industry?: Industry | 'all'
  city?: City | 'all'
  seniority?: JobPosting['seniority'] | 'all'
  limit?: number
  sort?: 'demand' | 'alpha'
  minConfidence?: number
}

export function computeSkillDemand(jobs: JobPosting[], filter: SkillFilter = {}): SkillDemand[] {
  const {
    industry = 'all',
    city = 'all',
    seniority = 'all',
    limit = 20,
    sort = 'demand',
    minConfidence = 0.7,
  } = filter

  let filtered = jobs
  if (industry !== 'all') filtered = filtered.filter(j => j.industry === industry)
  if (city !== 'all') filtered = filtered.filter(j => j.city === city)
  if (seniority !== 'all') filtered = filtered.filter(j => j.seniority === seniority)

  const total = filtered.length
  if (total === 0) return []

  const skillMap = new Map<string, {
    postingCount: number
    industries: Set<Industry>
    cities: Set<City>
    salaryMins: number[]
    salaryMaxes: number[]
  }>()

  for (const job of filtered) {
    if (!job.extractedSkills) continue

    // Count each skill at most once per posting
    const seenInJob = new Set<string>()

    for (const skill of job.extractedSkills) {
      if (skill.confidence < minConfidence) continue
      if (seenInJob.has(skill.name)) continue
      seenInJob.add(skill.name)

      const entry = skillMap.get(skill.name) ?? {
        postingCount: 0,
        industries: new Set<Industry>(),
        cities: new Set<City>(),
        salaryMins: [],
        salaryMaxes: [],
      }

      entry.postingCount++
      entry.industries.add(job.industry)
      entry.cities.add(job.city)
      if (job.salaryMin != null) entry.salaryMins.push(job.salaryMin)
      if (job.salaryMax != null) entry.salaryMaxes.push(job.salaryMax)

      skillMap.set(skill.name, entry)
    }
  }

  const results: SkillDemand[] = Array.from(skillMap.entries()).map(([skillName, data]) => {
    const trendInfo = SEED_TREND_MAP[skillName]

    const avgSalaryMin = data.salaryMins.length > 0
      ? Math.round(data.salaryMins.reduce((a, b) => a + b, 0) / data.salaryMins.length)
      : undefined

    const avgSalaryMax = data.salaryMaxes.length > 0
      ? Math.round(data.salaryMaxes.reduce((a, b) => a + b, 0) / data.salaryMaxes.length)
      : undefined

    return {
      skillName,
      postingCount: data.postingCount,
      percentageOfTotal: Math.round((data.postingCount / total) * 100 * 10) / 10,
      industries: Array.from(data.industries),
      cities: Array.from(data.cities),
      avgSalaryMin,
      avgSalaryMax,
      trend: trendInfo?.trend ?? 'stable',
      trendPercentage: trendInfo?.trendPercentage,
    }
  })

  if (sort === 'demand') {
    results.sort((a, b) => b.postingCount - a.postingCount || a.skillName.localeCompare(b.skillName))
  } else {
    results.sort((a, b) => a.skillName.localeCompare(b.skillName))
  }

  return results.slice(0, limit)
}

export function computeTrendingSkills(jobs: JobPosting[], limit = 5): SkillDemand[] {
  const all = computeSkillDemand(jobs, { limit: 100, sort: 'demand', minConfidence: 0.7 })

  return all
    .filter(s => s.trend === 'rising' && s.trendPercentage != null)
    .sort((a, b) => (b.trendPercentage ?? 0) - (a.trendPercentage ?? 0))
    .slice(0, limit)
}

export function computeIndustryStats(jobs: JobPosting[]): IndustryStat[] {
  const total = jobs.length
  const map = new Map<Industry, { count: number; skills: Map<string, number> }>()

  for (const job of jobs) {
    const entry = map.get(job.industry) ?? { count: 0, skills: new Map() }
    entry.count++

    if (job.extractedSkills) {
      for (const skill of job.extractedSkills) {
        if (skill.confidence >= 0.8) {
          entry.skills.set(skill.name, (entry.skills.get(skill.name) ?? 0) + 1)
        }
      }
    }

    map.set(job.industry, entry)
  }

  return Array.from(map.entries())
    .map(([industry, data]) => ({
      industry,
      displayName: INDUSTRY_DISPLAY_NAMES[industry],
      postingCount: data.count,
      percentageOfTotal: Math.round((data.count / total) * 100 * 10) / 10,
      topSkills: Array.from(data.skills.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name),
    }))
    .sort((a, b) => b.postingCount - a.postingCount)
}
