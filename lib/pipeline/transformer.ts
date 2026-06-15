import type { JobPosting, ExtractedSkill } from '@/lib/types'
import rawTaxonomy from '@/lib/data/skills-taxonomy.json'

const taxonomy = rawTaxonomy as Record<string, string>

function normalizeSkillName(name: string): string {
  const key = name.toLowerCase().trim()
  return taxonomy[key] ?? name
}

export function transformJob(job: JobPosting): JobPosting {
  if (!job.extractedSkills || job.extractedSkills.length === 0) return job

  const normalized = job.extractedSkills.map((skill): ExtractedSkill => ({
    ...skill,
    name: normalizeSkillName(skill.name),
  }))

  // Deduplicate by normalized name — keep the highest-confidence entry
  const seen = new Map<string, ExtractedSkill>()
  for (const skill of normalized) {
    const existing = seen.get(skill.name)
    if (!existing || skill.confidence > existing.confidence) {
      seen.set(skill.name, skill)
    }
  }

  return { ...job, extractedSkills: Array.from(seen.values()) }
}

export function transformJobs(jobs: JobPosting[]): JobPosting[] {
  return jobs.map(transformJob)
}
