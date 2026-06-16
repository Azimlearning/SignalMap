# SignalMap — Product Requirements Document (PRD.md)
## Version 1.0 | Team Dang Wangi | Talentbank Tech Hackathon 2026

---

## 0. Quick Reference

| Item | Detail |
|---|---|
| Product | SignalMap — AI Talent Demand Intelligence |
| Hackathon | Talentbank Tech Hackathon 2026 |
| Build scope | Career OS + Challenge Modules |
| Prototype deadline | Tonight (June 15, 2026) |
| Full submission | July 1, 2026 |
| Stack | Next.js 14, TypeScript, Tailwind, Claude API, Recharts, Vercel |
| Live URL | TBD (deploy to Vercel ASAP) |

---

## 1. Problem Statement

Malaysia produces 300,000+ graduates annually. Over 48% are overqualified for the jobs they end up taking — not due to lack of talent, but lack of real-time market visibility. Graduates apply blindly. Employers post jobs without knowing if the talent supply exists. The result is a structural mismatch costing both sides time, money, and opportunity.

**SignalMap is the information layer that closes this gap.**

---

## 2. Solution Overview

SignalMap aggregates public Malaysian job posting data, uses Claude AI to extract structured skill demand signals, and surfaces that intelligence through three views:

1. **Demand Map** — which skills employers need right now, by industry + city
2. **Salary Intelligence** — what skill combinations pay, with real data
3. **Personal Fit Analyser** — candidate's skills vs current market demand → gap + next steps

---

## 3. Core Features

### P0 — Prototype (Ship tonight for Intent Form URL)

| ID | Feature | Description |
|---|---|---|
| FR-P0-01 | Seed data loader | Load 50 pre-curated Malaysian job postings from JSON |
| FR-P0-02 | Skills extraction | Claude parses each JD → extracts top skills + category |
| FR-P0-03 | Demand bar chart | Top 20 most-demanded skills, filterable by industry |
| FR-P0-04 | Industry filter | Filter dashboard by: Tech, Finance, Healthcare, Engineering, Other |
| FR-P0-05 | City filter | Filter by: KL, Selangor, Penang, Johor, Remote |
| FR-P0-06 | Trending panel | Shows top 5 skills growing fastest (computed from seed data delta) |
| FR-P0-07 | Fit analyser | Candidate types skills → Claude returns match score + top 3 missing skills |
| FR-P0-08 | Vercel deployment | Live URL accessible for Intent Form prototype field |

### P1 — Full Build (July 1 submission)

| ID | Feature | Description |
|---|---|---|
| FR-P1-01 | Real data pipeline | Scrape public job postings from JobStreet, MYFutureJobs every 24h |
| FR-P1-02 | Salary intelligence | Salary band extraction and display per skill cluster |
| FR-P1-03 | Demand heatmap | 2D heatmap: skills (y-axis) vs industries (x-axis) |
| FR-P1-04 | Trend line chart | 30-day demand trend per skill (rising/falling/stable) |
| FR-P1-05 | Skill adjacency map | "If you know X, also learn Y — it's 2x more demanded" |
| FR-P1-06 | Employer view | Companies see talent supply for their required skills |
| FR-P1-07 | Talentbank integration | "Top matching roles on Talentbank" from fit analysis |
| FR-P1-08 | Export report | Candidate downloads personalized market fit PDF |

---

## 4. TypeScript Data Model

```typescript
// lib/types/index.ts — ALL shared types live here

export interface JobPosting {
  id: string
  title: string
  company: string
  industry: Industry
  city: City
  salaryMin?: number
  salaryMax?: number
  seniority: 'junior' | 'mid' | 'senior' | 'lead'
  rawDescription: string
  extractedSkills?: ExtractedSkill[]
  postedAt: string // ISO date
  source: 'seed' | 'jobstreet' | 'myfuturejobs'
}

export interface ExtractedSkill {
  name: string           // normalized: "React.js"
  category: SkillCategory
  confidence: number     // 0-1, Claude's confidence in extraction
  frequency: number      // how often mentioned in this JD
}

export interface SkillDemand {
  skillName: string
  postingCount: number
  percentageOfTotal: number
  industries: Industry[]
  cities: City[]
  avgSalaryMin?: number
  avgSalaryMax?: number
  trend: 'rising' | 'stable' | 'falling'
  trendPercentage?: number
}

export interface CandidateAnalysis {
  inputSkills: string[]
  matchScore: number           // 0-100
  matchedSkills: string[]
  missingHighDemandSkills: MissingSkill[]
  recommendedRoles: RecommendedRole[]
  marketPositioning: string    // Claude's narrative summary
}

export interface MissingSkill {
  name: string
  demandRank: number           // rank in current market demand
  estimatedLearningWeeks: number
  resourceSuggestion: string
}

export interface RecommendedRole {
  title: string
  matchPercentage: number
  industry: Industry
  salaryRange: string
  topRequiredSkills: string[]
}

export type Industry =
  | 'technology'
  | 'finance'
  | 'healthcare'
  | 'engineering'
  | 'education'
  | 'retail'
  | 'manufacturing'
  | 'other'

export type City =
  | 'kuala-lumpur'
  | 'selangor'
  | 'penang'
  | 'johor'
  | 'remote'
  | 'other'

export type SkillCategory =
  | 'programming-language'
  | 'framework-library'
  | 'cloud-devops'
  | 'data-analytics'
  | 'design'
  | 'management'
  | 'soft-skill'
  | 'domain-knowledge'
  | 'certification'
  | 'tool'

export interface DashboardFilters {
  industry: Industry | 'all'
  city: City | 'all'
  seniority: JobPosting['seniority'] | 'all'
  timeWindow: '7d' | '30d' | '90d' | 'all'
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
  timestamp: string
}
```

---

## 5. API Routes

```
GET  /api/data/skills          → SkillDemand[]        (filtered by query params)
GET  /api/data/industries      → Industry stats        (posting counts per industry)
GET  /api/data/trending        → SkillDemand[]        (top trending skills)
POST /api/analyze              → CandidateAnalysis    (body: { skills: string[] })
```

### Query params for `/api/data/skills`:
```
?industry=technology&city=kuala-lumpur&seniority=junior&limit=20&sort=demand
```

---

## 6. Claude API Integration

### Extraction prompt (Agent A — JD → Skills)
```typescript
// lib/claude/extractor.ts
const EXTRACTION_PROMPT = `
You are a skill extraction specialist for Malaysian job market analysis.

Given this job description, extract all skills mentioned.
Return ONLY valid JSON matching this schema:
{
  "skills": [
    {
      "name": "string (normalized, e.g. 'React.js' not 'reactjs')",
      "category": "programming-language|framework-library|cloud-devops|data-analytics|design|management|soft-skill|domain-knowledge|certification|tool",
      "confidence": 0.0-1.0,
      "frequency": 1
    }
  ],
  "estimatedSalaryMin": number_or_null,
  "estimatedSalaryMax": number_or_null,
  "seniority": "junior|mid|senior|lead"
}

Job Description:
{JD_TEXT}
`
// Model: claude-sonnet-4-6 (fast, cheap for batch extraction)
// max_tokens: 800
```

### Analysis prompt (Agent C — Candidate Fit)
```typescript
// lib/claude/analyzer.ts
const ANALYSIS_PROMPT = `
You are a Malaysian job market career advisor.

Candidate skills: {CANDIDATE_SKILLS}
Current top 20 demanded skills in Malaysia: {MARKET_DEMAND_DATA}

Analyse the fit and return ONLY valid JSON:
{
  "matchScore": 0-100,
  "matchedSkills": ["skill1", "skill2"],
  "missingHighDemandSkills": [
    {
      "name": "string",
      "demandRank": number,
      "estimatedLearningWeeks": number,
      "resourceSuggestion": "string"
    }
  ],
  "recommendedRoles": [
    {
      "title": "string",
      "matchPercentage": number,
      "industry": "string",
      "salaryRange": "RM X,XXX - RM X,XXX",
      "topRequiredSkills": ["skill1", "skill2", "skill3"]
    }
  ],
  "marketPositioning": "2-3 sentence narrative summary"
}
`
// Model: claude-opus-4-8 (better reasoning for analysis)
// max_tokens: 1200
```

---

## 7. Seed Data Spec (P0 — 50 Job Postings)

Seed data must cover:
- 10 tech roles (software engineer, data scientist, cloud engineer, frontend dev, backend dev, DevOps, ML engineer, product manager, QA, cybersecurity)
- 10 finance roles (financial analyst, risk analyst, compliance, accounting, fintech developer, data analyst, investment, banking, insurance, auditor)
- 10 healthcare roles (nurse, doctor, pharmacist, medical officer, health IT, hospital admin, medical sales, lab technician, physiotherapist, dietitian)
- 10 engineering roles (civil, mechanical, electrical, chemical, oil & gas, process, structural, project engineer, quality engineer, maintenance)
- 10 other roles (marketing, HR, operations, logistics, retail manager, customer service, legal, sales, admin, teacher)

Each must have: title, company (generic), industry, city, salary range, seniority, raw description (100-200 words).

Location distribution: 30% KL, 25% Selangor, 15% Penang, 15% Johor, 15% Remote.

---

## 8. UI Component Spec

### Dashboard Layout (Agent B)
```
┌─────────────────────────────────────────────────────────┐
│ [SignalMap logo]  Malaysia Talent Demand Intelligence    │
├──────────────┬──────────────────────────────────────────┤
│ FILTERS      │ DEMAND MAP                               │
│ Industry: [▼]│ [SkillsBarChart — top 20 skills]         │
│ City:    [▼] │                                          │
│ Seniority[▼] ├──────────────────────────────────────────┤
│              │ TRENDING                                  │
│ [STATS]      │ ↑ Python +34%  ↑ Cloud +28%  ↓ Java -12%│
│ 847 postings │                                          │
│ 234 skills   ├──────────────────────────────────────────┤
│ 12 industries│ SALARY BANDS                             │
│              │ [SalaryBands component]                   │
└──────────────┴──────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ PERSONAL FIT ANALYSER                                   │
│ Enter your skills: [tag input field]                    │
│ [Analyse My Fit →]                                      │
│                                                         │
│ Match Score: [87/100]                                   │
│ You match: Python, SQL, Excel ...                       │
│ You're missing: AWS (rank #3), Tableau (rank #7)       │
│ Best fit roles: Data Analyst, Business Intelligence...  │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Judging Criteria Mapping

| Criterion | How SignalMap addresses it |
|---|---|
| **AI-native** | Claude API powers both skill extraction pipeline and candidate fit analysis — AI is the core, not a feature |
| **Solves real problem** | 48%+ Malaysian grad overqualification rate; employers can't see talent supply — validated by Malay Mail, KRI research |
| **Career OS fit** | Directly generates the talent graph data Talentbank needs — it's the intelligence layer, not a peripheral tool |
| **Adoptable in 4 weeks** | Clean Next.js app Talentbank can white-label; data pipeline connects to their existing job posting feed |
| **Technical quality** | TypeScript strict, tested API routes, clean component architecture, CI via Vercel preview deploys |

---

## 10. Open Source References

| Component | Source | What to take |
|---|---|---|
| JD parsing pipeline | github.com/karpathy/jobs | `parse_detail.py` → adapt to TS, `score.py` → Claude prompt pattern |
| Skill signal tracking | github.com/hiring-lab/ai-tracker | Methodology for tracking skill % of postings over time |
| Resume/skill matching | github.com/srbhr/Resume-Matcher | Matching logic, gap analysis approach |
| Dashboard viz | github.com/Suborno-Deb-Bappon/Data-Jobs-Dashboard | Chart types and KPI layout |
| AI interview UI | github.com/adrianhajdin/ai_mock_interviews | Session structure, data types for role/skills |

---

## 11. Non-Functional Requirements

| NFR | Requirement |
|---|---|
| Performance | Dashboard loads < 2s on Vercel edge |
| API latency | Fit analysis response < 8s (Claude API) |
| Data freshness | P0: seed data. P1: 24h refresh cycle |
| Accessibility | WCAG 2.1 AA for all interactive elements |
| Privacy | No personal data stored. Skills input is ephemeral. |
| Cost | Claude API costs < RM 50/month at 1000 analyses/day |

---

## 12. Open Questions

| ID | Question | Status |
|---|---|---|
| Q-01 | Can we access JobStreet's public job listing pages for P1? | Assumed yes — need to verify robots.txt |
| Q-02 | Does Talentbank provide a job posting API post-shortlist? | Ask at kickoff |
| Q-03 | Is Vercel free tier sufficient for the demo? | Assumed yes — Vercel hobby plan |
| Q-04 | Do we need auth for the prototype? | No — P0 is fully public |
