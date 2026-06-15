import type { ExtractedSkill, SkillCategory } from '@/lib/types'
import { claudeClient, AI_MODELS } from '@/lib/claude/client'

const EXTRACTION_PROMPT = `You are a skill extraction specialist for Malaysian job market analysis.

Given this job description, extract all skills mentioned.
Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "skills": [
    {
      "name": "string (normalized, e.g. 'React.js' not 'reactjs')",
      "category": "programming-language|framework-library|cloud-devops|data-analytics|design|management|soft-skill|domain-knowledge|certification|tool",
      "confidence": 0.0,
      "frequency": 1
    }
  ],
  "estimatedSalaryMin": null,
  "estimatedSalaryMax": null,
  "seniority": "junior|mid|senior|lead"
}

For salary: if a salary range is mentioned (e.g. "RM 5,000 - RM 8,000" or "5k-8k MYR"), extract the monthly figures as integers. Otherwise return null.
For seniority: infer from job title and requirements if not explicit.

Job Description:
{JD_TEXT}`

const VALID_CATEGORIES = new Set<string>([
  'programming-language', 'framework-library', 'cloud-devops',
  'data-analytics', 'design', 'management', 'soft-skill',
  'domain-knowledge', 'certification', 'tool',
])

const VALID_SENIORITIES = new Set<string>(['junior', 'mid', 'senior', 'lead'])

interface ExtractionResult {
  skills: Array<{
    name: string
    category: string
    confidence: number
    frequency: number
  }>
  estimatedSalaryMin: number | null
  estimatedSalaryMax: number | null
  seniority: string
}

function parseAndValidateSkills(parsed: ExtractionResult): ExtractedSkill[] {
  return parsed.skills
    .filter(s => s.name && VALID_CATEGORIES.has(s.category) && s.confidence > 0)
    .map(s => ({
      name: s.name,
      category: s.category as SkillCategory,
      confidence: Math.min(1, Math.max(0, s.confidence)),
      frequency: Math.max(1, s.frequency),
    }))
}

async function callExtractor(rawDescription: string): Promise<ExtractionResult> {
  const userPrompt = EXTRACTION_PROMPT.replace('{JD_TEXT}', rawDescription)
  const completion = await claudeClient.chat.completions.create({
    model: AI_MODELS.extraction,
    max_tokens: 900,
    messages: [{ role: 'user', content: userPrompt }],
    response_format: { type: 'json_object' },
  })
  const text = completion.choices[0]?.message?.content ?? ''
  if (!text) throw new Error('No content in AI response')
  return JSON.parse(text) as ExtractionResult
}

// Extracts only skills — kept for backward compatibility with extract-skills.ts
export async function extractSkillsFromJD(rawDescription: string): Promise<ExtractedSkill[]> {
  return parseAndValidateSkills(await callExtractor(rawDescription))
}

export interface JobExtractionResult {
  skills: ExtractedSkill[]
  estimatedSalaryMin?: number
  estimatedSalaryMax?: number
  detectedSeniority?: 'junior' | 'mid' | 'senior' | 'lead'
}

// Extracts skills + salary + seniority from a raw JD (A-P1-04)
export async function extractJobDataFromJD(rawDescription: string): Promise<JobExtractionResult> {
  const parsed = await callExtractor(rawDescription)
  return {
    skills: parseAndValidateSkills(parsed),
    estimatedSalaryMin: typeof parsed.estimatedSalaryMin === 'number' ? parsed.estimatedSalaryMin : undefined,
    estimatedSalaryMax: typeof parsed.estimatedSalaryMax === 'number' ? parsed.estimatedSalaryMax : undefined,
    detectedSeniority: VALID_SENIORITIES.has(parsed.seniority)
      ? (parsed.seniority as 'junior' | 'mid' | 'senior' | 'lead')
      : undefined,
  }
}
