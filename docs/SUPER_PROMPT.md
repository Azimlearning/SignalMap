# SignalMap — Super Prompt
## Paste this at the start of EVERY Claude Code session

---

You are joining an active hackathon build called **SignalMap** — a real-time AI-powered talent demand intelligence platform built as a Career OS module for the Talentbank Tech Hackathon 2026. Team: **Dang Wangi**. Deadline: **28 days from kickoff** (prototype needed NOW for Intent Form).

## 1. Read these files FIRST — in this order

```
CLAUDE.md          ← operating brief, hard invariants, your file boundaries
PRD.md             ← full product spec, features, architecture, data model
CHECKLIST.md       ← current build status — check what's done and what's next
AGENT_X.md         ← YOUR specific agent brief (replace X with your letter: A/B/C/D)
```

**Do not write a single line of code until you have read all four.**

## 2. Which agent are you?

This project runs parallel agents. Each agent owns specific files and must NEVER touch files owned by another agent. Read your AGENT_X.md to understand your exact ownership boundary.

| Agent | Focus | Key Files |
|---|---|---|
| **Agent A** | Data pipeline | `lib/pipeline/`, `lib/data/`, `scripts/`, `app/api/data/` |
| **Agent B** | Dashboard UI | `components/dashboard/`, `components/charts/`, `app/(dashboard)/` |
| **Agent C** | Candidate analyser | `components/candidate/`, `lib/analyzer/`, `app/api/analyze/` |
| **Agent D** | Core / shared | `lib/types/`, `lib/utils/`, `lib/claude/`, `components/ui/`, config files |

**Rule: If a file isn't in your ownership list, do NOT edit it. Coordinate via CHECKLIST.md only.**

## 3. Tech stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Charts:** Recharts
- **AI:** Claude API (claude-sonnet-4-6 for extraction, claude-opus-4-8 for analysis)
- **Deployment:** Vercel
- **Data:** Public Malaysian job posting data (JobStreet public, structured seed JSON)
- **State:** React hooks + lightweight Zustand store
- **No DB for prototype** — JSON files + API routes

## 4. Open source references to use

| What you're building | Fork/inspire from |
|---|---|
| LLM job data extraction pipeline | github.com/karpathy/jobs |
| Skills demand tracking methodology | github.com/hiring-lab/ai-tracker |
| Candidate gap analysis | github.com/srbhr/Resume-Matcher |
| Interview/assessment components | github.com/adrianhajdin/ai_mock_interviews |
| Dashboard charts | Recharts examples + shadcn/ui |

Always check these repos first before building from scratch. Semi-fork where you can.

## 5. Gates — must be green before you commit

```bash
npx tsc --noEmit          # 0 TypeScript errors
npx eslint . --ext .ts,.tsx  # 0 lint errors
npm run build             # successful build
```

## 6. How to build

1. Check CHECKLIST.md — find the first unchecked item in your agent's section
2. Plan what you're building in chat before writing code
3. Write code + check gates
4. Mark the checklist item as done
5. Move to the next item

**Never build two things at once. One working feature beats three broken stubs.**

## 7. Prototype priority (P0 — needed ASAP for Intent Form)

The clickable prototype URL for the Intent Form needs to be live on Vercel.
P0 is the minimum viable demo:
- Seed data loaded (50 Malaysian job postings as structured JSON)
- Skills demand bar chart (top 20 skills by posting count)
- Industry filter + city filter
- Trending skills panel
- Basic candidate fit analyser (text input → match score)
- Deployed on Vercel with a live URL

**Everything else is P1. Ship P0 first.**
