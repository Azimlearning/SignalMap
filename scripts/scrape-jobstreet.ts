/**
 * JobStreet Malaysia scraper
 *
 * Usage:
 *   npx tsx scripts/scrape-jobstreet.ts [--limit 100] [--pages 10]
 *
 * Scrapes public job listings from JobStreet Malaysia (jobstreet.com.my).
 * Rate limited to 1 req/sec. Checks robots.txt first.
 * Appends new postings to lib/data/scraped-jobs.json without overwriting.
 *
 * After scraping, run:
 *   npx tsx scripts/extract-skills.ts   ← adds Claude-extracted skills
 *   npx tsx scripts/save-snapshot.ts    ← saves historical snapshot for trend tracking
 *
 * NOTE: Review JobStreet's Terms of Service before running at scale.
 * This scraper is for hackathon/research demonstration purposes only.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

// ── Types (relative — scripts can't rely on tsconfig @/ paths at runtime) ──
type Industry = 'technology' | 'finance' | 'healthcare' | 'engineering' | 'education' | 'retail' | 'manufacturing' | 'other'
type City = 'kuala-lumpur' | 'selangor' | 'penang' | 'johor' | 'remote' | 'other'
type Seniority = 'junior' | 'mid' | 'senior' | 'lead'

interface ScrapedJob {
  id: string
  title: string
  company: string
  industry: Industry
  city: City
  salaryMin?: number
  salaryMax?: number
  seniority: Seniority
  rawDescription: string
  postedAt: string
  source: 'jobstreet'
}

// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = 'https://www.jobstreet.com.my'
const OUTPUT_PATH = path.resolve(__dirname, '../lib/data/scraped-jobs.json')
const RATE_LIMIT_MS = 1100
const USER_AGENT = 'SignalMap-Research/1.0 (TalentIntelligence; hackathon; contact: fakhrulazim.am@gmail.com)'

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ── Classification mappings ──────────────────────────────────────────────────
const INDUSTRY_PATTERNS: Array<[RegExp, Industry]> = [
  [/\b(tech|software|it\b|digital|cloud|data|cyber|developer|programming|ai|machine.learning)\b/i, 'technology'],
  [/\b(financ|bank|account|audit|invest|insurance|trading|economic|fintech)\b/i, 'finance'],
  [/\b(health|hospital|medical|pharma|clinic|nurse|doctor|patient|healthcare)\b/i, 'healthcare'],
  [/\b(civil|mechanical|electrical|chemical|oil|gas|structural|process|petrochemical)\b/i, 'engineering'],
  [/\b(teach|school|university|education|tutor|academic|lectur|training)\b/i, 'education'],
  [/\b(retail|shop|store|ecomm|fmcg|consumer)\b/i, 'retail'],
  [/\b(manufactur|factory|production|assembly|quality|plant)\b/i, 'manufacturing'],
]

function mapIndustry(classification: string, title = ''): Industry {
  const text = `${classification} ${title}`
  for (const [pattern, industry] of INDUSTRY_PATTERNS) {
    if (pattern.test(text)) return industry
  }
  return 'other'
}

const CITY_PATTERNS: Array<[RegExp, City]> = [
  [/kuala.lumpur|kl\b|klcc|mont.kiara|bangsar|chow.kit|petaling.jaya|pj\b/i, 'kuala-lumpur'],
  [/selangor|shah.alam|subang|puchong|klang|ampang|sepang|cyberjaya|putrajaya/i, 'selangor'],
  [/penang|george.?town|bayan.lepas|butterworth|kulim/i, 'penang'],
  [/johor|jb\b|iskandar|skudai|senai|tampoi/i, 'johor'],
  [/remote|work.from.home|\bwfh\b|hybrid|anywhere/i, 'remote'],
]

function mapCity(location: string): City {
  for (const [pattern, city] of CITY_PATTERNS) {
    if (pattern.test(location)) return city
  }
  return 'other'
}

function inferSeniority(title: string): Seniority {
  const t = title.toLowerCase()
  if (/\b(senior|sr\.?\s|lead\b|principal|head.of|chief|director)\b/.test(t)) return 'senior'
  if (/\b(manager|vp\b|vice.president|associate.director)\b/.test(t)) return 'lead'
  if (/\b(junior|jr\.?\s|entry.level|graduate|fresh|intern)\b/.test(t)) return 'junior'
  return 'mid'
}

function parseSalary(raw: string): { min?: number; max?: number } {
  if (!raw) return {}
  const cleaned = raw.replace(/[,\s]/g, '').replace(/[kK]/g, '000')
  const nums = Array.from(cleaned.matchAll(/\d{3,6}/g), m => parseInt(m[0], 10))
  if (nums.length === 0) return {}
  return { min: nums[0], max: nums[1] ?? nums[0] }
}

// ── HTML extraction helpers ──────────────────────────────────────────────────
function extractNextData(html: string): unknown {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m?.[1]) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

function getIn(obj: unknown, ...keys: string[]): unknown {
  let curr = obj
  for (const key of keys) {
    if (curr == null || typeof curr !== 'object' || Array.isArray(curr)) return undefined
    curr = (curr as Record<string, unknown>)[key]
  }
  return curr
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''
}

// JobStreet stores jobs at different __NEXT_DATA__ paths across versions.
// Try all known paths; adjust here if none match based on debug output.
function extractJobsFromNextData(nd: unknown): Array<Record<string, unknown>> {
  const candidates = [
    getIn(nd, 'props', 'pageProps', 'jobs'),
    getIn(nd, 'props', 'pageProps', 'results', 'jobs'),
    getIn(nd, 'props', 'pageProps', 'initialState', 'chalice', 'displayJobs'),
    getIn(nd, 'props', 'pageProps', 'initialState', 'jobsearch', 'results', 'jobs'),
    getIn(nd, 'props', 'pageProps', 'data', 'jobs'),
    getIn(nd, 'props', 'pageProps', 'jobList'),
  ]
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c as Array<Record<string, unknown>>
  }
  return []
}

function mapRawJob(raw: Record<string, unknown>): ScrapedJob | null {
  const rawId = raw.id ?? raw.jobId ?? raw.listingId
  if (!rawId) return null

  const title = str(raw.jobTitle ?? raw.title ?? raw.position)
  if (!title) return null

  const advertiser = raw.advertiser
  const company = str(
    (typeof advertiser === 'object' && advertiser !== null ? (advertiser as Record<string, unknown>).description : null) ??
    raw.companyName ?? raw.company ?? 'Unknown Company'
  )

  const locObj = raw.location ?? raw.suburb
  const location = str(
    (typeof locObj === 'object' && locObj !== null ? (locObj as Record<string, unknown>).label ?? (locObj as Record<string, unknown>).description : null) ??
    raw.location ?? raw.area ?? ''
  )

  const classObj = raw.classification ?? raw.category
  const classification = str(
    (typeof classObj === 'object' && classObj !== null ? (classObj as Record<string, unknown>).description ?? (classObj as Record<string, unknown>).name : null) ??
    raw.classification ?? ''
  )

  const salaryRaw = str(raw.salary ?? raw.salaryLabel ?? raw.salaryRange ?? '')
  const description = str(raw.content ?? raw.description ?? raw.teaser ?? raw.snippet ?? '')
  if (description.length < 30) return null

  const salary = parseSalary(salaryRaw)

  return {
    id: `jobstreet-${String(rawId)}`,
    title,
    company,
    industry: mapIndustry(classification, title),
    city: mapCity(location),
    salaryMin: salary.min,
    salaryMax: salary.max,
    seniority: inferSeniority(title),
    rawDescription: description.slice(0, 3000),
    postedAt: new Date().toISOString().split('T')[0],
    source: 'jobstreet',
  }
}

// ── robots.txt check ─────────────────────────────────────────────────────────
async function checkRobots(): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) { console.log('⚠️  robots.txt not reachable — proceeding with caution\n'); return }

    const text = await res.text()
    let inScope = false
    const disallowed: string[] = []

    for (const raw of text.split('\n')) {
      const line = raw.trim()
      if (/^User-agent:\s*\*$/i.test(line)) { inScope = true; continue }
      if (/^User-agent:/i.test(line) && inScope) break
      if (inScope && /^Disallow:/i.test(line)) {
        disallowed.push(line.replace(/^Disallow:\s*/i, ''))
      }
    }

    const blocked = disallowed.some(p => p === '/' || p === '/jobs' || p.startsWith('/jobs/'))
    if (blocked) {
      console.error('❌ robots.txt disallows /jobs. Aborting to respect site policy.')
      process.exit(1)
    }
    console.log('✅ robots.txt: job pages not explicitly blocked\n')
  } catch {
    console.log('⚠️  Could not read robots.txt — proceeding with caution\n')
  }
}

// ── Fetch one listing page ────────────────────────────────────────────────────
async function fetchPage(page: number): Promise<ScrapedJob[]> {
  const url = `${BASE_URL}/jobs?pg=${page}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-MY,en;q=0.9',
    },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const html = await res.text()
  const nd = extractNextData(html)

  if (!nd) {
    console.warn('    ⚠️  No __NEXT_DATA__ found. Site may require JS execution.')
    console.warn('    ℹ️  Try Playwright-based scraping if this persists.\n')
    return []
  }

  const rawJobs = extractJobsFromNextData(nd)
  if (rawJobs.length === 0) {
    const ppKeys = Object.keys((getIn(nd, 'props', 'pageProps') as Record<string, unknown> | undefined) ?? {})
    console.warn(`    ⚠️  No jobs found in __NEXT_DATA__. pageProps keys: [${ppKeys.join(', ')}]`)
    console.warn('    ℹ️  Update extractJobsFromNextData() path based on keys above.\n')
    return []
  }

  return rawJobs.map(mapRawJob).filter((j): j is ScrapedJob => j !== null)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const get = (flag: string, def: number) => {
    const i = args.indexOf(flag)
    return i !== -1 ? Math.max(1, parseInt(args[i + 1] ?? String(def), 10)) : def
  }

  const limit = get('--limit', 100)
  const maxPages = get('--pages', 10)

  console.log('🔍 SignalMap — JobStreet Malaysia Scraper')
  console.log(`   Target: ≤${limit} postings from ≤${maxPages} pages\n`)

  await checkRobots()
  await sleep(RATE_LIMIT_MS)

  const collected: ScrapedJob[] = []

  for (let p = 1; p <= maxPages && collected.length < limit; p++) {
    process.stdout.write(`📄 Page ${p}/${maxPages} ... `)
    try {
      const jobs = await fetchPage(p)
      collected.push(...jobs)
      console.log(`${jobs.length} jobs (total: ${collected.length})`)
      if (jobs.length === 0) { console.log('   No more results.\n'); break }
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : String(err)}`)
    }
    await sleep(RATE_LIMIT_MS)
  }

  // Merge — skip IDs already in file
  const existing: ScrapedJob[] = fs.existsSync(OUTPUT_PATH)
    ? (JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8')) as ScrapedJob[])
    : []

  const existingIds = new Set(existing.map(j => j.id))
  const newJobs = collected.filter(j => !existingIds.has(j.id)).slice(0, limit)
  const updated = [...existing, ...newJobs]

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(updated, null, 2))

  console.log(`\n✅ Done!`)
  console.log(`   New jobs added : ${newJobs.length}`)
  console.log(`   Total in file  : ${updated.length}`)
  console.log(`   Output         : ${OUTPUT_PATH}`)
  if (newJobs.length > 0) {
    console.log('\n📝 Next steps:')
    console.log('   npx tsx scripts/extract-skills.ts   ← extract skills with Claude')
    console.log('   npx tsx scripts/save-snapshot.ts    ← save historical snapshot')
  }
}

main().catch(console.error)
