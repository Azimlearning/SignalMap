import * as fs from 'node:fs'
import * as path from 'node:path'
import type { JobPosting } from '@/lib/types'
import rawSeedJobs from '@/lib/data/seed-jobs.json'

export function loadSeedJobs(): JobPosting[] {
  return rawSeedJobs as unknown as JobPosting[]
}

export function loadScrapedJobs(): JobPosting[] {
  try {
    const filePath = path.join(process.cwd(), 'lib', 'data', 'scraped-jobs.json')
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as JobPosting[]
  } catch {
    return []
  }
}

export function loadAllJobs(): JobPosting[] {
  return [...loadSeedJobs(), ...loadScrapedJobs()]
}
