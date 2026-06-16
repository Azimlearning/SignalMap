import * as fs from 'node:fs'
import * as path from 'node:path'
import type { SkillDemand } from '@/lib/types'

export interface SkillSnapshot {
  date: string       // YYYY-MM-DD
  totalJobs: number
  skills: Record<string, number>  // skillName → postingCount
}

const HISTORY_DIR = path.join(process.cwd(), 'lib', 'data', 'history')

function ensureHistoryDir(): string {
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true })
  return HISTORY_DIR
}

export function saveSnapshot(snapshot: SkillSnapshot): void {
  const dir = ensureHistoryDir()
  fs.writeFileSync(path.join(dir, `${snapshot.date}.json`), JSON.stringify(snapshot, null, 2))
}

export function loadSnapshot(date: string): SkillSnapshot | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, `${date}.json`), 'utf-8')) as SkillSnapshot
  } catch {
    return null
  }
}

export function listSnapshotDates(): string[] {
  try {
    return fs
      .readdirSync(HISTORY_DIR)
      .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map(f => f.replace('.json', ''))
      .sort()
  } catch {
    return []
  }
}

// Returns the snapshot closest to N days ago (falls back to oldest available)
export function getSnapshotFromNDaysAgo(days: number): SkillSnapshot | null {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const dates = listSnapshotDates()
  if (dates.length === 0) return null

  // Most recent snapshot on or before the cutoff
  const older = dates.filter(d => d <= cutoffStr)
  const target = older.length > 0 ? older[older.length - 1] : dates[0]
  return loadSnapshot(target)
}

export function getLatestSnapshot(): SkillSnapshot | null {
  const dates = listSnapshotDates()
  if (dates.length === 0) return null
  return loadSnapshot(dates[dates.length - 1])
}

// Returns ordered time series for a single skill across all saved snapshots.
export function getSkillTimeSeries(
  skillName: string,
): Array<{ date: string; count: number }> {
  const dates = listSnapshotDates()
  return dates.map(date => {
    const snap = loadSnapshot(date)
    return { date, count: snap?.skills[skillName] ?? 0 }
  })
}

// Returns dates + top-N skills with their full time series, ordered by latest count desc.
export function getTopSkillsWithTimeSeries(
  limit = 6,
): Array<{ skillName: string; series: Array<{ date: string; count: number }> }> {
  const dates = listSnapshotDates()
  if (dates.length === 0) return []

  const latest = loadSnapshot(dates[dates.length - 1])
  if (!latest) return []

  const topNames = Object.entries(latest.skills)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name]) => name)

  return topNames.map(skillName => ({
    skillName,
    series: dates.map(date => ({
      date,
      count: loadSnapshot(date)?.skills[skillName] ?? 0,
    })),
  }))
}

// Overrides trend/trendPercentage on skillDemands using real 30-day historical delta.
// If no history is available, returns skills unchanged (aggregator's SEED_TREND_MAP stays in effect).
export function enrichWithHistoricalTrends(skills: SkillDemand[], totalJobs: number): SkillDemand[] {
  const old = getSnapshotFromNDaysAgo(30) ?? getSnapshotFromNDaysAgo(7)
  if (!old) return skills

  return skills.map(skill => {
    const currentPct = totalJobs > 0 ? (skill.postingCount / totalJobs) * 100 : 0
    const oldCount = old.skills[skill.skillName] ?? 0
    const oldPct = old.totalJobs > 0 ? (oldCount / old.totalJobs) * 100 : 0

    if (oldPct === 0) return skill // New skill — keep existing trend signal

    const pctChange = Math.round(((currentPct - oldPct) / oldPct) * 100)
    const trend: 'rising' | 'stable' | 'falling' =
      pctChange > 5 ? 'rising' : pctChange < -5 ? 'falling' : 'stable'

    return { ...skill, trend, trendPercentage: pctChange }
  })
}
