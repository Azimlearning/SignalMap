import type { Industry, City } from '@/lib/types'

// Shared normalization helpers for all job sources (scrapers + API fetchers).
// Scripts import these via relative path since tsconfig @/ aliases aren't
// guaranteed to resolve in standalone tsx contexts.

const INDUSTRY_PATTERNS: Array<[RegExp, Industry]> = [
  [/\b(tech|software|it\b|digital|cloud|data|cyber|developer|programming|ai|machine.learning)\b/i, 'technology'],
  [/\b(financ|bank|account|audit|invest|insurance|trading|economic|fintech)\b/i, 'finance'],
  [/\b(health|hospital|medical|pharma|clinic|nurse|doctor|patient|healthcare)\b/i, 'healthcare'],
  [/\b(civil|mechanical|electrical|chemical|oil|gas|structural|process|petrochemical)\b/i, 'engineering'],
  [/\b(teach|school|university|education|tutor|academic|lectur|training)\b/i, 'education'],
  [/\b(retail|shop|store|ecomm|fmcg|consumer)\b/i, 'retail'],
  [/\b(manufactur|factory|production|assembly|quality|plant)\b/i, 'manufacturing'],
]

export function mapIndustry(text: string): Industry {
  for (const [pattern, industry] of INDUSTRY_PATTERNS) {
    if (pattern.test(text)) return industry
  }
  return 'other'
}

const CITY_PATTERNS: Array<[RegExp, City]> = [
  [/kuala.lumpur|kl\b|klcc|mont.kiara|bangsar|petaling.jaya|pj\b|wilayah.persekutuan/i, 'kuala-lumpur'],
  [/selangor|shah.alam|subang|puchong|klang|ampang|sepang|cyberjaya|putrajaya/i, 'selangor'],
  [/penang|pulau.pinang|george.?town|bayan.lepas|butterworth|kulim/i, 'penang'],
  [/johor|jb\b|iskandar|skudai|senai|tampoi/i, 'johor'],
  [/remote|work.from.home|\bwfh\b|hybrid/i, 'remote'],
]

export function mapCity(location: string): City {
  for (const [pattern, city] of CITY_PATTERNS) {
    if (pattern.test(location)) return city
  }
  return 'other'
}

export function inferSeniority(title: string): 'junior' | 'mid' | 'senior' | 'lead' {
  const t = title.toLowerCase()
  if (/\b(senior|sr\.?\s|lead\b|principal|head.of|chief|director)\b/.test(t)) return 'senior'
  if (/\b(manager|vp\b|vice.president|associate.director)\b/.test(t)) return 'lead'
  if (/\b(junior|jr\.?\s|entry.level|graduate|fresh|intern)\b/.test(t)) return 'junior'
  return 'mid'
}

export function parseSalaryNums(min: unknown, max: unknown): { min?: number; max?: number } {
  const toNum = (v: unknown): number => {
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const n = parseFloat(v.replace(/[^0-9.]/g, ''))
      return isNaN(n) ? NaN : n
    }
    return NaN
  }
  const lo = toNum(min)
  const hi = toNum(max)
  return {
    min: isNaN(lo) ? undefined : Math.round(lo),
    max: isNaN(hi) ? undefined : Math.round(hi),
  }
}
