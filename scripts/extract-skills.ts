/**
 * Batch skill extraction script — run once to process seed data with Claude API.
 * Usage: npx tsx scripts/extract-skills.ts
 *
 * For P0: seed-jobs.json already contains pre-extracted skills.
 * Run this script only to re-extract or process new postings without pre-populated skills.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'

// Bootstrap path aliases for scripts (tsx handles tsconfig.json paths)
import type { JobPosting, ExtractedSkill } from '../lib/types/index'

const SEED_PATH = path.resolve(__dirname, '../lib/data/seed-jobs.json')
const OUTPUT_PATH = path.resolve(__dirname, '../lib/data/seed-jobs.json')

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

async function main() {
  const raw = fs.readFileSync(SEED_PATH, 'utf-8')
  const jobs: JobPosting[] = JSON.parse(raw)

  const needsExtraction = jobs.filter(j => !j.extractedSkills || j.extractedSkills.length === 0)

  if (needsExtraction.length === 0) {
    console.log(`✅ All ${jobs.length} jobs already have extractedSkills. Nothing to do.`)
    return
  }

  console.log(`Found ${needsExtraction.length} jobs without extractedSkills.`)
  const answer = await prompt('Extract skills for these jobs using Claude API? (y/n) ')
  if (answer.toLowerCase() !== 'y') {
    console.log('Aborted.')
    return
  }

  let processed = 0
  for (const job of jobs) {
    if (job.extractedSkills && job.extractedSkills.length > 0) continue

    try {
      process.stdout.write(`[${processed + 1}/${needsExtraction.length}] ${job.id} — ${job.title}... `)
      job.extractedSkills = await extractSkills(job.rawDescription)
      console.log(`✓ ${job.extractedSkills.length} skills`)
      processed++
      // Rate limit: 1 request per second to be safe
      await new Promise(r => setTimeout(r, 1000))
    } catch (err) {
      console.log(`✗ Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(jobs, null, 2))
  console.log(`\n✅ Done. Processed ${processed} jobs. Saved to ${OUTPUT_PATH}`)
}

main().catch(console.error)
