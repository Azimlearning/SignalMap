# SignalMap — CHECKLIST.md
## Shared across all agents — update as you complete items

> **Rule:** Only mark your own agent's items. Never mark another agent's items done.
> **P0 = Intent Form prototype (DONE — needs Vercel deploy). P1 = July 1 submission.**

---

## 🟢 CURRENT BUILD STATE — READ THIS FIRST (June 15, 2026)

**All P0 code is complete.** `npx tsc --noEmit` → 0 errors. `npm run build` → success (9 routes).
The only remaining P0 items are **user actions** (deploy to Vercel, submit Intent Form).

### What exists right now

**App root:** `SignalMap/signalmap/` — run ALL npm/git commands from here.

**Live routes after build:**
```
GET  /                    → landing page (hero + CTAs to /dashboard)
GET  /dashboard           → main dashboard (skills chart, trending, salary, heatmap, trend lines, fit analyser)
GET  /api/data/skills     → SkillDemand[] filtered by industry/city/seniority/limit
GET  /api/data/industries → IndustryStat[] (posting counts per industry)
GET  /api/data/trending   → SkillDemand[] top 5 rising skills
POST /api/analyze         → CandidateAnalysis (body: { skills: string[] })
```

**Files created by each agent:**

| Agent | Files |
|---|---|
| **D** | `app/layout.tsx`, `app/page.tsx`, `lib/types/index.ts`, `lib/config.ts`, `lib/utils.ts`, `lib/claude/client.ts`, `components/ui/*` (button, card, badge, select, input, skeleton, progress), `next.config.ts`, `.env.example` |
| **A** | `lib/data/seed-jobs.json` (50 postings w/ extractedSkills pre-populated), `lib/data/skills-taxonomy.json`, `lib/data/industry-map.json`, `lib/pipeline/loader.ts`, `lib/pipeline/transformer.ts`, `lib/pipeline/aggregator.ts`, `lib/claude/extractor.ts`, `scripts/extract-skills.ts`, `app/api/data/skills/route.ts`, `app/api/data/industries/route.ts`, `app/api/data/trending/route.ts` |
| **B** | `store/dashboardStore.ts`, `components/dashboard/FilterPanel.tsx`, `components/dashboard/DemandMap.tsx`, `components/dashboard/TrendingSkills.tsx`, `components/dashboard/SalaryBands.tsx`, `components/charts/SkillsBarChart.tsx`, `components/charts/DemandHeatmap.tsx`, `components/charts/TrendLine.tsx`, `app/(dashboard)/layout.tsx`, `app/(dashboard)/dashboard/page.tsx` |
| **C** | `lib/claude/analyzer.ts`, `lib/analyzer/gap.ts`, `app/api/analyze/route.ts`, `components/candidate/SkillInput.tsx`, `components/candidate/FitScoreCard.tsx`, `components/candidate/FitAnalyser.tsx` |

### Critical stack differences from the PRD spec

The actual stack differs from PRD in ways that WILL break your code if you ignore them:

1. **Next.js 16.2.9** (spec said 14) — App Router works the same way
2. **Tailwind 4** — NO `tailwind.config.ts`. Brand colors are CSS custom properties registered in `globals.css`. Use them as utility classes:
   - `bg-brand-primary` / `text-brand-primary` → indigo `#3730A3`
   - `bg-brand-teal` / `text-brand-teal` → `#0D9488`
   - `text-brand-rising` → green `#16A34A`
   - `text-brand-falling` → red `#DC2626`
   - `text-brand-stable` → slate `#64748B`
   - `bg-brand-bg` → `#F8FAFC`
3. **shadcn v4 uses `@base-ui/react`** (NOT Radix UI). Key differences:
   - **No `asChild` prop** — use `buttonVariants()` applied directly to `<Link>` instead
   - `Select.Root` `onValueChange` returns `string | null` — always null-coalesce: `v => setFilter('industry', v ?? 'all')`
   - Import pattern: `import { Button, buttonVariants } from '@/components/ui/button'`
4. **Zustand v5** — use curried TypeScript form: `create<State>()((set, get) => ({...}))`
5. **Recharts v3.8.1** — API broadly compatible with v2. `layout="vertical"` on BarChart still works. `ResponsiveContainer` still works.
6. **All types** → import ONLY from `@/lib/types` — never duplicate or import from pipeline files
7. **Claude client** → import `claudeClient` from `@/lib/claude/client` — never instantiate Anthropic directly in feature code

### Dashboard page architecture

`app/(dashboard)/dashboard/page.tsx` is a `'use client'` component that:
- Calls `useDashboardStore(s => s.init)` in a `useEffect` on mount — this triggers all data fetches
- Layout: sidebar (`FilterPanel`) + main column (`DemandMap`, `TrendingSkills`/`SalaryBands` grid, `DemandHeatmap`/`TrendLine` grid, `FitAnalyser`)
- Responsive: stacked on mobile (`flex-col`), sidebar layout on `lg+` (`flex-row`)

The `FitAnalyser` (Agent C) is already wired into the dashboard page at the `#analyser` anchor.

---

## 🔴 P0 — Prototype

### Agent D — Core Setup
- [x] `D-01` Init Next.js 16 project with TypeScript strict mode
- [x] `D-02` Install deps: tailwindcss, shadcn/ui v4, recharts, zustand, @anthropic-ai/sdk, clsx, tailwind-merge
- [x] `D-03` Configure globals.css brand palette (Tailwind 4 CSS custom properties)
- [x] `D-04` Create `lib/types/index.ts` with ALL shared types from PRD §4
- [x] `D-05` Create `lib/config.ts` (env var access layer)
- [x] `D-06` Create `lib/claude/client.ts` (Anthropic SDK singleton)
- [x] `D-07` Create `lib/utils.ts` (cn(), formatSalary(), formatNumber())
- [x] `D-08` Install shadcn components: button, card, badge, select, input, skeleton, progress
- [x] `D-09` Create `app/layout.tsx` with SignalMap branding + dark indigo nav
- [x] `D-10` Create `app/page.tsx` (landing hero with CTAs to /dashboard)
- [x] `D-11` Create `.env.example` with all required keys documented
- [ ] `D-12` **USER ACTION:** Push repo to GitHub → connect to Vercel → add `ANTHROPIC_API_KEY` env var → get live preview URL

### Agent A — Data Pipeline ✅ COMPLETE
- [x] `A-01` `lib/data/seed-jobs.json` — 50 Malaysian job postings with pre-extracted `extractedSkills`
- [x] `A-02` `lib/data/skills-taxonomy.json` — normalized skill name map
- [x] `A-03` `lib/data/industry-map.json` — industry category definitions
- [x] `A-04` `lib/pipeline/loader.ts` — loads + validates seed JSON
- [x] `A-05` `lib/pipeline/transformer.ts` — normalizes raw → JobPosting type
- [x] `A-06` `lib/claude/extractor.ts` — Claude JD → ExtractedSkill[]
- [x] `A-07` `lib/pipeline/aggregator.ts` — computes SkillDemand[], IndustryStat[], trending
- [x] `A-08` `scripts/extract-skills.ts` — batch script (skills already in seed-jobs.json for P0)
- [x] `A-09` Seed data pre-populated with extractedSkills — no API call needed for P0
- [x] `A-10` `app/api/data/skills/route.ts` — GET ?industry=&city=&seniority=&limit=&sort=
- [x] `A-11` `app/api/data/industries/route.ts` — GET → IndustryStat[]
- [x] `A-12` `app/api/data/trending/route.ts` — GET ?limit= → SkillDemand[] (rising only, sorted by trendPercentage)

### Agent B — Dashboard UI ✅ COMPLETE
- [x] `B-01` `store/dashboardStore.ts` — Zustand store: filters, skillDemands, trendingSkills, totalPostings, lastFetched, isLoading, error, setFilter/fetchSkills/fetchTrending/init
- [x] `B-02` `app/(dashboard)/layout.tsx` — passthrough layout for (dashboard) route group
- [x] `B-03` `app/(dashboard)/dashboard/page.tsx` — `/dashboard` route, init on mount, composes all panels
- [x] `B-04` `components/dashboard/FilterPanel.tsx` — 3 base-ui Selects (industry/city/seniority), dataset stats, legend
- [x] `B-05` `components/charts/SkillsBarChart.tsx` — horizontal Recharts BarChart, Cell-coloured by trend (green/indigo/red)
- [x] `B-06` `components/dashboard/DemandMap.tsx` — wraps chart, loading skeleton, empty + error states, active filter count badge
- [x] `B-07` `components/dashboard/TrendingSkills.tsx` — top 5 rising skills as coloured badge pills with ↑/↓ icons + %
- [x] `B-08` `components/dashboard/SalaryBands.tsx` — top 8 skills with salary data, shows RM range from avgSalaryMin/Max
- [x] `B-09` FilterPanel → setFilter → fetchSkills (auto-triggered) → chart re-renders
- [x] `B-10` Loading skeletons on all panels
- [x] `B-11` Error states on all panels

### Agent C — Candidate Fit Analyser ✅ COMPLETE
- [x] `C-01` `lib/claude/analyzer.ts` — claude-opus-4-8, max_tokens 1200, regex JSON fallback
- [x] `C-02` `lib/analyzer/gap.ts` — local fuzzy skill gap computation
- [x] `C-03` `app/api/analyze/route.ts` — POST { skills: string[] } → CandidateAnalysis (imports aggregator directly, no HTTP roundtrip)
- [x] `C-04` `components/candidate/SkillInput.tsx` — tag input, Enter/comma/backspace
- [x] `C-05` `components/candidate/FitScoreCard.tsx` — SVG score ring, matched/missing columns, role cards
- [x] `C-06` `components/candidate/FitAnalyser.tsx` — orchestrates all, wired into dashboard page
- [x] `C-07` SkillInput → POST /api/analyze → FitScoreCard render
- [x] `C-08` Loading skeleton + "Analysing market fit…" state
- [x] `C-09` Error state for API failures

### All Agents — P0 Complete Gate
- [x] `ALL-01` `npx tsc --noEmit` → 0 errors ✅
- [x] `ALL-02` `npm run build` → success (9 routes: `/`, `/dashboard`, 4 API routes, `/_not-found`) ✅
- [ ] `ALL-03` **USER ACTION:** Deploy to Vercel → get live URL
- [ ] `ALL-04` **USER ACTION:** Add prototype URL to Intent Form
- [ ] `ALL-05` **USER ACTION:** Submit Intent Form ✅

---

## 🟡 P1 — Full Build (July 1 deadline)

### Agent A — Real Data Pipeline
- [x] `A-P1-01` Create `scripts/scrape-jobstreet.ts` — public job listing scraper (respect robots.txt, 1 req/sec)
- [x] `A-P1-02` Create `scripts/scrape-myfuturejobs.ts` — government portal scraper (REST API + HTML fallback)
- [x] `A-P1-03` Implement 24h refresh pipeline — `vercel.json` cron + `app/api/pipeline/refresh/route.ts` + `.github/workflows/pipeline.yml`
- [x] `A-P1-04` Add salary extraction to Claude prompt + parser — `extractJobDataFromJD()` in `lib/claude/extractor.ts`
- [x] `A-P1-05` Add 30-day historical trending data — `lib/pipeline/history.ts` + `scripts/save-snapshot.ts`; API routes enriched with `enrichWithHistoricalTrends()`

### Agent B — Enhanced Visualizations
- [x] `B-P1-01` `components/charts/DemandHeatmap.tsx` — skills × 5 industries CSS grid heatmap. Makes parallel fetch calls to `/api/data/skills?industry=X` for each industry, builds count matrix, colour scale from indigo-50 → indigo-700
- [x] `B-P1-02` `components/charts/TrendLine.tsx` — 30-day sparklines using Recharts LineChart. Synthetic data generated from `trendPercentage` signal (smoothstep interpolation + noise). Renders top 6 skills with trend data
- [ ] `B-P1-03` Skill adjacency view ("if you know X, also learn Y") — **BLOCKED on A-P1-05** (needs historical/adjacency data from Agent A)
- [x] `B-P1-04` Responsive mobile layout — `flex-col` stacked on mobile, `lg:flex-row` sidebar on desktop. Breakpoint: `lg` (1024px)
- [x] `B-P1-05` Data freshness indicator — `lastFetched: Date | null` in Zustand store, set on each `fetchSkills`. Displayed in page header as "Last updated HH:MM · Seed data · June 2026"

### Agent C — Enhanced Analysis
- [x] `C-P1-01` Add "Top matching Talentbank roles" panel to FitAnalyser — branded Talentbank section in `FitScoreCard.tsx` with "Search on Graduan" links
- [ ] `C-P1-02` Create PDF export of candidate market fit report
- [ ] `C-P1-03` Add employer view — "talent supply for your required skills"
- [ ] `C-P1-04` Add skill adjacency recommendations in analysis output — **BLOCKED on A-P1-05**

### All Agents — P1 Complete Gate
- [ ] `ALL-P1-01` All TypeScript errors cleared
- [ ] `ALL-P1-02` All Recharts components responsive on mobile
- [ ] `ALL-P1-03` Claude API costs estimated and documented
- [ ] `ALL-P1-04` Vercel production deploy with custom domain (if available)
- [ ] `ALL-P1-05` Project video recorded
- [ ] `ALL-P1-06` Project description form submitted on techhackathon.com

---

## 🔗 Cross-Agent Dependencies

| Requesting Agent | Needs | From Agent | Status |
|---|---|---|---|
| B | `SkillDemand[]` type | D | ✅ `lib/types/index.ts` |
| B | `/api/data/skills` endpoint | A | ✅ resolved |
| B | Adjacency/historical data for B-P1-03 | A | ⏳ blocked on A-P1-05 |
| C | `/api/data/skills` for market context | A | ✅ resolved — analyzer imports aggregator directly |
| C | `CandidateAnalysis` type | D | ✅ `lib/types/index.ts` |
| C | Adjacency data for C-P1-04 | A | ⏳ blocked on A-P1-05 |

---

## 📝 Notes & Decisions Log

- `[2026-06-15]` Project initialized — Next.js app lives at `SignalMap/signalmap/` (run all commands from here)
- `[2026-06-15]` **Agent D ✅ P0 complete (D-01–D-11).** D-12 pending user action (Vercel + env var).
  - shadcn v4 uses `@base-ui/react` — no `asChild`, no Radix primitives. Use `buttonVariants()` on `<Link>`.
  - Tailwind 4: no config file, brand colors via CSS custom properties in `globals.css`.
- `[2026-06-15]` **Agent A ✅ P0 complete (A-01–A-12).** Seed data has `extractedSkills` pre-populated (no Claude call needed at runtime for P0). `computeSkillDemand` filters by industry/city/seniority. `IndustryStat` type lives in `lib/pipeline/aggregator.ts` (not in `lib/types`) — do not import it in dashboard/candidate code; use inline type if needed.
- `[2026-06-15]` **Agent C ✅ P0 complete (C-01–C-09).** `POST /api/analyze` imports aggregator directly (no HTTP roundtrip). Uses `claude-opus-4-8` with regex JSON fallback for safety. FitAnalyser already wired into dashboard page by Agent C (they edited `app/(dashboard)/dashboard/page.tsx`).
- `[2026-06-15]` **Agent B ✅ P0 + P1 mostly complete (B-01–B-11, B-P1-01/02/04/05).** Dashboard at `/dashboard`. DemandHeatmap and TrendLine added and wired into dashboard. B-P1-03 (adjacency) blocked on Agent A.
  - `Select.onValueChange` returns `string | null` in base-ui — always null-coalesce to a default.
  - Dashboard route is at `app/(dashboard)/dashboard/page.tsx` (NOT `app/(dashboard)/page.tsx`) to avoid conflict with `app/page.tsx`.
  - `tsc --noEmit` → 0 errors; `npm run build` → success as of last session.

### What a fresh agent should do next

**If you are Agent A (next):**
A-P1-01 through A-P1-05 are COMPLETE. No more A-P1 tasks.

**If you are Agent B (next):**
A-P1-05 is now done — historical data is in `lib/pipeline/history.ts`. Build B-P1-03 (`components/charts/SkillAdjacency.tsx`) using the historical snapshot data from `lib/data/history/*.json`.

**If you are Agent C (next):**
C-P1-01 is done. Start C-P1-02 (PDF export — `react-pdf` or `jsPDF`), then C-P1-03 (employer view). C-P1-04 now unblocked by A-P1-05.

**If you are any agent:**
Before writing any code: `cd SignalMap/signalmap && npx tsc --noEmit` to verify zero errors. Then check gates: `npx tsc --noEmit && npm run build`.

- `[2026-06-15]` **A-P1-01 through A-P1-05 ✅ complete.**
  - `scripts/scrape-jobstreet.ts` — checks robots.txt, extracts `__NEXT_DATA__` JSON, maps to JobPosting, appends to `lib/data/scraped-jobs.json`.
  - `scripts/scrape-myfuturejobs.ts` — tries REST API first (`/api/vacancy/search`), falls back to HTML parsing.
  - `vercel.json` — cron at `0 2 * * *` (02:00 UTC = 10:00 MYT) calling `/api/pipeline/refresh`.
  - `.github/workflows/pipeline.yml` — daily GitHub Actions: scrape → extract → snapshot → commit → Vercel auto-deploys.
  - `lib/claude/extractor.ts` — added `extractJobDataFromJD()` returning skills + salary + seniority.
  - `lib/pipeline/history.ts` — `saveSnapshot()`, `loadSnapshot()`, `enrichWithHistoricalTrends()`. Real trends override SEED_TREND_MAP when ≥7 days of history exists.
  - `scripts/save-snapshot.ts` — writes daily `lib/data/history/YYYY-MM-DD.json`.
  - `lib/pipeline/loader.ts` — added `loadScrapedJobs()` + `loadAllJobs()`.
  - All 3 data API routes updated to `loadAllJobs()` + `enrichWithHistoricalTrends()`.
  - `lib/data/scraped-jobs.json` — created as empty `[]` placeholder (filled by scraper).
  - `npm run pipeline` = scrape + extract + snapshot in one command.
  - `npx tsc --noEmit` → 0 errors. `npm run build` → clean (10 routes).
- `[2026-06-15]` **C-P1-01 ✅ complete.**
  - `components/candidate/FitScoreCard.tsx` — added Talentbank integration panel below recommended roles. Each role links to `https://www.graduan.com/job?keyword={role}` (Graduan by Talentbank). Branded with brand-primary color scheme.
