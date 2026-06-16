/**
 * Batch skill extraction script — processes seed-jobs.json and scraped-jobs.json.
 * Usage: npx tsx scripts/extract-skills.ts
 *
 * Prompts for confirmation before processing seed jobs.
 * Scraped jobs (from fetch-jsearch / scrapers) are processed automatically.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'

// Load .env.local for local development
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

// Bootstrap path aliases for scripts (tsx handles tsconfig.json paths)
import type { JobPosting, ExtractedSkill } from '../lib/types/index'

const SEED_PATH = path.resolve(__dirname, '../lib/data/seed-jobs.json')
const SCRAPED_PATH = path.resolve(__dirname, '../lib/data/scraped-jobs.json')

const EXTRACTION_PROMPT = `You are a skill extraction specialist for Malaysian job market analysis.

Given this job description, extract all skills mentioned.
Return ONLY valid JSON — no markdown, no explanation:
{
  "skills": [
    {
      "name": "string (normalized, e.g. 'React.js' not 'reactjs')",
      "category": "programming-language|framework-library|cloud-devops|data-analytics|design|management|soft-skill|domain-knowledge|certification|tool",
      "confidence": 0.0,
      "frequency": 1
    }
  ]
}

Job Description:
{JD_TEXT}`

async function extractSkills(description: string): Promise<ExtractedSkill[]> {
  const { default: OpenAI } = await import('openai')
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in environment')

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: { 'HTTP-Referer': 'https://signalmap.vercel.app', 'X-Title': 'SignalMap' },
  })
  const userPrompt = EXTRACTION_PROMPT.replace('{JD_TEXT}', description)

  const completion = await client.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    max_tokens: 800,
    messages: [{ role: 'user', content: userPrompt }],
    response_format: { type: 'json_object' },
  })

  const text = completion.choices[0]?.message?.content ?? ''
  if (!text) throw new Error('No content in response')

  const parsed = JSON.parse(text) as { skills: ExtractedSkill[] }
  return parsed.skills.filter(s => s.name && s.confidence > 0)
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans) }))
}

async function processFile(filePath: string, requireConfirm: boolean): Promise<number> {
  if (!fs.existsSync(filePath)) return 0

  const jobs: JobPosting[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const needsExtraction = jobs.filter(j => !j.extractedSkills || j.extractedSkills.length === 0)

  if (needsExtraction.length === 0) {
    console.log(`   ✅ All ${jobs.length} jobs already have skills.`)
    return 0
  }

  console.log(`   ${needsExtraction.length} of ${jobs.length} jobs need extraction.`)

  if (requireConfirm) {
    const answer = await prompt('Extract skills using AI? (y/n) ')
    if (answer.toLowerCase() !== 'y') { console.log('   Skipped.'); return 0 }
  }

  let processed = 0
  for (const job of jobs) {
    if (job.extractedSkills && job.extractedSkills.length > 0) continue
    try {
      process.stdout.write(`   [${processed + 1}/${needsExtraction.length}] ${job.id}... `)
      job.extractedSkills = await extractSkills(job.rawDescription)
      console.log(`✓ ${job.extractedSkills.length} skills`)
      processed++
      await new Promise(r => setTimeout(r, 1000))
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(jobs, null, 2))
  return processed
}

async function main() {
  console.log('🔬 SignalMap — Skill Extraction\n')

  console.log('📁 seed-jobs.json')
  const seedCount = await processFile(SEED_PATH, true)

  console.log('\n📁 scraped-jobs.json')
  const scrapedCount = await processFile(SCRAPED_PATH, false)

  const total = seedCount + scrapedCount
  if (total > 0) {
    console.log(`\n✅ Done. Extracted skills for ${total} job(s).`)
  } else {
    console.log('\n✅ Nothing to process.')
  }
}

main().catch(console.error)
