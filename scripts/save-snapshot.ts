/**
 * Saves a daily skill-demand snapshot for historical trend tracking (A-P1-05).
 *
 * Usage:
 *   npx tsx scripts/save-snapshot.ts [--date YYYY-MM-DD]
 *
 * Reads all jobs from lib/data/ (seed + scraped), computes current skill demand
 * counts, and writes a dated snapshot to lib/data/history/YYYY-MM-DD.json.
 *
 * After 7+ days of snapshots, the dashboard shows real trend percentages
 * instead of the hardcoded SEED_TREND_MAP signals.
 *
 * Run this script after scraping:
 *   npx tsx scripts/scrape-jobstreet.ts
 *   npx tsx scripts/scrape-myfuturejobs.ts
 *   npx tsx scripts/extract-skills.ts
 *   npx tsx scripts/save-snapshot.ts   ← this file
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

// ── Types (relative imports for scripts) ─────────────────────────────────────
interface ExtractedSkill {
  name: string
  confidence: number
  frequency: number
}

interface JobPosting {
  id: string
  extractedSkills?: ExtractedSkill[]
}

interface SkillSnapshot {
  date: string
  totalJobs: number
  skills: Record<string, number>
}

// ── Config ────────────────────────────────────────────────────────────────────
const SEED_PATH = path.resolve(__dirname, '../lib/data/seed-jobs.json')
const SCRAPED_PATH = path.resolve(__dirname, '../lib/data/scraped-jobs.json')
const HISTORY_DIR = path.resolve(__dirname, '../lib/data/history')
const MIN_CONFIDENCE = 0.7

function loadJobs(): JobPosting[] {
  const seed: JobPosting[] = fs.existsSync(SEED_PATH)
    ? (JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8')) as JobPosting[])
    : []
  const scraped: JobPosting[] = fs.existsSync(SCRAPED_PATH)
    ? (JSON.parse(fs.readFileSync(SCRAPED_PATH, 'utf-8')) as JobPosting[])
    : []
  return [...seed, ...scraped]
}

function computeSkillCounts(jobs: JobPosting[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const job of jobs) {
    if (!job.extractedSkills) continue
    const seen = new Set<string>()
    for (const skill of job.extractedSkills) {
      if (skill.confidence < MIN_CONFIDENCE || seen.has(skill.name)) continue
      seen.add(skill.name)
      counts[skill.name] = (counts[skill.name] ?? 0) + 1
    }
  }
  return counts
}

async function main() {
  const args = process.argv.slice(2)
  const dateIdx = args.indexOf('--date')
  const date = dateIdx !== -1
    ? (args[dateIdx + 1] ?? new Date().toISOString().split('T')[0])
    : new Date().toISOString().split('T')[0]

  console.log(`📸 SignalMap — Saving skill snapshot for ${date}`)

  const jobs = loadJobs()
  if (jobs.length === 0) {
    console.error('❌ No jobs found. Run the scrapers first.')
    process.exit(1)
  }

  const skills = computeSkillCounts(jobs)
  const topSkillCount = Object.keys(skills).length
  console.log(`   Jobs loaded    : ${jobs.length}`)
  console.log(`   Unique skills  : ${topSkillCount}`)

  const snapshot: SkillSnapshot = {
    date,
    totalJobs: jobs.length,
    skills,
  }

  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true })
  const outPath = path.join(HISTORY_DIR, `${date}.json`)
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2))

  console.log(`\n✅ Snapshot saved: ${outPath}`)
  console.log(`   Top 5 skills:`)
  Object.entries(skills)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([name, count]) => console.log(`     ${name}: ${count} postings`))
}

main().catch(console.error)
