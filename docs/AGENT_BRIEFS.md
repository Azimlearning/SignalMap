# AGENT_A_DATA.md — Data Pipeline Agent

## You are: Agent A
## Your mission: Build the data pipeline that powers everything

---

## Your file ownership
```
lib/pipeline/loader.ts
lib/pipeline/transformer.ts
lib/pipeline/aggregator.ts
lib/claude/extractor.ts
lib/data/seed-jobs.json
lib/data/skills-taxonomy.json
lib/data/industry-map.json
scripts/extract-skills.ts
app/api/data/skills/route.ts
app/api/data/industries/route.ts
app/api/data/trending/route.ts
```

## You must NOT touch
Everything outside the above list. If you need a type changed, add it to the cross-agent dependency table in CHECKLIST.md.

## Dependencies (wait for these before starting)
- Agent D must complete D-01 through D-06 (core setup + types + Claude client)

## Your P0 build order
1. `A-01` — Create seed-jobs.json (50 Malaysian postings — see PRD §7 for required spread)
2. `A-02` + `A-03` — Create taxonomy and industry map JSON files
3. `A-04` — loader.ts (reads JSON, validates types)
4. `A-05` — transformer.ts (normalizes raw → JobPosting type)
5. `A-06` — extractor.ts (Claude prompt for JD → ExtractedSkill[], see PRD §6)
6. `A-07` — aggregator.ts (computes SkillDemand[] from all postings)
7. `A-08` + `A-09` — extract-skills script, run it, save output
8. `A-10` to `A-12` — the three API routes

## Key implementation notes

### seed-jobs.json format
```json
[
  {
    "id": "seed-001",
    "title": "Senior Software Engineer",
    "company": "Tech Company KL",
    "industry": "technology",
    "city": "kuala-lumpur",
    "salaryMin": 8000,
    "salaryMax": 12000,
    "seniority": "senior",
    "rawDescription": "We are looking for...",
    "postedAt": "2026-06-10T00:00:00Z",
    "source": "seed"
  }
]
```

### Claude extraction — use claude-sonnet-4-6 (cheap + fast for batch)
See PRD §6 for the exact prompt. Always request JSON output only.

### Aggregator logic
```typescript
// For each unique skill name across all postings:
// - count how many postings mention it (postingCount)
// - compute percentageOfTotal
// - group by industry and city
// - determine trend (for seed data: mark all as 'stable' — real trend needs historical data)
```

### API route pattern
```typescript
// app/api/data/skills/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const industry = searchParams.get('industry') || 'all'
  const city = searchParams.get('city') || 'all'
  const limit = parseInt(searchParams.get('limit') || '20')

  // load aggregated data, filter, sort, slice
  // return ApiResponse<SkillDemand[]>
}
```

---

# AGENT_B_DASHBOARD.md — Dashboard UI Agent

## You are: Agent B
## Your mission: Build the visual intelligence dashboard

---

## Your file ownership
```
components/dashboard/DemandMap.tsx
components/dashboard/FilterPanel.tsx
components/dashboard/TrendingSkills.tsx
components/dashboard/SalaryBands.tsx
components/charts/SkillsBarChart.tsx
components/charts/DemandHeatmap.tsx (P1)
components/charts/TrendLine.tsx (P1)
app/(dashboard)/page.tsx
app/(dashboard)/layout.tsx
store/dashboardStore.ts
```

## You must NOT touch
`lib/`, `app/api/`, `components/candidate/`, `components/ui/` (shadcn — Agent D owns those)

## Dependencies
- Agent D: D-01 through D-10 must be done
- Agent A: A-10 must be done (you'll call /api/data/skills)
- For P0 you can mock the API with static data while waiting for A

## Your P0 build order
1. `B-01` — Zustand store with filters + data state
2. `B-02` + `B-03` — Dashboard layout + page
3. `B-04` — FilterPanel (shadcn Select components)
4. `B-05` — SkillsBarChart (Recharts BarChart, horizontal, top 20 skills)
5. `B-06` — DemandMap (wraps chart, handles data fetching)
6. `B-07` — TrendingSkills (5 skill badges with trend indicator)
7. `B-08` — SalaryBands (grouped by category)
8. `B-09` — Wire everything together through Zustand
9. `B-10` + `B-11` — Loading skeletons + error states

## Key implementation notes

### Recharts BarChart pattern
```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// Data shape for chart:
const chartData = skillDemands.map(s => ({
  skill: s.skillName,
  count: s.postingCount,
  percentage: s.percentageOfTotal
}))

<ResponsiveContainer width="100%" height={400}>
  <BarChart data={chartData} layout="vertical">
    <XAxis type="number" />
    <YAxis dataKey="skill" type="category" width={150} />
    <Tooltip />
    <Bar dataKey="count" fill="#3730A3" radius={[0, 4, 4, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### Color palette (use these — brand consistent)
```
Primary: #3730A3 (indigo)
Accent: #0D9488 (teal)
Rising: #16A34A (green)
Falling: #DC2626 (red)
Stable: #64748B (slate)
Background: #F8FAFC
```

### Zustand store pattern
```typescript
import { create } from 'zustand'
import { DashboardFilters, SkillDemand } from '@/lib/types'

interface DashboardStore {
  filters: DashboardFilters
  skillDemands: SkillDemand[]
  isLoading: boolean
  error: string | null
  setFilter: (key: keyof DashboardFilters, value: string) => void
  fetchSkills: () => Promise<void>
}
```

---

# AGENT_C_CANDIDATE.md — Candidate Analyser Agent

## You are: Agent C
## Your mission: Build the personal fit analyser

---

## Your file ownership
```
components/candidate/FitAnalyser.tsx
components/candidate/SkillInput.tsx
components/candidate/FitScoreCard.tsx
lib/claude/analyzer.ts
lib/analyzer/gap.ts
app/api/analyze/route.ts
```

## You must NOT touch
`components/dashboard/`, `lib/pipeline/`, `app/api/data/`, `lib/claude/extractor.ts`

## Dependencies
- Agent D: D-01 through D-08 (core + shadcn)
- Agent A: A-10 (you need /api/data/skills for market context in analyzer)

## Your P0 build order
1. `C-01` — analyzer.ts (Claude prompt for fit analysis — see PRD §6)
2. `C-02` — gap.ts (compute overlap between candidate skills + top market skills)
3. `C-03` — app/api/analyze/route.ts (POST handler)
4. `C-04` — SkillInput.tsx (tag input — type skill, press Enter to add)
5. `C-05` — FitScoreCard.tsx (score circle + matched/missing skills display)
6. `C-06` — FitAnalyser.tsx (full panel composing input + score card)
7. `C-07` to `C-09` — Wire up + loading + error states

## Key implementation notes

### SkillInput — tag input pattern
```tsx
// User types "Python" → presses Enter → tag appears → can delete tags
// State: skills: string[]
// Output: pass skills[] to parent for API call
```

### Score display
```tsx
// Match score 0-100 shown as circular progress
// Color: 0-40 = red, 41-70 = amber, 71-100 = green
// Use shadcn Progress or custom SVG circle

// Below score: two columns
// ✅ Matched: [Python, SQL, Excel...]
// ❌ Missing (high demand): [AWS #3, Tableau #7, Power BI #9]
```

### API route pattern
```typescript
// POST /api/analyze
// Body: { skills: string[] }
// Returns: ApiResponse<CandidateAnalysis>
// - Fetch top 20 market skills from /api/data/skills
// - Pass candidate skills + market data to Claude analyzer
// - Return structured CandidateAnalysis
```

### Use claude-opus-4-8 for analysis (better reasoning)
See PRD §6 for exact prompt. Set max_tokens: 1200.

---

# AGENT_D_CORE.md — Core / Shared Agent

## You are: Agent D
## Your mission: Build the foundation everything else runs on — DO THIS FIRST

---

## Your file ownership
```
lib/types/index.ts
lib/config.ts
lib/utils.ts
lib/claude/client.ts
components/ui/ (all shadcn components)
app/layout.tsx
app/page.tsx
next.config.ts
tailwind.config.ts
tsconfig.json
package.json
.env.example
```

## You must NOT touch
`lib/pipeline/`, `lib/analyzer/`, `lib/claude/extractor.ts`, `lib/claude/analyzer.ts`,
`components/dashboard/`, `components/candidate/`, `app/api/`, `store/`

## YOU GO FIRST — All other agents wait for you

## Your P0 build order (must complete before others start)
1. `D-01` — Init Next.js 14: `npx create-next-app@latest signalmap --typescript --tailwind --app --eslint`
2. `D-02` — Install: `npm i recharts zustand @anthropic-ai/sdk clsx tailwind-merge`
3. `D-02b` — Install shadcn: `npx shadcn@latest init` then add: button, card, badge, select, input, skeleton, progress
4. `D-03` — Configure tailwind with brand colors (see CLAUDE.md §8)
5. `D-04` — Create lib/types/index.ts with ALL types from PRD §4 (copy verbatim)
6. `D-05` — Create lib/config.ts:
```typescript
export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}
```
7. `D-06` — Create lib/claude/client.ts:
```typescript
import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/lib/config'

export const claudeClient = new Anthropic({ apiKey: config.anthropicApiKey })
```
8. `D-07` — Create lib/utils.ts with: `cn()`, `formatSalary(min, max)`, `formatNumber(n)`
9. `D-08` — Verify shadcn components installed in components/ui/
10. `D-09` — Create app/layout.tsx (SignalMap branding, dark navy topbar, Inter font)
11. `D-10` — Create app/page.tsx (redirect to /dashboard or landing with hero)
12. `D-11` — Create .env.example:
```bash
ANTHROPIC_API_KEY=           # Required
NEXT_PUBLIC_APP_URL=         # Your Vercel URL
```
13. `D-12` — Push to GitHub → Connect to Vercel → Add env vars → Get preview URL

## Signal to other agents
When D-12 is done, add to CHECKLIST.md notes: "✅ Agent D P0 complete — all agents can start"
