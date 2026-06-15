/**
 * MYFutureJobs Malaysia scraper
 *
 * Usage:
 *   npx tsx scripts/scrape-myfuturejobs.ts [--limit 100]
 *
 * Scrapes public job listings from MYFutureJobs (myfuturejobs.gov.my),
 * the Malaysian government's official job portal.
 * Rate limited to 1 req/sec.
 * Appends new postings to lib/data/scraped-jobs.json.
 *
 * The portal exposes a public search API at /api/vacancy — no auth required.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

// ── Types ────────────────────────────────────────────────────────────────────
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
  source: 'myfuturejobs'
}

// ── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = 'https://www.myfuturejobs.gov.my'
const OUTPUT_PATH = path.resolve(__dirname, '../lib/data/scraped-jobs.json')
const RATE_LIMIT_MS = 1100
const USER_AGENT = 'SignalMap-Research/1.0 (TalentIntelligence; hackathon; contact: fakhrulazim.am@gmail.com)'

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ── Mapping helpers ───────────────────────────────────────────────────────────
const INDUSTRY_PATTERNS: Array<[RegExp, Industry]> = [
  [/\b(tech|software|it\b|digital|cloud|data|cyber|developer|programming|ai)\b/i, 'technology'],
  [/\b(financ|bank|account|audit|invest|insurance|trading|economic)\b/i, 'finance'],
  [/\b(health|hospital|medical|pharma|clinic|nurse|doctor|healthcare)\b/i, 'healthcare'],
  [/\b(civil|mechanical|electrical|chemical|oil|gas|structural|engineer)\b/i, 'engineering'],
  [/\b(teach|school|university|education|tutor|academic|lectur)\b/i, 'education'],
  [/\b(retail|shop|store|ecomm|fmcg)\b/i, 'retail'],
  [/\b(manufactur|factory|production|assembly|plant)\b/i, 'manufacturing'],
]

function mapIndustry(text: string): Industry {
  for (const [p, i] of INDUSTRY_PATTERNS) if (p.test(text)) return i
  return 'other'
}

const CITY_PATTERNS: Array<[RegExp, City]> = [
  [/kuala.lumpur|\bkl\b|wilayah.persekutuan/i, 'kuala-lumpur'],
  [/selangor|shah.alam|subang|puchong|klang|sepang|cyberjaya/i, 'selangor'],
  [/penang|pulau.pinang|george.?town|bayan.lepas/i, 'penang'],
  [/johor|jb\b|iskandar|skudai/i, 'johor'],
  [/remote|wfh|work.from.home|hybrid/i, 'remote'],
]

function mapCity(location: string): City {
  for (const [p, c] of CITY_PATTERNS) if (p.test(location)) return c
  return 'other'
}

function inferSeniority(title: string): Seniority {
  const t = title.toLowerCase()
  if (/\b(senior|sr\.?\s|lead|head.of|chief|director)\b/.test(t)) return 'senior'
  if (/\b(manager|vp\b)\b/.test(t)) return 'lead'
  if (/\b(junior|jr\.?\s|entry|graduate|fresh|intern)\b/.test(t)) return 'junior'
  return 'mid'
}

function parseSalary(min: unknown, max: unknown): { min?: number; max?: number } {
  const n = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(/[^0-9.]/g, '')) : NaN)
  const lo = n(min)
  const hi = n(max)
  return {
    min: isNaN(lo) ? undefined : Math.round(lo),
    max: isNaN(hi) ? undefined : Math.round(hi),
  }
}

// ── API-based scraping ────────────────────────────────────────────────────────
// MYFutureJobs exposes a REST API used by the SPA frontend.
// Endpoint discovered from browser DevTools network tab.
// If this returns 404, try the HTML-based fallback below.
interface MFJApiResponse {
  data?: {
    vacancies?: Array<{
      id: string | number
      title: string
      company_name?: string
      company?: { name?: string }
      state?: string
      district?: string
      category?: string
      industry?: string
      min_salary?: number | string
      max_salary?: number | string
      description?: string
      requirement?: string
      closing_date?: string
    }>
    total?: number
    current_page?: number
    last_page?: number
  }
  // alternate structure
  vacancies?: Array<Record<string, unknown>>
  total?: number
}

function mapVacancy(v: Record<string, unknown>): ScrapedJob | null {
  const rawId = v.id
  if (!rawId) return null
  const title = String(v.title ?? '')
  if (!title) return null

  const company = String(
    (typeof v.company === 'object' && v.company !== null
      ? (v.company as Record<string, unknown>).name
      : null) ??
    v.company_name ??
    'Unknown'
  )
  const location = String(`${v.state ?? ''} ${v.district ?? ''}`.trim())
  const category = String(v.category ?? v.industry ?? '')
  const description = String([v.description, v.requirement].filter(Boolean).join('\n\n'))
  if (description.length < 30) return null

  const { min: salaryMin, max: salaryMax } = parseSalary(v.min_salary, v.max_salary)

  const job: ScrapedJob = {
    id: `myfuturejobs-${String(rawId)}`,
    title,
    company,
    industry: mapIndustry(`${category} ${title}`),
    city: mapCity(location),
    seniority: inferSeniority(title),
    rawDescription: description.slice(0, 3000),
    postedAt: new Date().toISOString().split('T')[0],
    source: 'myfuturejobs',
    ...(salaryMin !== undefined && { salaryMin }),
    ...(salaryMax !== undefined && { salaryMax }),
  }
  return job
}

async function fetchViaApi(page: number, limit: number): Promise<ScrapedJob[]> {
  // Try public API endpoint (discovered from network inspector)
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(Math.min(limit, 20)),
    status: 'active',
  })
  const url = `${BASE_URL}/api/vacancy/search?${params}`

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`API HTTP ${res.status}`)

  const json = await res.json() as MFJApiResponse
  const vacancies: Array<Record<string, unknown>> =
    json.data?.vacancies ??
    json.vacancies ??
    []

  return vacancies.map(mapVacancy).filter((j): j is ScrapedJob => j !== null)
}

// ── HTML fallback ─────────────────────────────────────────────────────────────
// If the REST API is unavailable, try extracting from the rendered HTML.
function extractNextData(html: string): unknown {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (m?.[1]) { try { return JSON.parse(m[1]) } catch { /* ignore */ } }
  // Also try Nuxt/Vue __NUXT__ payload
  const n = html.match(/<script>window\.__NUXT__\s*=\s*([\s\S]*?)<\/script>/)
  if (n?.[1]) { try { return JSON.parse(n[1]) } catch { /* ignore */ } }
  return null
}

async function fetchViaHtml(page: number): Promise<ScrapedJob[]> {
  const url = `${BASE_URL}/job-listing?page=${page}`
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`HTML HTTP ${res.status}`)
  const html = await res.text()
  const nd = extractNextData(html)
  if (!nd) {
    console.warn('    ⚠️  No parseable page data in HTML. Site likely requires JS execution.')
    return []
  }
  // Placeholder: real extraction path depends on actual page structure
  console.warn('    ℹ️  HTML extraction: inspect __NEXT_DATA__ / __NUXT__ structure and update here.')
  return []
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const get = (flag: string, def: number) => {
    const i = args.indexOf(flag); return i !== -1 ? Math.max(1, parseInt(args[i + 1] ?? String(def), 10)) : def
  }
  const limit = get('--limit', 100)

  console.log('🔍 SignalMap — MYFutureJobs Scraper (gov.my)')
  console.log(`   Target: ≤${limit} postings\n`)

  await sleep(RATE_LIMIT_MS)

  const collected: ScrapedJob[] = []
  let page = 1
  let useApiMode = true

  while (collected.length < limit) {
    process.stdout.write(`📄 Page ${page} (${useApiMode ? 'API' : 'HTML'}) ... `)
    try {
      const jobs = useApiMode
        ? await fetchViaApi(page, limit - collected.length)
        : await fetchViaHtml(page)
      collected.push(...jobs)
      console.log(`${jobs.length} jobs (total: ${collected.length})`)
      if (jobs.length === 0) { console.log('   No more results.\n'); break }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (useApiMode && msg.includes('HTTP 4')) {
        console.log(`✗ API unavailable (${msg}), switching to HTML mode`)
        useApiMode = false
      } else {
        console.log(`✗ ${msg}`)
        break
      }
    }
    page++
    await sleep(RATE_LIMIT_MS)
  }

  // Merge into shared scraped-jobs.json
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
}

main().catch(console.error)
