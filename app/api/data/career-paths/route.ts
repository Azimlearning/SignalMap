import type { ApiResponse, Industry, JobPosting } from '@/lib/types'
import { loadAllJobs } from '@/lib/pipeline/loader'
import { transformJobs } from '@/lib/pipeline/transformer'

export interface CareerLevel {
  seniority: JobPosting['seniority']
  label: string
  jobCount: number
  topTitles: string[]
  topSkills: string[]
  avgSalaryMin?: number
  avgSalaryMax?: number
}

export interface CareerPath {
  industry: Industry
  displayName: string
  totalJobs: number
  levels: CareerLevel[]
}

const INDUSTRY_NAMES: Record<Industry, string> = {
  technology: 'Technology',
  finance: 'Finance',
  healthcare: 'Healthcare',
  engineering: 'Engineering',
  education: 'Education',
  retail: 'Retail',
  manufacturing: 'Manufacturing',
  other: 'Other',
}

const SENIORITY_ORDER: JobPosting['seniority'][] = ['junior', 'mid', 'senior', 'lead']
const SENIORITY_LABELS: Record<JobPosting['seniority'], string> = {
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
  lead: 'Lead / Manager',
}

function computeCareerPaths(jobs: JobPosting[], industries: Industry[]): CareerPath[] {
  return industries.map(industry => {
    const industryJobs = jobs.filter(j => j.industry === industry)

    const levels: CareerLevel[] = SENIORITY_ORDER.map(seniority => {
      const group = industryJobs.filter(j => j.seniority === seniority)

      // Top job titles by frequency
      const titleCounts = new Map<string, number>()
      for (const job of group) {
        const normalized = job.title.replace(/\(.*?\)/g, '').trim()
        titleCounts.set(normalized, (titleCounts.get(normalized) ?? 0) + 1)
      }
      const topTitles = Array.from(titleCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([t]) => t)

      // Top skills by frequency across group
      const skillCounts = new Map<string, number>()
      for (const job of group) {
        const seen = new Set<string>()
        for (const skill of job.extractedSkills ?? []) {
          if (skill.confidence < 0.7 || seen.has(skill.name)) continue
          seen.add(skill.name)
          skillCounts.set(skill.name, (skillCounts.get(skill.name) ?? 0) + 1)
        }
      }
      const topSkills = Array.from(skillCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([s]) => s)

      // Salary averages
      const mins = group.filter(j => j.salaryMin != null).map(j => j.salaryMin!)
      const maxs = group.filter(j => j.salaryMax != null).map(j => j.salaryMax!)
      const avg = (arr: number[]) =>
        arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : undefined

      return {
        seniority,
        label: SENIORITY_LABELS[seniority],
        jobCount: group.length,
        topTitles,
        topSkills,
        avgSalaryMin: avg(mins),
        avgSalaryMax: avg(maxs),
      }
    }).filter(l => l.jobCount > 0)

    return {
      industry,
      displayName: INDUSTRY_NAMES[industry],
      totalJobs: industryJobs.length,
      levels,
    }
  }).filter(p => p.totalJobs > 0)
}

export async function GET(): Promise<Response> {
  try {
    const jobs = transformJobs(loadAllJobs())
    const industries: Industry[] = [
      'technology', 'finance', 'healthcare', 'engineering', 'manufacturing', 'retail',
    ]
    const paths = computeCareerPaths(jobs, industries)

    const body: ApiResponse<CareerPath[]> = {
      data: paths,
      success: true,
      timestamp: new Date().toISOString(),
    }

    return Response.json(body)
  } catch (error) {
    return Response.json(
      {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse<CareerPath[]>,
      { status: 500 },
    )
  }
}
