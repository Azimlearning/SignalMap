import type { JobPosting } from '@/lib/types'
import rawSeedJobs from '@/lib/data/seed-jobs.json'

export function loadSeedJobs(): JobPosting[] {
  return rawSeedJobs as unknown as JobPosting[]
}
