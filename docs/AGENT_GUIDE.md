# SignalMap — CLAUDE.md
## Operating Brief for all agents

> **Project:** SignalMap — AI-powered talent demand intelligence for Career OS
> **Team:** Dang Wangi | **Hackathon:** Talentbank Tech Hackathon 2026
> **Stack:** Next.js 14 + TypeScript + Tailwind + Claude API + Recharts + Vercel
> **Last updated:** June 15, 2026

---

## 1. What is SignalMap

SignalMap is a real-time talent demand intelligence platform that:
1. Ingests public Malaysian job posting data
2. Uses Claude API to extract structured skills, salary bands, and role categories from raw JDs
3. Surfaces that intelligence as an interactive demand dashboard
4. Lets candidates analyse their personal skill fit against real market demand

It is a **Career OS module** for the Talentbank Tech Hackathon 2026 — the intelligence data layer that powers the talent graph.

---

## 2. The Eight Hard Invariants

These cannot be broken by any agent under any circumstances:

1. **Data-first** — every insight shown to the user has a data source. No hallucinated stats.
2. **Claude for extraction only** — Claude API is used for JD parsing and fit analysis, not for generating fake data.
3. **TypeScript strict mode** — all files are `.ts` or `.tsx`. No `any` types.
4. **Shared types are authoritative** — all agents import from `lib/types/index.ts`. No duplicate type definitions.
5. **No agent touches another agent's files** — file ownership is sacred (see Section 5).
6. **API routes are thin** — business logic lives in `lib/`, not in `app/api/`.
7. **No secrets in code** — all API keys via `.env.local`, accessed through `lib/config.ts` only.
8. **Ship P0 first** — prototype on Vercel before building any P1 features.

---

## 3. Tech Stack Details

### Frontend
```
Next.js 14 (App Router)
TypeScript 5 (strict mode)
Tailwind CSS 3
shadcn/ui (components from @/components/ui/)
Recharts (all data visualizations)
Zustand (lightweight global state)
```

### AI / Data
```
Claude API — claude-sonnet-4-6 (fast extraction)
           — claude-opus-4-8 (deep analysis, used sparingly)
Anthropic SDK (@anthropic-ai/sdk)
```

### Infrastructure
```
Vercel (deployment — zero config with Next.js)
No database for prototype — structured JSON in lib/data/
```

### Key dependencies
```json
{
  "@anthropic-ai/sdk": "latest",
  "recharts": "^2.x",
  "zustand": "^4.x",
  "@radix-ui/react-*": "latest (via shadcn)",
  "clsx": "latest",
  "tailwind-merge": "latest"
}
```

---

## 4. Project File Structure

```
signalmap/
├── app/
│   ├── layout.tsx                    [Agent D]
│   ├── page.tsx                      [Agent D]
│   ├── (dashboard)/
│   │   ├── page.tsx                  [Agent B]
│   │   └── layout.tsx                [Agent B]
│   └── api/
│       ├── data/
│       │   ├── skills/route.ts       [Agent A]
│       │   ├── industries/route.ts   [Agent A]
│       │   └── trending/route.ts     [Agent A]
│       └── analyze/
│           └── route.ts              [Agent C]
├── components/
│   ├── ui/                           [Agent D — shadcn components]
│   ├── dashboard/
│   │   ├── DemandMap.tsx             [Agent B]
│   │   ├── FilterPanel.tsx           [Agent B]
│   │   ├── TrendingSkills.tsx        [Agent B]
│   │   └── SalaryBands.tsx           [Agent B]
│   ├── charts/
│   │   ├── SkillsBarChart.tsx        [Agent B]
│   │   ├── DemandHeatmap.tsx         [Agent B]
│   │   └── TrendLine.tsx             [Agent B]
│   └── candidate/
│       ├── FitAnalyser.tsx           [Agent C]
│       ├── SkillInput.tsx            [Agent C]
│       └── FitScoreCard.tsx          [Agent C]
├── lib/
│   ├── types/
│   │   └── index.ts                  [Agent D — ALL shared types]
│   ├── config.ts                     [Agent D — env vars]
│   ├── utils.ts                      [Agent D — shared utilities]
│   ├── claude/
│   │   ├── client.ts                 [Agent D — Anthropic SDK client]
│   │   ├── extractor.ts              [Agent A — JD → structured skills]
│   │   └── analyzer.ts               [Agent C — candidate fit analysis]
│   ├── pipeline/
│   │   ├── loader.ts                 [Agent A — load seed/real data]
│   │   ├── transformer.ts            [Agent A — normalize job postings]
│   │   └── aggregator.ts             [Agent A — compute demand signals]
│   ├── analyzer/
│   │   └── gap.ts                    [Agent C — skill gap computation]
│   └── data/
│       ├── seed-jobs.json            [Agent A — 50 Malaysian job postings]
│       ├── skills-taxonomy.json      [Agent A — normalized skill names]
│       └── industry-map.json         [Agent A — industry categories]
├── scripts/
│   └── extract-skills.ts             [Agent A — run to process seed data]
├── store/
│   └── dashboardStore.ts             [Agent B — Zustand store]
├── .env.local                        [NEVER COMMIT]
├── .env.example                      [commit this]
├── next.config.ts                    [Agent D]
├── tailwind.config.ts                [Agent D]
├── tsconfig.json                     [Agent D]
└── package.json                      [Agent D]
```

---

## 5. Agent File Ownership

| Agent | Owns | Must NOT touch |
|---|---|---|
| **A (Data)** | `lib/pipeline/`, `lib/data/`, `lib/claude/extractor.ts`, `scripts/`, `app/api/data/` | Everything else |
| **B (Dashboard)** | `components/dashboard/`, `components/charts/`, `app/(dashboard)/`, `store/` | `lib/`, `components/candidate/`, `app/api/` |
| **C (Candidate)** | `components/candidate/`, `lib/analyzer/`, `lib/claude/analyzer.ts`, `app/api/analyze/` | `components/dashboard/`, `lib/pipeline/`, `app/api/data/` |
| **D (Core)** | `lib/types/`, `lib/config.ts`, `lib/utils.ts`, `lib/claude/client.ts`, `components/ui/`, `app/layout.tsx`, `app/page.tsx`, all config files | `lib/pipeline/`, `lib/analyzer/`, `components/dashboard/`, `components/candidate/` |

**Coordination rule:** If you need something from another agent's domain, add it to CHECKLIST.md under "Cross-agent dependencies" and wait. Do not reach into another agent's files.

---

## 6. Environment Variables

```bash
# lib/config.ts reads these — never use process.env directly in feature code

ANTHROPIC_API_KEY=           # Required — Anthropic console
NEXT_PUBLIC_APP_URL=         # Required — your Vercel URL
```

---

## 7. Claude API Usage Rules

- Use `claude-sonnet-4-6` for: batch skill extraction, simple analysis
- Use `claude-opus-4-8` for: deep fit analysis, complex reasoning (sparingly — costs more)
- Always set `max_tokens` explicitly
- Always handle API errors gracefully — never crash the UI on API failure
- For P0 prototype: you may use pre-extracted seed data to avoid API costs during development

```typescript
// Correct pattern — always go through lib/claude/client.ts
import { claudeClient } from '@/lib/claude/client'

// Never do this in feature code:
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic() // ← WRONG
```

---

## 8. Open Source Reference Repos

Before building anything, check if an open-source repo already has the component:

| Component | Reference |
|---|---|
| JD extraction pipeline | github.com/karpathy/jobs — `parse_detail.py`, `score.py` |
| Skills demand tracking | github.com/hiring-lab/ai-tracker |
| Resume/skills matching | github.com/srbhr/Resume-Matcher |
| Mock interview UI | github.com/adrianhajdin/ai_mock_interviews |
| Job market dashboard | github.com/Suborno-Deb-Bappon/Data-Jobs-Dashboard |

Semi-fork aggressively. Adapt to TypeScript + Next.js + Claude API.

---

## 9. Data Sources (Public, Permissible)

For P0 prototype — use seed JSON in `lib/data/seed-jobs.json` (50 manually curated Malaysian job postings).

For P1 real data pipeline:
- **JobStreet Malaysia** — public job listing pages (respect robots.txt, rate limit to 1 req/sec)
- **LinkedIn public postings** — visible without auth
- **MYFutureJobs** — Malaysian government job portal, public data

All scraping must respect robots.txt and rate limits. Never store personal data. Only extract: job title, company industry, location, skills mentioned, salary range (if stated), seniority level.

---

## 10. Coding Standards

```typescript
// ✅ Always use named exports
export function computeSkillDemand(...) {}

// ✅ Always type function returns
export function getTopSkills(data: JobPosting[]): SkillDemand[] {}

// ✅ Always handle loading + error states in components
if (isLoading) return <SkeletonCard />
if (error) return <ErrorState message={error.message} />

// ❌ Never use any
const data: any = ... // BANNED

// ❌ Never hardcode API keys
const apiKey = "sk-ant-..." // BANNED — use lib/config.ts
```
