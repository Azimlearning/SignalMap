/**
 * Wobb.my (Hiredly) Malaysia job scraper
 *
 * Usage:
 *   npx tsx scripts/scrape-myfuturejobs.ts [--limit 100] [--pages 10]
 *
 * Scrapes public job listings from Wobb.my (Malaysian startup-focused job board).
 * No API key required. Extracts from __NEXT_DATA__ — no JS execution needed.
 * Rate limited to 1.1 req/sec.
 *
 * Skills are pre-extracted in the page JSON — no AI call needed for Wobb jobs.
 * Appends new postings to lib/data/scraped-jobs.json.
 *
 * NOTE: MYFutureJobs.gov.my pivoted to a WordPress event/job-fair site in 2025;
 * its old /api/vacancy endpoint no longer exists. This scraper now targets Wobb.my.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

// Load .env.local for local development
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

// ── Types (inlined — scripts can't rely on tsconfig @/ paths) ────────────────
type Industry = 'technology' | 'finance' | 'healthcare' | 'engineering' | 'education' | 'retail' | 'manufacturing' | 'other'
type City = 'kuala-lumpur' | 'selangor' | 'penang' | 'johor' | 'remote' | 'other'
type Seniority = 'junior' | 'mid' | 'senior' | 'lead'

interface ExtractedSkill {
  name: string
  category: string
  confidence: number
  frequency: number
}

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
  extractedSkills: ExtractedSkill[]
  postedAt: string
  source: 'wobb'
}

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = 'https://wobb.my'
const OUTPUT_PATH = path.resolve(__dirname, '../lib/data/scraped-jobs.json')
const RATE_LIMIT_MS = 1100
const USER_AGENT = 'SignalMap-Research/1.0 (TalentIntelligence; hackathon; contact: fakhrulazim.am@gmail.com)'

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ── Classification helpers ────────────────────────────────────────────────────
const INDUSTRY_PATTERNS: Array<[RegExp, Industry]> = [
  [/\b(tech|software|it\b|digital|cloud|data|cyber|developer|programming|ai|machine.learning|devops|frontend|backend|fullstack)\b/i, 'technology'],
  [/\b(financ|bank|account|audit|invest|insurance|trading|economic|fintech|treasury)\b/i, 'finance'],
  [/\b(health|hospital|medical|pharma|clinic|nurse|doctor|patient|healthcare|dental)\b/i, 'healthcare'],
  [/\b(civil|mechanical|electrical|chemical|oil|gas|structural|engineer|petrochemical|process)\b/i, 'engineering'],
  [/\b(teach|school|university|education|tutor|academic|lectur|training|curriculum)\b/i, 'education'],
  [/\b(retail|shop|store|ecomm|fmcg|consumer|merchandise|buyer)\b/i, 'retail'],
  [/\b(manufactur|factory|production|assembly|quality|plant|operator|technician)\b/i, 'manufacturing'],
]

function mapIndustry(text: string): Industry {
  for (const [p, i] of INDUSTRY_PATTERNS) if (p.test(text)) return i
  return 'other'
}

const CITY_PATTERNS: Array<[RegExp, City]> = [
  [/kuala.lumpur|kl\b|wilayah|mont.kiara|bangsar|petaling.jaya/i, 'kuala-lumpur'],
  [/selangor|shah.alam|subang|puchong|klang|sepang|cyberjaya|putrajaya/i, 'selangor'],
  [/penang|pulau.pinang|george.?town|bayan.lepas|butterworth/i, 'penang'],
  [/johor|jb\b|iskandar|skudai|senai/i, 'johor'],
  [/remote|wfh|work.from.home|hybrid/i, 'remote'],
]

function mapCity(location: string): City {
  for (const [p, c] of CITY_PATTERNS) if (p.test(location)) return c
  return 'other'
}

function mapSeniority(careerLevel: string): Seniority {
  const l = careerLevel.toLowerCase()
  if (/senior|principal|director|specialist/.test(l)) return 'senior'
  if (/manager|lead|head|vp|vice.president/.test(l)) return 'lead'
  if (/junior|entry|internship|intern|fresh|graduate/.test(l)) return 'junior'
  return 'mid' // "Junior Executive" → mid for our purposes
}

function parseSalary(raw: string): { min?: number; max?: number } {
  if (!raw) return {}
  const nums = raw.replace(/,/g, '').match(/\d{3,6}/g)?.map(Number) ?? []
  if (nums.length === 0) return {}
  return { min: nums[0], max: nums[1] ?? nums[0] }
}

// Map Wobb skill categories to our ExtractedSkill category type
function categoriseSkill(name: string): string {
  const n = name.toLowerCase()
  if (/python|java|javascript|typescript|c\+\+|c#|php|ruby|go|swift|kotlin|rust|r\b/.test(n)) return 'programming-language'
  if (/react|angular|vue|node|django|spring|flutter|laravel|express/.test(n)) return 'framework-library'
  if (/aws|azure|gcp|docker|kubernetes|terraform|ci\/cd|devops|linux/.test(n)) return 'cloud-devops'
  if (/sql|excel|power.bi|tableau|data|analytics|machine.learning|ai/.test(n)) return 'data-analytics'
  if (/figma|photoshop|illustrator|design|ui|ux/.test(n)) return 'design'
  if (/management|leadership|agile|scrum|project/.test(n)) return 'management'
  if (/communication|teamwork|problem|critical|interpersonal/.test(n)) return 'soft-skill'
  return 'domain-knowledge'
}

// ── Wobb.my page types ────────────────────────────────────────────────────────
interface WobbSkill { name: string }
interface WobbCompany { name?: string; displayName?: string }
interface WobbJob {
  id: string
  title?: string
  stateRegion?: string
  location?: string
  salary?: string
  careerLevel?: string
  skills?: WobbSkill[]
  gptSummary?: string
  gptSummaryMs?: string
  activeAt?: string
  slug?: string
  company?: WobbCompany | string
  aggregatedCompanyName?: string
  minYearsExperience?: number
  maxYearsExperience?: number
}

interface WobbNextData {
  props?: {
    pageProps?: {
      jobs?: WobbJob[]
    }
  }
}

// ── Extraction ────────────────────────────────────────────────────────────────
function extractNextData(html: string): WobbNextData | null {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m?.[1]) return null
  try { return JSON.parse(m[1]) as WobbNextData } catch { return null }
}

function mapJob(raw: WobbJob): ScrapedJob | null {
  if (!raw.id || !raw.title) return null

  const description = (raw.gptSummary ?? raw.gptSummaryMs ?? '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
  if (description.length < 20) return null

  const companyName = typeof raw.company === 'string'
    ? raw.company
    : (raw.company?.displayName ?? raw.company?.name ?? raw.aggregatedCompanyName ?? 'Unknown')

  const location = [raw.stateRegion ?? '', raw.location ?? ''].join(' ').trim()

  const salary = parseSalary(raw.salary ?? '')

  const skills: ExtractedSkill[] = (raw.skills ?? []).map(s => ({
    name: s.name,
    category: categoriseSkill(s.name),
    confidence: 0.95,
    frequency: 1,
  }))

  const industryHint = `${raw.title} ${skills.map(s => s.name).join(' ')}`

  return {
    id: `wobb-${raw.id}`,
    title: raw.title,
    company: companyName,
    industry: mapIndustry(industryHint),
    city: mapCity(location),
    seniority: mapSeniority(raw.careerLevel ?? ''),
    rawDescription: description.slice(0, 3000),
    extractedSkills: skills,
    postedAt: raw.activeAt ? raw.activeAt.split('T')[0] : new Date().toISOString().split('T')[0],
    source: 'wobb',
    ...(salary.min !== undefined && { salaryMin: salary.min }),
    ...(salary.max !== undefined && { salaryMax: salary.max }),
  }
}

async function fetchPage(page: number): Promise<WobbJob[]> {
  const url = `${BASE_URL}/jobs?page=${page}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-MY,en;q=0.9',
    },
    signal: AbortSignal.timeout(25000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const nd = extractNextData(html)
  return nd?.props?.pageProps?.jobs ?? []
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const get = (flag: string, def: number) => {
    const i = args.indexOf(flag); return i !== -1 ? Math.max(1, parseInt(args[i + 1] ?? String(def), 10)) : def
  }
  const limit = get('--limit', 100)
  const maxPages = get('--pages', 5)

  console.log('🔍 SignalMap — Wobb.my Scraper (Malaysian Jobs)')
  console.log(`   Target : ≤${limit} postings from ≤${maxPages} pages`)
  console.log(`   Note   : Skills pre-extracted — no AI call needed\n`)

  const collected: ScrapedJob[] = []

  for (let page = 1; page <= maxPages && collected.length < limit; page++) {
    process.stdout.write(`📄 Page ${page}/${maxPages} ... `)
    try {
      const rawJobs = await fetchPage(page)
      const mapped = rawJobs
        .map(mapJob)
        .filter((j): j is ScrapedJob => j !== null)
      collected.push(...mapped)
      console.log(`${mapped.length} jobs (total: ${collected.length})`)
      if (rawJobs.length === 0) { console.log('   No more results.\n'); break }
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : String(err)}`)
    }
    await sleep(RATE_LIMIT_MS)
  }

  // Merge — dedupe against existing scraped-jobs.json
  const existing = fs.existsSync(OUTPUT_PATH)
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
    console.log('\n📝 Next: run extract + snapshot (or skip extract — skills already in file):')
    console.log('   echo "y" | npx tsx scripts/extract-skills.ts')
    console.log('   npx tsx scripts/save-snapshot.ts')
  }
}

main().catch(console.error)
