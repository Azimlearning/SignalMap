import type { ApiResponse } from '@/lib/types'
import { loadSeedJobs, loadScrapedJobs } from '@/lib/pipeline/loader'
import { listSnapshotDates, getLatestSnapshot } from '@/lib/pipeline/history'

interface PipelineStatus {
  seedJobs: number
  scrapedJobs: number
  totalJobs: number
  snapshotDates: string[]
  latestSnapshot: string | null
  dataFreshness: 'seed-only' | 'live'
}

// Called by Vercel cron daily at 02:00 UTC (10:00 MYT).
// Returns current pipeline status. Actual scraping runs in GitHub Actions
// and is committed to the repo, triggering a Vercel redeploy with fresh data.
export async function GET(): Promise<Response> {
  try {
    const seedJobs = loadSeedJobs()
    const scrapedJobs = loadScrapedJobs()
    const snapshotDates = listSnapshotDates()
    const latest = getLatestSnapshot()

    const status: PipelineStatus = {
      seedJobs: seedJobs.length,
      scrapedJobs: scrapedJobs.length,
      totalJobs: seedJobs.length + scrapedJobs.length,
      snapshotDates,
      latestSnapshot: latest?.date ?? null,
      dataFreshness: scrapedJobs.length > 0 ? 'live' : 'seed-only',
    }

    const body: ApiResponse<PipelineStatus> = {
      data: status,
      success: true,
      timestamp: new Date().toISOString(),
    }

    return Response.json(body)
  } catch (error) {
    return Response.json(
      {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}
