# SignalMap — Prototype → Judged MVP Implementation Plan

**Author:** Team Dang Wangi (Fakhrul Azim)
**Created:** 2026-06-16
**Target submission:** 2026-07-01 (Talentbank Tech Hackathon 2026)
**Effort budget:** Lean — ~2–3 focused build days (critical path), with clearly-marked stretch tier
**Status:** Draft for execution

---

## 1. Goal of this plan

Take the current deployed prototype (https://signal-map-silk.vercel.app/) and close the three gaps most likely to lose us points with judges:

1. **The AI feature is broken** — the Fit Analyser crashes on every request.
2. **The data is hardcoded** — 100% of the dashboard runs off a static 50-row `seed-jobs.json`; `scraped-jobs.json` is empty. Trends are simulated.
3. **Module coverage is implied, not shown** — the five Career OS modules aren't visibly demonstrated to a judge.

This plan fixes all three at *proof-of-concept depth* — not production. The bar is: **a judge can click through and see real Malaysian job data flowing into working AI, with each module visibly represented.**

### Design decisions locked for this plan
- **Data source:** Real jobs **API primary + one working scraper** (the "Both" option).
- **Scope:** **Hybrid** module coverage — build 1–2 new module screens, map the rest in the pitch.
- **AI model:** **Keep as-is** (`openai/gpt-4o` via OpenRouter, UI copy "powered by Claude AI"). See §9 deferred note.
- **Depth:** Lean. Ship the critical path first; stretch items only if time remains.

---

## 2. Current state — what actually works (verified by code + live walkthrough)

| Area | State | Evidence |
|---|---|---|
| Landing page | ✅ Works | `app/page.tsx`, hero + CTAs route correctly |
| Dashboard shell, filters | ✅ Works | Industry/City/Seniority filters re-render all charts |
| Skills demand bar chart | ✅ Works | `components/charts/SkillsBarChart.tsx` |
| Trending / Salary / Heatmap / Trend lines | ✅ Render | All driven by aggregator over seed data |
| Skill tag input (≥3 gate) | ✅ Works | `components/candidate/SkillInput.tsx` |
| **Fit Analyser AI call** | ❌ **Broken** | `X-Title` header em-dash → ByteString crash (see §3, P0-1) |
| **Job data** | ⚠️ **Hardcoded** | `seed-jobs.json` = 50 rows; `scraped-jobs.json` = 0 rows |
| **30-day trends** | ⚠️ **Simulated** | `enrichWithHistoricalTrends()`; UI says "Simulated 30-day trend" |
| Scrapers | ⚠️ Written, unproven | `scripts/scrape-*.ts` exist but have produced no data |

**Takeaway:** the UI/UX layer is genuinely solid and demo-ready. The credibility layer (real data + working AI) is the gap. This plan spends almost all effort there, not on UI.

---

## 3. Phase plan (ordered by judge-impact per hour)

> Phases 0–2 are the **critical path** (must ship). Phase 3 is the **hybrid module** stretch. Phase 4 is the **scraper proof**. Phase 5 is **pitch packaging**. Stop after any phase and we still have a coherent, improved submission.

---

### Phase 0 — Unblock the AI (≈30 min) · CRITICAL

The single highest-value fix in the whole repo. One character is breaking the headline AI feature.

**P0-1 — Fix the em-dash header crash**
- File: `lib/claude/client.ts`
- Problem: `'X-Title': 'SignalMap — Malaysian Talent Intelligence'` contains `—` (U+2014). HTTP header values must be Latin-1; the fetch layer throws *"Cannot convert argument to a ByteString because the character at index 10 has a value of 8212."*
- Fix: replace the em dash with a hyphen (`-`) or remove the punctuation: `'SignalMap - Malaysian Talent Intelligence'`.
- Acceptance: POST `/api/analyze` with `{ "skills": ["Python","AWS","React"] }` returns a populated `CandidateAnalysis` (matchScore, roles, missing skills) instead of a 500.

**P0-2 — Harden the analyse route against AI failure**
- Files: `app/api/analyze/route.ts`, `lib/analyzer/gap.ts`
- Problem: if OpenRouter is slow/down/over-quota during the live demo, the whole feature dies.
- Fix: wrap `analyzeCandidate()` in try/catch; on failure, fall back to the **local** gap computation already in `lib/analyzer/gap.ts` and return a degraded-but-valid `CandidateAnalysis` with a `degraded: true` flag. Never show a raw error to a judge.
- Acceptance: with an invalid `OPENROUTER_API_KEY`, the Fit Analyser still returns matched/missing skills (from local logic) and the UI renders.

**P0-3 — Analyse over the full dataset, not just seed**
- File: `app/api/analyze/route.ts`
- Problem: route calls `loadSeedJobs()`; once real data lands it would ignore it.
- Fix: switch to `loadAllJobs()` (seed + scraped + API) so the analysis reflects live demand.
- Acceptance: market demand passed to the analyser includes API-sourced postings.

---

### Phase 1 — Real, non-hardcoded job data via API (≈4–6 hrs) · CRITICAL

Replace "static seed" with a **live Malaysian job feed**. This is the claim judges will probe hardest.

> ⚠️ **Correction baked in:** Adzuna (the original idea) does **not** cover Malaysia. Use a MY-capable API. Recommendation: **JSearch (RapidAPI)** primary — `country=my`, returns title/company/location/salary/description, free 200 req/month — with **Careerjet** (keyless public API) as fallback.

**P1-1 — Add API fetch client**
- New file: `scripts/fetch-jsearch.ts` (mirror the structure of the existing scrapers so it fits the `npm run pipeline` chain).
- Behaviour: query JSearch for a spread of Malaysian queries (e.g. `developer in Malaysia`, `data analyst in Malaysia`, `accountant in Malaysia`, one per target industry), `country=my`, paginate within the free quota, map each result into the existing `ScrapedJob` shape (reuse the `mapIndustry` / `mapCity` / `inferSeniority` / `parseSalary` helpers already written in the scrapers — extract them into `lib/pipeline/normalize.ts` to avoid duplication).
- Output: append to `lib/data/scraped-jobs.json` (dedupe by id, same merge logic the scrapers already use).
- Env: add `JSEARCH_API_KEY` to `.env.example`, `.env.local`, `lib/config.ts`, and Vercel project env.

**P1-2 — Extract real skills from the fetched JDs**
- Reuse: `scripts/extract-skills.ts` + `lib/claude/extractor.ts` already do JD → `extractedSkills[]` via AI. Point them at the newly fetched rows.
- Cost guard: cap to ~40–60 fresh postings per run to stay inside free AI quota; the extractor already supports batching.
- Acceptance: `scraped-jobs.json` contains ≥40 real MY postings, each with non-empty `extractedSkills`.

**P1-3 — Automate it (so it's "live", not a one-off)**
- New workflow: `.github/workflows/refresh-data.yml`, scheduled (e.g. daily 02:00 UTC), runs `npm run pipeline` (fetch → extract → snapshot), commits the updated JSON. Vercel auto-redeploys on commit → dashboard shows fresh data. (`app/api/pipeline/refresh/route.ts` already reports pipeline status — surface its `dataFreshness` in the UI, see P1-4.)
- Secrets: add `JSEARCH_API_KEY` and `OPENROUTER_API_KEY` to GitHub Actions secrets.
- Acceptance: a manual "Run workflow" produces a commit that bumps the posting count on the live site.

**P1-4 — Tell the truth in the UI**
- File: `components/dashboard/FilterPanel.tsx` (the "Dataset / Source" block).
- Change `Source: Seed data` to reflect reality: `Source: Live (JSearch) + seed` and show last-refresh date + total postings from the `/api/pipeline/refresh` status. The loader already merges both via `loadAllJobs()`.
- Acceptance: dashboard header reads "Last updated <date> · Live + seed · N postings".

---

### Phase 2 — Honest trends (≈2–3 hrs) · CRITICAL (credibility)

Right now trends are invented. Judges will spot "Simulated." Convert to **real period-over-period** signal.

**P2-1 — Real historical snapshots**
- Reuse: `lib/pipeline/history.ts` + `scripts/save-snapshot.ts` already exist to persist dated snapshots. The daily workflow (P1-3) now writes one snapshot per run.
- Change `enrichWithHistoricalTrends()` to compute trend % from **actual** consecutive snapshots when ≥2 exist; fall back to the current simulated value only when history is thin, and **label which mode is active**.
- Acceptance: after 2+ workflow runs, at least some skills show trend deltas derived from real snapshot diffs.

**P2-2 — Relabel honestly until history accrues**
- File: `components/charts/TrendLine.tsx` caption.
- Until enough real snapshots exist, change "Simulated 30-day trend" → "Projected trend · baseline from live snapshot (history accruing)". No fake precision.
- Acceptance: no screen claims real history we don't have yet.

---

### Phase 3 — Hybrid module coverage: build the highest-impact new screen (≈4–6 hrs) · STRETCH

Per the Hybrid decision: build **one** new visible module screen (highest pitch value) and one **employer view**, map the other three modules in the pitch (§4). Recommended build: **Career Path Navigator**, because the data to power it already exists (roles + salary in the analyser output).

**P3-1 — Career Path Navigator screen**
- New route: `app/(dashboard)/career-path/page.tsx` + nav link.
- Input: reuse `SkillInput`. Output: render the `recommendedRoles[]` the analyser **already returns** (title, matchPercentage, industry, salaryRange, topRequiredSkills) as a "top 3 roles you're positioned for" view, plus a simple skills-to-close list per role (from `missingHighDemandSkills`).
- No new AI work — this is a second presentation of the existing `/api/analyze` payload. Cheap, high visible value.
- Acceptance: entering skills shows 3 ranked target roles with salary ranges and the gap to each.

**P3-2 — Employer "Demand" framing (Wildcard module)**
- Lightweight: add a toggle/tab on the dashboard that reframes the *existing* heatmap + salary bands as an **employer view** ("talent supply for the skills you hire for"). Mostly copy + a framing card; reuses current charts.
- Acceptance: a judge can switch to an employer lens without new data plumbing.

---

### Phase 4 — One working scraper as proof (≈2–4 hrs) · STRETCH

Satisfies the "we also scrape, not just call an API" half of the Both decision.

**P4-1 — Make MYFutureJobs scraper actually return data**
- File: `scripts/scrape-myfuturejobs.ts` — it already targets a JSON API (`/api/vacancy/search`), which is far more likely to work than HTML scraping. Verify the live endpoint shape, fix the response mapping, confirm rows land in `scraped-jobs.json`.
- If the gov API is dead: pivot to a Playwright-based JobStreet scrape (Playwright MCP is available) — but **timebox to 2 hrs**; the API feed (Phase 1) is already our reliable source, so this is purely a credibility bonus.
- Acceptance: ≥10 postings in `scraped-jobs.json` with `source: "myfuturejobs"` (or `jobstreet`).

---

### Phase 5 — Pitch packaging & demo flow (≈2–3 hrs) · CRITICAL for scoring

The build can be great and still lose if the story isn't legible.

**P5-1 — Module-coverage section in README + pitch**
- Drop the §4 mapping table into `README.md` and the pitch deck, with a screenshot per row.

**P5-2 — Scripted 3-minute demo path** (see §6).

**P5-3 — "How the data is real" one-pager** — a short doc/slide: API source → AI skill extraction → aggregation → dashboard, with the daily refresh workflow shown. This directly rebuts "is this hardcoded?"

---

## 4. Module coverage mapping (how this plan delivers each)

| Module | How SignalMap covers it | Delivered by |
|---|---|---|
| **Smart Talent Matching** | Demand map shows employers the talent supply for required skills — matching built on real skill data | Phase 1 (real data) + Phase 3.2 (employer view) |
| **Living Portfolio** | Fit Analyser skill profile — current skills vs market demand, what to add to raise value | Phase 0 (fix) + existing `FitScoreCard` |
| **Wildcard (Employers)** | Real-time talent **demand** intelligence dashboard — no existing module maps demand | Phase 3.2 employer lens; mapped in pitch |
| **AI Career Coach** | Fit Analyser recommendations: missing skills, estimated learning time, next steps | Phase 0 (the AI now works) |
| **Career Path Navigator** | Top-3 roles the candidate is best positioned for, with salary ranges | **Phase 3.1 (new screen)** |

Built as visible UI: **Living Portfolio, AI Career Coach, Career Path Navigator** (+ employer Demand lens). Mapped in pitch: **Smart Talent Matching, Wildcard** framing.

---

## 5. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| JSearch free quota (200/mo) exhausted mid-demo | Med | Data is fetched in the daily workflow and committed to the repo — the live site reads JSON, makes **zero** API calls at view time. Demo is quota-proof. |
| OpenRouter down during live AI demo | Med | P0-2 local fallback returns a valid analysis offline. |
| Scraper (Phase 4) won't yield data in time | Med | It's a stretch/bonus; the API feed is the real source. Timeboxed to 2 hrs, then drop. |
| Real trends need ≥2 days of snapshots | High | P2-2 honest labelling; kick off the daily workflow **today** so 2+ snapshots exist by submission. |
| "powered by Claude AI" copy vs gpt-4o model | Low | Kept as-is per decision; see §9. |
| Scope creep beyond 2–3 days | Med | Phases 3–4 are explicitly stretch; ship Phases 0–2 + 5 first. |

---

## 6. Judge demo script (3 minutes)

1. **Landing** → "SignalMap reads real Malaysian job postings and turns them into talent-demand intelligence." (5s)
2. **Dashboard** → point at header: *"Live (JSearch) + seed · updated <date> · N postings."* Filter to Technology → charts re-render. "This is real data, refreshed daily by an automated pipeline." (45s)
3. **Trends + Heatmap** → "Demand by skill × industry, with trend direction from period-over-period snapshots." (30s)
4. **Fit Analyser (AI Career Coach + Living Portfolio)** → type 3 skills → AI returns match score, missing high-demand skills + learning time. (45s)
5. **Career Path Navigator** → same skills → top-3 roles with salary ranges + gap to each. (30s)
6. **Employer lens (Wildcard)** → toggle → "employers see talent supply for the skills they hire for." (15s)
7. Close on the module-coverage slide. (10s)

---

## 7. Sequenced task checklist (copy into `docs/CHECKLIST.md`)

**Day 1 (critical path):**
- [ ] P0-1 fix em-dash header
- [ ] P0-2 local AI fallback
- [ ] P0-3 analyse over `loadAllJobs()`
- [ ] P1-1 JSearch fetch script + env wiring
- [ ] P1-2 run skill extraction on fetched rows
- [ ] Kick off first data refresh (start snapshot history clock)

**Day 2:**
- [ ] P1-3 GitHub Actions daily refresh workflow + secrets
- [ ] P1-4 honest "Source / last updated" UI
- [ ] P2-1 real snapshot-based trends
- [ ] P2-2 honest trend labelling

**Day 3 (stretch + packaging):**
- [ ] P3-1 Career Path Navigator screen
- [ ] P3-2 employer Demand lens toggle
- [ ] P4-1 MYFutureJobs scraper proof (timeboxed 2 hrs)
- [ ] P5-1 module mapping in README + deck
- [ ] P5-2 rehearse demo script
- [ ] P5-3 "how the data is real" one-pager

---

## 8. Files touched (reference)

- **Fix:** `lib/claude/client.ts`, `app/api/analyze/route.ts`
- **New:** `scripts/fetch-jsearch.ts`, `lib/pipeline/normalize.ts` (shared mappers), `.github/workflows/refresh-data.yml`, `app/(dashboard)/career-path/page.tsx`, `docs/implimentation-plans/` (this file)
- **Edit:** `lib/config.ts`, `.env.example`, `.env.local`, `components/dashboard/FilterPanel.tsx`, `components/charts/TrendLine.tsx`, `lib/pipeline/history.ts` / `aggregator.ts` (real trends), `app/(dashboard)/dashboard/page.tsx` (employer toggle), `README.md`
- **Reuse unchanged:** `scripts/extract-skills.ts`, `lib/claude/extractor.ts`, `scripts/save-snapshot.ts`, `lib/analyzer/gap.ts`, all chart components

---

## 9. Deferred decisions (out of scope this round)

- **"Powered by Claude AI" vs gpt-4o:** kept as-is per decision. *One-line risk note:* a thorough judge inspecting the code may flag the claim as inaccurate. Trivial future fix — switch model id to `anthropic/claude-sonnet` in `lib/claude/client.ts` (same SDK) so the copy becomes true. Not doing it now.
- Auth / user accounts, saved profiles, multi-user employer dashboards.
- Production rate-limit/retry/caching hardening on the AI path beyond the P0-2 fallback.
- Paid API tiers / multi-source aggregation beyond JSearch + one scraper.

---

## 10. Definition of done (for this plan)

- [ ] Fit Analyser returns a real AI analysis end-to-end on the live site.
- [ ] Dashboard shows ≥40 real Malaysian postings sourced from JSearch, refreshed by an automated workflow, honestly labelled.
- [ ] At least one trend value derived from real snapshots (or honestly labelled until history accrues).
- [ ] Career Path Navigator screen live; employer lens present.
- [ ] README + pitch contain the module-coverage mapping with screenshots.
- [ ] 3-minute demo rehearsed and quota-/outage-proof.

---

### Sources (data-API research)
- JSearch (OpenWeb Ninja / RapidAPI), `country=my`, free 200 req/mo: https://www.openwebninja.com/api/jsearch · https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- Jooble API (Malaysia): https://publicapis.io/jooble-api · https://my.jooble.org/
- Careerjet public API (keyless, Malaysia): https://publicapis.io/careerjet-api · https://www.careerjet.com.my/
