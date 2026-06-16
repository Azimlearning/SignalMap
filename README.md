# SignalMap — Malaysia Talent Demand Intelligence

> **Talentbank Tech Hackathon 2026 · Team Dang Wangi**
> Live demo: **[signal-map-silk.vercel.app](https://signal-map-silk.vercel.app)**

SignalMap is an AI-powered talent intelligence platform that tells Malaysian graduates and employers what skills the job market actually demands — right now. Built with real job postings scraped daily from multiple Malaysian sources.

---

## What it does

| Module | Description | Status |
|---|---|---|
| **Talent Market Intelligence** | Live skill demand heatmap, salary bands, trending signals | ✅ Live |
| **Career Path Navigator** | Industry-by-industry progression ladders (Junior → Lead) | ✅ Live |
| **Skill Gap Analysis** | Compare your skills against the top 20 market demands | ✅ Live |
| **Learning Path Recommender** | AI-ranked missing skills + estimated learning time | ✅ Live |
| **Employer Intelligence** | Filter demand by industry, city, seniority | ✅ Live |

---

## Example use cases

### 1. "What skills are hottest in Malaysia right now?"
Go to [/dashboard](https://signal-map-silk.vercel.app/dashboard) → Skills Demand bar chart shows the top 20 skills ranked by posting count across 210 real job postings. SQL is up +160%, Python +100% vs last week.

### 2. "I'm a fresh grad — what's my market fit?"
Scroll to **Personal Fit Analyser** at the bottom of the dashboard. Type your skills (e.g. Python, SQL, Excel, Power BI) and hit **Analyse My Fit**. The AI returns:
- A market fit score (0–100)
- Which of your skills are in high demand
- Your top missing skills ranked by urgency
- Recommended roles with salary ranges
- Direct links to search those roles on Talentbank/Graduan

### 3. "What does a Tech career ladder look like in Malaysia?"
Go to [/career-path](https://signal-map-silk.vercel.app/career-path) → Select **Technology**. See the full progression:
- **Junior** (e.g. Junior Software Engineer): Python, Git, Communication — RM 3k–5k/mo
- **Mid-level** (e.g. Software Engineer): AWS, Docker, REST APIs — RM 6k–9k/mo  
- **Senior** (e.g. Senior Software Engineer): Kubernetes, System Design — RM 10k–15k/mo
- **Lead / Manager**: Team leadership, Architecture — RM 15k+/mo

### 4. "I'm hiring — which skills are most scarce in Finance?"
Dashboard → Filter **Industry: Finance** → heatmap shows Finance-specific demand. Compliance and Financial Reporting are rising (+55%, +43%).

---

## Data pipeline

```
JSearch API (RapidAPI)          ─┐
Wobb.my (Hiredly) scraper       ─┼─► scraped-jobs.json
JobStreet scraper               ─┘
         +
Seed jobs (50 curated)          ─── seed-jobs.json
         │
         ▼
AI skill extraction (GPT-4o-mini via OpenRouter)
         │
         ▼
lib/data/history/YYYY-MM-DD.json  ← daily snapshots
         │
         ▼
/api/data/skills  /api/data/trend  /api/data/career-paths  /api/analyze
         │
         ▼
Next.js dashboard + Career Path Navigator
```

**Current dataset:** 210 jobs · 906 unique skills · 2 daily snapshots (real trend deltas)

**Sources:**
- [JSearch via RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) — LinkedIn, Indeed, Glassdoor Malaysia aggregator
- [Wobb.my](https://wobb.my) — Malaysian startup/SME jobs (skills pre-extracted)
- 50 curated seed jobs across 7 industries for baseline coverage

---

## Running locally

```bash
git clone https://github.com/Azimlearning/SignalMap
cd SignalMap/signalmap
npm install
```

Create `.env.local`:
```
OPENROUTER_API_KEY=<your key from openrouter.ai>
JSEARCH_API_KEY=<your key from rapidapi.com/jsearch>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npm run dev          # start dev server at localhost:3000
npm run fetch        # fetch live jobs from JSearch API
npm run scrape       # scrape Wobb.my + JobStreet
npm run extract      # AI skill extraction on new jobs
npm run snapshot     # save daily trend snapshot
npm run pipeline     # run all of the above in sequence
```

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 · App Router · TypeScript strict |
| Styling | Tailwind CSS v4 (CSS custom properties) |
| UI | shadcn/ui v4 (`@base-ui/react`) |
| Charts | Recharts ^3.8 |
| State | Zustand ^5 |
| AI | OpenRouter → GPT-4o-mini (extraction) + GPT-4o (analysis) |
| Data | JSearch API + Wobb.my scraper + seed dataset |
| Deploy | Vercel (auto-deploy on push to `main`) |
| CI/CD | GitHub Actions — daily pipeline at 10:00 MYT |

---

## Team

**Team Dang Wangi** · Talentbank Tech Hackathon 2026  
Contact: fakhrulazim.am@gmail.com
