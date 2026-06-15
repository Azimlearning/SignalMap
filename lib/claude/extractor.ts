import type { ExtractedSkill, SkillCategory } from '@/lib/types'
import { claudeClient } from '@/lib/claude/client'

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

Job Description:
{JD_TEXT}`

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

export async function extractSkillsFromJD(rawDescription: string): Promise<ExtractedSkill[]> {
  const prompt = EXTRACTION_PROMPT.replace('{JD_TEXT}', rawDescription)

  const message = await claudeClient.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const textContent = message.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  const parsed: ExtractionResult = JSON.parse(textContent.text)

  const validCategories = new Set<string>([
    'programming-language', 'framework-library', 'cloud-devops',
    'data-analytics', 'design', 'management', 'soft-skill',
    'domain-knowledge', 'certification', 'tool',
  ])

  return parsed.skills
    .filter(s => s.name && validCategories.has(s.category) && s.confidence > 0)
    .map(s => ({
      name: s.name,
      category: s.category as SkillCategory,
      confidence: Math.min(1, Math.max(0, s.confidence)),
      frequency: Math.max(1, s.frequency),
    }))
}
