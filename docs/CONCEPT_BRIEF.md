# SignalMap — Concept Brief
## Intent Form Section 02: What You'll Build (~800 words)
## Team: Dang Wangi | Build Scope: Career OS + Challenge Modules

---

Malaysia produces over 300,000 university graduates every year. More than 48% end up in jobs they are overqualified for — not because they lack talent, but because they lack visibility. They spend months crafting resumes for skills that are not in demand, targeting industries already saturated, and applying to salary bands they have never researched. A computer science graduate in Cyberjaya applies for "software developer" roles everywhere without knowing that cloud infrastructure roles in KL's BFSI sector are paying 40% more and have three times fewer applicants. On the employer side, companies post jobs on platforms like Talentbank describing skills they want without knowing whether those skills exist in sufficient supply. The mismatch is not a talent shortage. It is an information shortage — and no platform in Malaysia is solving it in real time.

SignalMap solves this by turning Malaysia's job posting data into a live, AI-powered talent demand intelligence layer — the intelligence engine underneath Career OS that makes the entire talent graph smarter.

**What we are building**

SignalMap is a Next.js web application that aggregates real Malaysian job postings, uses AI to extract structured skill demand signals from unstructured job descriptions, and surfaces that intelligence through three interconnected views that serve candidates, employers, and Talentbank simultaneously.

The first view is the Demand Map. This is an interactive dashboard showing which skills are most in demand right now, broken down by industry vertical, city, and seniority level. Users can see that "Python + data analysis" has hundreds of active postings in the Klang Valley, that "React.js" is trending strongly in the tech sector, or that "project management + Agile" is the most under-supplied skill cluster relative to demand. The map is filterable by industry, city, role type, and time window — giving users the ability to slice the data to their exact career context.

The second view is the Salary Intelligence Layer. Each skill cluster is annotated with real salary band data extracted from postings, giving candidates concrete, data-backed benchmarks for career investment decisions. A graduate can see exactly what premium certain skill combinations command in specific cities and industries, turning what was previously an opaque, word-of-mouth process into a transparent, data-driven one.

The third view is the Personal Fit Analyser. Candidates input their current skills and receive a personal demand score: how well their skill set aligns with current market demand, which adjacent skills would most increase their marketability given the smallest learning investment, and which specific roles on Talentbank's employer network they are best positioned for right now. This is the candidate-facing output that makes SignalMap immediately actionable rather than just informational.

**Why this serves Career OS**

Talentbank's mission is to map Asia's talent graph — to connect 10,000 employers with the next million graduates intelligently. SignalMap is the data foundation that makes that graph real. Every skill extracted from a job posting, every demand signal captured, every candidate fit score computed feeds back into Talentbank's understanding of the market. Other Career OS modules might help candidates build profiles or apply for jobs. SignalMap generates the structured, continuously updating supply-and-demand data that makes every other module smarter. It is not a feature on top of Career OS. It is the intelligence layer underneath it.

**Technical approach**

SignalMap is built on Next.js 14 with Tailwind CSS and shadcn/ui for the frontend, deployed on Vercel. A data pipeline processes publicly available Malaysian job posting data through a Claude-powered extraction layer that parses unstructured job descriptions into structured skill vectors, salary ranges, role categories, and seniority levels. The resulting structured dataset is served via clean API routes to a Recharts-powered interactive dashboard. Our approach is directly inspired by Andrej Karpathy's open-source job data analysis pipeline (github.com/karpathy/jobs) for the LLM-powered structured extraction methodology, and the Indeed Hiring Lab's ai-tracker (github.com/hiring-lab/ai-tracker) for the job posting signal analysis framework. The candidate-facing gap analysis draws on the open-source resume matching architecture from github.com/srbhr/Resume-Matcher, adapted for market-level rather than individual-level matching.

**Who it serves**

SignalMap serves three audiences. Candidates use the demand map to navigate toward roles that match market reality rather than applying blindly. Employers gain visibility into the talent supply for the skills they are hiring for, so they can set realistic job requirements and competitive salary bands. Talentbank gains a proprietary, continuously updating view of Asia's skill supply-demand graph that no other platform in Malaysia currently has — a defensible data asset that compounds in value with every job posting processed and every candidate interaction logged.

Team Dang Wangi is a four-person team from Universiti Teknologi PETRONAS with demonstrated experience shipping AI-native products under hackathon conditions, including multi-agent LangGraph systems, RAG-based research platforms, and production-grade full-stack applications. We are building Career OS + Challenge Modules, with SignalMap as our primary module contribution.
