/**
 * JSearch (RapidAPI) Malaysia job fetcher
 *
 * Usage:
 *   npx tsx scripts/fetch-jsearch.ts [--limit 100] [--pages 3]
 *
 * Fetches real Malaysian job listings from JSearch — aggregates LinkedIn, Indeed, etc.
 * Requires JSEARCH_API_KEY env var. Free tier: 200 req/mo on RapidAPI.
 * Sign up: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 *
 * Appends new postings to lib/data/scraped-jobs.json (dedupes by id).
 * After fetching, run:
 *   echo "y" | npx tsx scripts/extract-skills.ts   ← AI skill extraction
 *   npx tsx scripts/save-snapshot.ts               ← save trend snapshot
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

// Load .env.local for local development (Next.js doesn't auto-load it for scripts)
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

// ── Types (inlined — scripts can't rely on tsconfig @/ paths at runtime) ─────
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
  source: 'jsearch'
}

// ── Config ────────────────────────────────────────────────────────────────────
const OUTPUT_PATH = path.resolve(__dirname, '../lib/data/scraped-jobs.json')
const JSEARCH_HOST = 'jsearch.p.rapidapi.com'
const RATE_LIMIT_MS = 600

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// Diverse queries to get coverage across all six tracked industries
const SEARCH_QUERIES = [
  'software developer Malaysia',
  'data analyst Malaysia',
  'finance accountant Malaysia',
  'healthcare nurse doctor Malaysia',
  'civil mechanical engineer Malaysia',
  'retail operations manager Malaysia',
  'manufacturing production Malaysia',
]

// ── Classification helpers (mirrors lib/pipeline/normalize.ts) ───────────────
const INDUSTRY_PATTERNS: Array<[RegExp, Industry]> = [
  [/\b(tech|software|it\b|digital|cloud|data|cyber|developer|programming|ai|machine.learning)\b/i, 'technology'],
  [/\b(financ|bank|account|audit|invest|insurance|trading|economic|fintech)\b/i, 'finance'],
  [/\b(health|hospital|medical|pharma|clinic|nurse|doctor|patient|healthcare)\b/i, 'healthcare'],
  [/\b(civil|mechanical|electrical|chemical|oil|gas|structural|process|petrochemical)\b/i, 'engineering'],
  [/\b(teach|school|university|education|tutor|academic|lectur|training)\b/i, 'education'],
  [/\b(retail|shop|store|ecomm|fmcg|consumer)\b/i, 'retail'],
  [/\b(manufactur|factory|production|assembly|quality|plant)\b/i, 'manufacturing'],
]
function mapIndustry(text: string): Industry {
  for (const [p, i] of INDUSTRY_PATTERNS) if (p.test(text)) return i
  return 'other'
}

const CITY_PATTERNS: Array<[RegExp, City]> = [
  [/kuala.lumpur|kl\b|petaling.jaya|wilayah.persekutuan|mont.kiara|bangsar/i, 'kuala-lumpur'],
  [/selangor|shah.alam|subang|puchong|klang|sepang|cyberjaya|putrajaya/i, 'selangor'],
  [/penang|pulau.pinang|george.?town|bayan.lepas|butterworth/i, 'penang'],
  [/johor|jb\b|iskandar|skudai|senai/i, 'johor'],
  [/remote|work.from.home|\bwfh\b|hybrid/i, 'remote'],
]
function mapCity(location: string): City {
  for (const [p, c] of CITY_PATTERNS) if (p.test(location)) return c
  return 'other'
}

function inferSeniority(title: string): Seniority {
  const t = title.toLowerCase()
  if (/\b(senior|sr\.?\s|lead\b|principal|head.of|chief|director)\b/.test(t)) return 'senior'
  if (/\b(manager|vp\b|vice.president|associate.director)\b/.test(t)) return 'lead'
  if (/\b(junior|jr\.?\s|entry.level|graduate|fresh|intern)\b/.test(t)) return 'junior'
  return 'mid'
}

// ── JSearch API types ─────────────────────────────────────────────────────────
interface JSearchJob {
  job_id: string
  job_title?: string
  employer_name?: string
  employer_company_type?: string
  job_city?: string
  job_state?: string
  job_is_remote?: boolean
  job_description?: string
  job_min_salary?: number | null
  job_max_salary?: number | null
  job_salary_currency?: string | null
  job_salary_period?: string | null
  job_posted_at_datetime_utc?: string
}

interface JSearchResponse {
  status?: string
  data?: JSearchJob[]
  error?: Record<string, unknown>
}

// ── Mapping ───────────────────────────────────────────────────────────────────
function mapJob(raw: JSearchJob, queryHint: string): ScrapedJob | null {
  if (!raw.job_id || !raw.job_title) return null

  const description = (raw.job_description ?? '').trim()
  if (description.length < 30) return null

  const locationText = [
    raw.job_city ?? '',
    raw.job_state ?? '',
    raw.job_is_remote ? 'remote' : '',
  ].join(' ')

  const industryHint = `${raw.employer_company_type ?? ''} ${raw.job_title} ${queryHint}`

  // Salary: JSearch sometimes returns annual figures — convert to monthly
  let salaryMin = raw.job_min_salary ?? undefined
  let salaryMax = raw.job_max_salary ?? undefined
  const period = raw.job_salary_period ?? ''
  if (period === 'YEAR') {
    if (salaryMin !== undefined) salaryMin = Math.round(salaryMin / 12)
    if (salaryMax !== undefined) salaryMax = Math.round(salaryMax / 12)
  }
  // Drop non-MYR salary data — it's not useful for Malaysian market analysis
  const isMyr = !raw.job_salary_currency || raw.job_salary_currency === 'MYR'
  if (!isMyr) { salaryMin = undefined; salaryMax = undefined }

  return {
    id: `jsearch-${raw.job_id}`,
    title: raw.job_title,
    company: raw.employer_name ?? 'Unknown',
    industry: mapIndustry(industryHint),
    city: mapCity(locationText),
    seniority: inferSeniority(raw.job_title),
    rawDescription: description.slice(0, 3000),
    postedAt: raw.job_posted_at_datetime_utc
      ? raw.job_posted_at_datetime_utc.split('T')[0]
      : new Date().toISOString().split('T')[0],
    source: 'jsearch',
    ...(salaryMin !== undefined && { salaryMin }),
    ...(salaryMax !== undefined && { salaryMax }),
  }
}

// ── API fetch ─────────────────────────────────────────────────────────────────
async function fetchPage(query: string, page: number, apiKey: string): Promise<JSearchJob[]> {
  const params = new URLSearchParams({
    query,
    page: String(page),
    num_pages: '1',
    country: 'my',
    date_posted: 'month',
  })

  const res = await fetch(`https://${JSEARCH_HOST}/search?${params}`, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': JSEARCH_HOST,
    },
    signal: AbortSignal.timeout(20000),
  })

  if (res.status === 429) throw new Error('RATE_LIMITED')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const json = await res.json() as JSearchResponse
  if (json.status === 'ERROR') throw new Error(`JSearch error: ${JSON.stringify(json.error)}`)

  return json.data ?? []
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.JSEARCH_API_KEY ?? ''
  if (!apiKey) {
    console.error('❌ JSEARCH_API_KEY not set.')
    console.error('   Get a free key at https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const getArg = (flag: string, def: number) => {
    const i = args.indexOf(flag)
    return i !== -1 ? Math.max(1, parseInt(args[i + 1] ?? String(def), 10)) : def
  }
  const limit = getArg('--limit', 100)
  const maxPages = getArg('--pages', 3)

  console.log('🌐 SignalMap — JSearch Malaysia Job Fetcher')
  console.log(`   Queries   : ${SEARCH_QUERIES.length} (industry-spread)`)
  console.log(`   Pages/q   : up to ${maxPages}`)
  console.log(`   Limit     : ${limit} new postings\n`)

  const collected: ScrapedJob[] = []

  for (const query of SEARCH_QUERIES) {
    if (collected.length >= limit) break
    console.log(`🔍 "${query}"`)

    for (let page = 1; page <= maxPages && collected.length < limit; page++) {
      process.stdout.write(`   Page ${page}/${maxPages} ... `)
      try {
        const rawJobs = await fetchPage(query, page, apiKey)
        const mapped = rawJobs
          .map(j => mapJob(j, query))
          .filter((j): j is ScrapedJob => j !== null)
        collected.push(...mapped)
        console.log(`${mapped.length} jobs  (running: ${collected.length})`)
        if (rawJobs.length === 0) { console.log('   No more results.\n'); break }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`✗ ${msg}`)
        if (msg === 'RATE_LIMITED') {
          console.log('   Rate limited — waiting 10s...')
          await sleep(10000)
        }
      }
      await sleep(RATE_LIMIT_MS)
    }
  }

  // Merge — dedupe against existing scraped-jobs.json
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
  if (newJobs.length > 0) {
    console.log('\n📝 Next:')
    console.log('   echo "y" | npx tsx scripts/extract-skills.ts')
    console.log('   npx tsx scripts/save-snapshot.ts')
  }
}

main().catch(console.error)
