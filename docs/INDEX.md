# 📚 Documentation Index

> Quick-reference guide for AI agents and LLMs. Use this to locate relevant documentation without loading everything into context. Always check this index FIRST before searching the codebase.

**Last Updated:** 2026-02-20
**Total Documents:** 46

## How to Use This Index

1. Scan the categories below to find relevant docs
2. Read the 1-line summary to confirm relevance
3. Only then open the specific file you need
4. If you modify, add, or delete any doc in `docs/`, update this index

---

## 🗂️ Categories

### Guides

| File | Summary | Key Topics | Last Modified |
| --- | ----- | ------ | ----- |
| `guides/AI-INTEGRATION-GUIDE.md` | AI provider (Groq), function-calling tools, proxy pattern, API keys server-side | `AI`, `Groq`, `function-calling`, `proxy` | 2026-02-17 |
| `guides/AI-TROUBLESHOOTING.md` | Gemini 429 quota root cause, user-facing error guidance, diagnostics | `AI`, `troubleshooting`, `429`, `quota`, `errors` | 2026-02-19 |
| `guides/DEVELOPMENT-ENVIRONMENT-GUIDE.md` | Bun, Vite, TypeScript setup; directory layout, env vars, ESLint/Prettier, Git | `Bun`, `Vite`, `TypeScript`, `onboarding` | 2026-02-17 |
| `guides/FIREBASE-GUIDE.md` | Firebase Auth, Firestore, Realtime DB, presence, security rules, offline behavior | `Firebase`, `Auth`, `Firestore`, `sync`, `security rules` | 2026-02-17 |
| `guides/KONVA-REACT-GUIDE.md` | Konva.js and react-konva: Stage, Layer, shapes, events, transforms, pan/zoom, performance | `Konva`, `canvas`, `shapes`, `pan/zoom`, `performance` | 2026-02-17 |
| `guides/README.md` | Index of technology guides with quick start and recommended reading order | `guides`, `overview`, `stack` | 2026-02-09 |
| `guides/TAILWIND-SHADCN-GUIDE.md` | Tailwind v4, Shadcn/ui, theming, dark mode, design tokens, animations | `Tailwind`, `Shadcn`, `theming`, `dark mode`, `UI` | 2026-02-17 |
| `guides/TESTING-GUIDE.md` | Vitest, Playwright, testing pyramid, mocking Firebase, coverage, CI | `Vitest`, `Playwright`, `E2E`, `coverage`, `mocking` | 2026-02-18 |

### Governance

| File | Summary | Key Topics | Last Modified |
| --- | ----- | ------ | ----- |
| `CONSTITUTION.md` | Inviolable rules for state improvement plan (Epics 1–3): state sovereignty, world coords, repository abstraction, AI interface, migration safety, performance, testing, backward compatibility | `constitution`, `state improvement`, `governance`, `Epic 0`, `rules` | 2026-02-20 |

### Operations

| File | Summary | Key Topics | Last Modified |
| --- | ----- | ------ | ----- |
| `operations/DEPLOYMENT.md` | Render + Firebase deployment: static site, SPA rewrites, AI proxy, env vars | `deployment`, `Render`, `Firebase`, `AI proxy`, `SPA` | 2026-02-18 |
| `operations/RELEASE-AUTOMATION.md` | Preflight validation, Firebase rules deploy, AI proxy smoke test, benchmark runs | `release`, `Firebase rules`, `smoke test`, `benchmarks` | 2026-02-19 |

### Optimization

| File | Summary | Key Topics | Last Modified |
| --- | ----- | ------ | ----- |
| `optimization/OPTIMIZATION-PLAN-1.md` | Early optimization ideas: assets, bundle, Zustand migration, Next.js-specific (partially N/A for Vite) | `bundle`, `Zustand`, `LCP`, `quick wins` | 2026-02-18 |
| `optimization/OPTIMIZATION-PLAN-2.md` | Agent-executable plan: viewport off React hot path, useBatchDraw, Zustand selection | `viewport`, `FPS`, `Zustand`, `batch draw` | 2026-02-18 |
| `optimization/OPTIMIZATION-PLAN-3.md` | Prioritized task list (welcome page, share link, trackpad, text edit, delete perf, etc.) with scores | `prioritization`, `UX`, `performance`, `tasks` | 2026-02-18 |
| `optimization/OPTIMIZATION-PLAN.md` | Cumulative optimization plan: de-duplicated tasks, benchmark guardrails, 20% improvement target | `benchmarks`, `FPS`, `sync latency`, `no regression` | 2026-02-19 |
| `Optimization/USE-EFFECT-CENSUS.md` | Per-file useEffect census: keep/remove/extract/defer with rationale and decision standard | `useEffect`, `refactor`, `hooks`, `census`, `BoardCanvas` | 2026-02-19 |

### Performance

| File | Summary | Key Topics | Last Modified |
| --- | ----- | ------ | ----- |
| `performance/PERFORMANCE_LOG.md` | Task-level performance reviews, metrics schema (timestamps for graphing), time-based progress chart, optimization history (A.1–A.4); run `bun run perf:check` to record and refresh | `performance`, `cleanup`, `optimization`, `perf:check`, `metrics over time`, `metrics schema`, `timestamps`, `graphing`, `viewport`, `A.4`, `bundle`, `tree-shaking`, `multi-drop` | 2026-02-19 |

### Phases (version-2)

| File | Summary | Key Topics | Last Modified |
| --- | ----- | ------ | ----- |
| `phases/version-2/DESIGN-DOCUMENT.md` | v2 design principles, EPICs, user stories, module alignment; agile breakdown | `v2`, `EPICs`, `user stories`, `SOLID`, `design` | 2026-02-17 |
| `phases/version-2/FEATURES.md` | Top 20 v2 features with description, acceptance criteria, technical notes, dependencies | `v2`, `features`, `acceptance criteria`, `build order` | 2026-02-17 |
| `phases/version-2/INITIAL-RESEARCH.md` | v2 feature brainstorm and prioritized Top 20 with justification (user value, effort, risk) | `v2`, `prioritization`, `candidates`, `roadmap` | 2026-02-17 |
| `phases/version-2/PRD.md` | Final v2 PRD: single source for execution (EPICs, stories, features, branches, commits) | `v2`, `PRD`, `execution`, `scope` | 2026-02-17 |
| `phases/version-2/PRD-V1.md` | Initial v2 PRD: git workflow, feature branches, EPIC/story/feature mapping | `v2`, `PRD`, `git workflow`, `feature branches` | 2026-02-17 |
| `phases/version-2/PRE-SEARCH-DOCUMENT.md` | Phase 1-3 deliverable checklist: research, design, and implementation pre-search | `pre-search`, `checklist`, `deliverables`, `phases` | 2026-02-19 |
| `phases/version-2/PRD-V2.md` | Expanded v2 PRD: success criteria, risks, dependencies, stakeholder value, diagrams | `v2`, `PRD`, `success criteria`, `planning` | 2026-02-17 |

### Planning

| File | Summary | Key Topics | Last Modified |
| --- | ----- | ------ | ----- |
| `planning/AI-COST-ANALYSIS.md` | AI cost at scale: dev costs, production projections (100–100K users), Groq assumptions | `AI cost`, `Groq`, `scaling`, `LLM` | 2026-02-19 |
| `planning/AI-DEVELOPMENT-LOG.md` | 1-page AI dev log: tools, MCP usage, prompts, code split, strengths/limitations, learnings, cost | `AI-first`, `Cursor`, `MCP`, `workflow`, `learnings` | 2026-02-19 |
| `planning/AI-SESSION-LOG.md` | Detailed per-session development notes (20+ sessions): scope, implementation, cost, running totals | `sessions`, `cost`, `running totals`, `implementation` | 2026-02-19 |
| `planning/UI-UX-IMPROVEMENT-PLAN.md` | Prioritized UX improvements: share links, theme, panel collapse, balanced scoring, delivery plan | `UX`, `share links`, `theme`, `prioritization`, `P0/P1` | 2026-02-18 |

### Product

| File | Summary | Key Topics | Last Modified |
| --- | ----- | ------ | ----- |
| `product/PRD.md` | Root PRD: CollabBoard scope, MVP/full requirements, tech stack, architecture, multi-drop reconciliation | `PRD`, `MVP`, `requirements`, `scope`, `architecture`, `multi-drop`, `flicker` | 2026-02-19 |
| `product/PRD-UNCHECKED-TRACKER.md` | Maps unchecked PRD items to implementation and test evidence (E2E, unit, manual) | `PRD`, `tracker`, `evidence`, `Epic 3`, `Epic 5` | 2026-02-19 |

### Reports

| File | Summary | Key Topics | Last Modified |
| --- | ----- | ------ | ----- |
| `agent-transcript-report.md` | Generated report: total Cursor agent prompts in a time window and high-value prompts (structured + clear outcome); run `bun run report:agent-transcripts` with AGENT_TRANSCRIPTS_DIR set | `Cursor`, `agent transcripts`, `prompts`, `report:agent-transcripts` | 2026-02-20 |
| `reports/mvp-audit-matrix.md` | MVP and benchmark criteria vs implementation and test evidence (PASS/PARTIAL/FAIL) | `MVP`, `audit`, `benchmarks`, `evidence matrix` | 2026-02-18 |
| `reports/mvp-audit-report.md` | MVP compliance audit: commands run, code/test additions, results summary | `MVP`, `audit`, `verification`, `benchmarks` | 2026-02-18 |
| `reports/refactor-audit/REFACTOR_AUDIT_REPORT.md` | Phase A refactor audit: hook census, event handlers, pattern analysis, useEffect prevention guidelines, implementation backlog | `refactor`, `hooks`, `useEffect`, `audit`, `BoardCanvas` | 2026-02-19 |
| `reports/refactor-audit/TYPE_MIGRATION_CHECKLIST.md` | Type migration patterns: IPosition, IDimensions, bounds, layout types; find-and-replace reference | `types`, `migration`, `IPosition`, `IDimensions`, `checklist` | 2026-02-18 |

### Research

| File | Summary | Key Topics | Last Modified |
| --- | ----- | ------ | ----- |
| `research/DESIGN-DOCUMENT.md` | Original CollabBoard design: hard requirements, tech stack, high-level architecture, vision | `design`, `requirements`, `MVP`, `architecture` | 2026-02-18 |
| `research/IDENTIFY-TRADEOFFS.md` | Early tradeoffs: backend, canvas, AI, deployment options with brief pros/cons | `tradeoffs`, `Firebase`, `Konva`, `historical` | 2026-02-17 |
| `research/IDENTIFY-TRADEOFFS-V2.md` | Structured tradeoffs: what was gained and given up per technology choice (current stack) | `tradeoffs`, `Firebase`, `Konva`, `Render` | 2026-02-17 |
| `research/PRD-V1.md` | Initial PRD: tech stack, architecture, Git workflow, agile breakdown (first executable plan) | `PRD`, `tech stack`, `epics`, `historical` | 2026-02-18 |
| `research/PRD-V2.md` | Expanded PRD: epics, timelines, Mermaid diagrams, refined scope | `PRD`, `epics`, `timeline`, `historical` | 2026-02-17 |
| `research/RECORD-ARCHITECTURE-DECISIONS.md` | Earlier ADR: Supabase, Claude, Vercel (superseded by V2); kept for history | `ADR`, `Supabase`, `Claude`, `deprecated` | 2026-02-17 |
| `research/RECORD-ARCHITECTURE-DECISIONS-V2.md` | Current ADR: Firebase, React/Vite/Bun/Shadcn/Konva/Tailwind, Groq, Render; rationale and alternatives | `ADR`, `Firebase`, `architecture`, `decisions` | 2026-02-17 |
| `research/TECH-STACK-OPTIONS.md` | Original tech-stack exploration: backend, frontend, canvas, AI, deployment options | `tech stack`, `options`, `Firebase`, `Konva`, `historical` | 2026-02-17 |
| `research/TECH-STACK-OPTIONS-V2.md` | Chosen stack with pros/cons per layer; concise "what we use and why" | `tech stack`, `Firebase`, `Render`, `rationale` | 2026-02-17 |

### Theme

| File | Summary | Key Topics | Last Modified |
| --- | ----- | ------ | ----- |
| `theme/THEME-VISUAL-GUIDE.md` | How to verify theme toggle (light/dark): expected appearance, troubleshooting | `theme`, `dark mode`, `light mode`, `UI verification` | 2026-02-17 |
| `theme/theme-screenshots/README.md` | Placeholder for light-mode and dark-mode reference screenshots | `theme`, `screenshots`, `visual reference` | 2026-02-17 |

---

## 🔍 Topic Cross-Reference

| Topic/Keyword | Relevant Docs |
| --- | --- |
| `ADR` | `research/RECORD-ARCHITECTURE-DECISIONS-V2.md`, `research/RECORD-ARCHITECTURE-DECISIONS.md` |
| `agent transcripts` | `agent-transcript-report.md` |
| `AI` | `guides/AI-INTEGRATION-GUIDE.md`, `guides/AI-TROUBLESHOOTING.md`, `planning/AI-COST-ANALYSIS.md`, `planning/AI-DEVELOPMENT-LOG.md`, `planning/AI-SESSION-LOG.md`, `product/PRD.md` |
| `audit` | `reports/mvp-audit-report.md`, `reports/mvp-audit-matrix.md`, `reports/refactor-audit/REFACTOR_AUDIT_REPORT.md` |
| `benchmarks` | `optimization/OPTIMIZATION-PLAN.md`, `reports/mvp-audit-matrix.md`, `operations/RELEASE-AUTOMATION.md` |
| `canvas` | `guides/KONVA-REACT-GUIDE.md`, `product/PRD.md` |
| `constitution` | `CONSTITUTION.md` |
| `Cursor` | `agent-transcript-report.md`, `planning/AI-DEVELOPMENT-LOG.md` |
| `deployment` | `operations/DEPLOYMENT.md`, `operations/RELEASE-AUTOMATION.md` |
| `Firebase` | `guides/FIREBASE-GUIDE.md`, `research/RECORD-ARCHITECTURE-DECISIONS-V2.md`, `research/TECH-STACK-OPTIONS-V2.md` |
| `governance` | `CONSTITUTION.md` |
| `FPS` | `optimization/OPTIMIZATION-PLAN.md`, `optimization/OPTIMIZATION-PLAN-2.md`, `performance/PERFORMANCE_LOG.md` |
| `Konva` | `guides/KONVA-REACT-GUIDE.md`, `research/IDENTIFY-TRADEOFFS-V2.md` |
| `MVP` | `product/PRD.md`, `reports/mvp-audit-report.md`, `reports/mvp-audit-matrix.md`, `research/DESIGN-DOCUMENT.md` |
| `state improvement` | `CONSTITUTION.md`, `STATE-IMPROVEMENT-PLAN.md` |
| `performance` | `performance/PERFORMANCE_LOG.md`, `optimization/OPTIMIZATION-PLAN.md` |
| `PRD` | `product/PRD.md`, `product/PRD-UNCHECKED-TRACKER.md`, `phases/version-2/PRD.md`, `research/PRD-V1.md`, `research/PRD-V2.md` |
| `theme` | `theme/THEME-VISUAL-GUIDE.md`, `theme/theme-screenshots/README.md`, `planning/UI-UX-IMPROVEMENT-PLAN.md`, `guides/TAILWIND-SHADCN-GUIDE.md` |
| `troubleshooting` | `guides/AI-TROUBLESHOOTING.md` |
| `tradeoffs` | `research/IDENTIFY-TRADEOFFS-V2.md`, `research/IDENTIFY-TRADEOFFS.md` |
| `useEffect` | `Optimization/USE-EFFECT-CENSUS.md`, `optimization/OPTIMIZATION-PLAN.md`, `reports/refactor-audit/REFACTOR_AUDIT_REPORT.md` |
| `v2` | `phases/version-2/PRD.md`, `phases/version-2/FEATURES.md`, `phases/version-2/INITIAL-RESEARCH.md`, `phases/version-2/DESIGN-DOCUMENT.md` |
| `Zustand` | `optimization/OPTIMIZATION-PLAN-1.md`, `optimization/OPTIMIZATION-PLAN-2.md`, `optimization/OPTIMIZATION-PLAN.md` |

---

## 🧭 Decision Quick-Lookup

| Decision | Status | Doc |
| --- | ------ | ----- |
| Backend: Firebase vs Supabase | accepted | `research/RECORD-ARCHITECTURE-DECISIONS-V2.md` |
| Backend: Supabase, Claude, Vercel (earlier) | deprecated | `research/RECORD-ARCHITECTURE-DECISIONS.md` |
| Canvas: Konva.js chosen | accepted | `research/RECORD-ARCHITECTURE-DECISIONS-V2.md`, `research/IDENTIFY-TRADEOFFS-V2.md` |
| AI: Groq chosen | accepted | `research/RECORD-ARCHITECTURE-DECISIONS-V2.md` |
| Deployment: Render + Firebase | accepted | `research/RECORD-ARCHITECTURE-DECISIONS-V2.md`, `operations/DEPLOYMENT.md` |
| Tradeoffs (current stack) | accepted | `research/IDENTIFY-TRADEOFFS-V2.md` |
