# 📚 Documentation Index

> Quick-reference guide for AI agents and LLMs. Use this to locate relevant documentation without loading everything into context. Always check this index FIRST before searching the codebase.

**Last Updated:** 2026-02-22
**Total Documents:** 69 (excluding archive)

## How to Use This Index

1. Scan the categories below to find relevant docs
2. Read the 1-line summary to confirm relevance
3. Only then open the specific file you need
4. If you modify, add, or delete any doc in `docs/`, update this index

---

## 🗂️ Categories

### Guides

| File | Summary | Key Topics |
| --- | ----- | ------ |
| `guides/AI-INTEGRATION-GUIDE.md` | AI provider (Groq), function-calling tools, proxy pattern, API keys server-side | `AI`, `Groq`, `function-calling`, `proxy` |
| `guides/AI-TROUBLESHOOTING.md` | Gemini 429 quota root cause, user-facing error guidance, diagnostics | `AI`, `troubleshooting`, `429`, `quota`, `errors` |
| `guides/DEVELOPMENT-ENVIRONMENT-GUIDE.md` | Bun, Vite, TypeScript setup; directory layout, env vars, ESLint/Prettier, Git | `Bun`, `Vite`, `TypeScript`, `onboarding` |
| `guides/FIREBASE-GUIDE.md` | Firebase Auth, Firestore, Realtime DB, presence, security rules, offline behavior | `Firebase`, `Auth`, `Firestore`, `sync`, `security rules` |
| `guides/KONVA-REACT-GUIDE.md` | Konva.js and react-konva: Stage, Layer, shapes, events, transforms, pan/zoom, performance | `Konva`, `canvas`, `shapes`, `pan/zoom`, `performance` |
| `guides/README.md` | Index of technology guides with quick start and recommended reading order | `guides`, `overview`, `stack` |
| `guides/TAILWIND-SHADCN-GUIDE.md` | Tailwind v4, Shadcn/ui, theming, dark mode, design tokens, animations | `Tailwind`, `Shadcn`, `theming`, `dark mode`, `UI` |
| `guides/TESTING-GUIDE.md` | Vitest, Playwright, testing pyramid, mocking Firebase, coverage, CI | `Vitest`, `Playwright`, `E2E`, `coverage`, `mocking` |

### Governance

| File | Summary | Key Topics |
| --- | ----- | ------ |
| `CONSTITUTION.md` | Inviolable rules for state improvement plan (Epics 1–3): state sovereignty, world coords, repository abstraction, AI interface, migration safety, performance, testing, backward compatibility | `constitution`, `state improvement`, `governance`, `rules` |

### Architecture

| File | Summary | Key Topics |
| --- | ----- | ------ |
| `architecture/ADR.md` | Current ADR: Firebase, React/Vite/Bun/Shadcn/Konva/Tailwind, Groq, Render; rationale and alternatives | `ADR`, `Firebase`, `architecture`, `decisions` |
| `architecture/DESIGN-DOCUMENT.md` | Original CollabBoard design: hard requirements, tech stack, high-level architecture, vision | `design`, `requirements`, `MVP`, `architecture` |
| `architecture/TRADEOFFS.md` | Structured tradeoffs: what was gained and given up per technology choice (current stack) | `tradeoffs`, `Firebase`, `Konva`, `Render` |
| `architecture/TECH-STACK.md` | Chosen stack with pros/cons per layer; concise "what we use and why" | `tech stack`, `Firebase`, `Render`, `rationale` |

### Product

| File | Summary | Key Topics |
| --- | ----- | ------ |
| `product/PRD.md` | Root PRD: CollabBoard scope, MVP/full requirements, tech stack, architecture, multi-drop reconciliation | `PRD`, `MVP`, `requirements`, `scope`, `architecture`, `multi-drop`, `flicker` |
| `product/PRD-UNCHECKED-TRACKER.md` | Maps unchecked PRD items to implementation and test evidence (E2E, unit, manual) | `PRD`, `tracker`, `evidence`, `Epic 3`, `Epic 5` |

### Roadmap (v2)

| File | Summary | Key Topics |
| --- | ----- | ------ |
| `roadmap/V2-PRD.md` | Final v2 PRD: single source for execution (EPICs, stories, features, branches, commits) | `v2`, `PRD`, `execution`, `scope` |
| `roadmap/V2-FEATURES.md` | Top 20 v2 features with description, acceptance criteria, technical notes, dependencies | `v2`, `features`, `acceptance criteria`, `build order` |
| `roadmap/V2-DESIGN.md` | v2 design principles, EPICs, user stories, module alignment; agile breakdown | `v2`, `EPICs`, `user stories`, `SOLID`, `design` |
| `roadmap/V2-STATUS.md` | v2 project status report: feature completion, verification status | `v2`, `status`, `features`, `Epics` |

### Migrations

| File | Summary | Key Topics |
| --- | ----- | ------ |
| `migrations/IMPERATIVE-KONVA-V5.md` | Imperative Konva migration plan: replace react-konva with KonvaNodeManager, Epics 0–6 | `Konva`, `migration`, `imperative`, `CanvasHost`, `performance` |
| `migrations/IMPERATIVE-KONVA-ORCHESTRATION.md` | Orchestration plan for imperative Konva migration: branching, dependencies, SOLID | `migration`, `orchestration`, `workflow` |
| `migrations/IMPERATIVE-KONVA-V5-FOLLOW-UP.md` | Follow-up: performance baseline capture, schema, Epic 0 details | `baselines`, `performance`, `Epic 0` |

### Plans

| File | Summary | Key Topics |
| --- | ----- | ------ |
| `plans/state/STATE-IMPROVEMENT-PLAN.md` | State orchestration PRD: JSON state, world coords, Firebase sync, AI CRUD | `state`, `Epics`, `Zustand`, `repository` |
| `plans/state/STATE-MANAGEMENT-PLAN-2.md` | State management unification tasks S1–S7: queueObjectUpdate, applyChanges, pagination | `state`, `S1–S7`, `queueObjectUpdate`, `unification` |
| `plans/state/STATE-MGMT-REVIEWER-CHECKLIST.md` | Reviewer checklist for PRs touching S1–S7 | `state`, `review`, `checklist` |
| `plans/TOOL_EXPANSION_PLAN.md` | AI tool expansion: batch ops, compound templates (SWOT, kanban, flowchart), layout engines | `AI`, `tools`, `compound`, `batch` |
| `plans/GUEST-BOARD.md` | Guest board feature plan | `guest`, `board`, `auth` |
| `plans/AI-CHAT-IMPROVEMENT-PLAN.md` | AI chat UX improvements | `AI`, `chat`, `UX` |
| `plans/PLAN-frame-ux-overhaul.md` | Frame tool UX overhaul: visual feedback, title editing, hover states | `frame`, `UX`, `Figma` |
| `plans/PLAN-frame-grouping.md` | Frame object grouping: parentFrameId, containment, reparenting | `frame`, `grouping`, `parentFrameId` |
| `plans/hook-dependency-cleanup.md` | Hook dependency cleanup: function deps, useCallback, dead code audit | `React`, `hooks`, `useEffect`, `useCallback` |
| `plans/ai-agent-test-suite-prompt.md` | AI agent test suite prompt | `AI`, `testing`, `agent` |

### Performance

| File | Summary | Key Topics |
| --- | ----- | ------ |
| `performance/PERFORMANCE_LOG.md` | Task-level performance reviews, metrics schema, optimization history; run `bun run perf:check` | `performance`, `metrics`, `perf:check`, `optimization` |
| `performance/OPTIMIZATION-PLAN.md` | Cumulative optimization plan: de-duplicated tasks, benchmark guardrails, 20% improvement target | `benchmarks`, `FPS`, `sync latency`, `no regression` |
| `performance/USE-EFFECT-CENSUS.md` | Per-file useEffect census: keep/remove/extract/defer with rationale | `useEffect`, `refactor`, `hooks`, `census`, `BoardCanvas` |
| `perf-baselines/README.md` | Pre/post migration performance baselines | `performance`, `baselines`, `Epic 0` |

### Operations

| File | Summary | Key Topics |
| --- | ----- | ------ |
| `operations/DEPLOYMENT.md` | Render + Firebase deployment: static site, SPA rewrites, AI proxy, env vars | `deployment`, `Render`, `Firebase`, `AI proxy`, `SPA` |
| `operations/RELEASE-AUTOMATION.md` | Preflight validation, Firebase rules deploy, AI proxy smoke test, benchmark runs | `release`, `Firebase rules`, `smoke test`, `benchmarks` |

### Planning

| File | Summary | Key Topics |
| --- | ----- | ------ |
| `planning/AI-COST-ANALYSIS.md` | AI cost at scale: dev costs, production projections (100–100K users), Groq assumptions | `AI cost`, `Groq`, `scaling`, `LLM` |
| `planning/AI-DEVELOPMENT-LOG.md` | 1-page AI dev log: tools, MCP usage, prompts, code split, strengths/limitations, learnings, cost | `AI-first`, `Cursor`, `MCP`, `workflow`, `learnings` |
| `planning/AI-SESSION-LOG.md` | Detailed per-session development notes (20+ sessions): scope, implementation, cost, running totals | `sessions`, `cost`, `running totals`, `implementation` |
| `planning/UI-UX-IMPROVEMENT-PLAN.md` | Prioritized UX improvements: share links, theme, panel collapse, balanced scoring, delivery plan | `UX`, `share links`, `theme`, `prioritization`, `P0/P1` |

### Reports

| File | Summary | Key Topics |
| --- | ----- | ------ |
| `reports/agent-transcript-report.md` | Generated report: Cursor agent prompts in time window; run `bun run report:agent-transcripts` | `Cursor`, `agent transcripts`, `prompts` |
| `reports/mvp-audit-matrix.md` | MVP and benchmark criteria vs implementation and test evidence (PASS/PARTIAL/FAIL) | `MVP`, `audit`, `benchmarks`, `evidence matrix` |
| `reports/mvp-audit-report.md` | MVP compliance audit: commands run, code/test additions, results summary | `MVP`, `audit`, `verification`, `benchmarks` |
| `reports/refactor-audit/REFACTOR_AUDIT_REPORT.md` | Phase A refactor audit: hook census, event handlers, pattern analysis, useEffect prevention guidelines | `refactor`, `hooks`, `useEffect`, `audit`, `BoardCanvas` |
| `reports/refactor-audit/TYPE_MIGRATION_CHECKLIST.md` | Type migration patterns: IPosition, IDimensions, bounds, layout types | `types`, `migration`, `IPosition`, `IDimensions`, `checklist` |

### Theme

| File | Summary | Key Topics |
| --- | ----- | ------ |
| `theme/THEME-VISUAL-GUIDE.md` | How to verify theme toggle (light/dark): expected appearance, troubleshooting | `theme`, `dark mode`, `light mode`, `UI verification` |
| `theme/theme-screenshots/README.md` | Placeholder for light-mode and dark-mode reference screenshots | `theme`, `screenshots`, `visual reference` |

### Meta

| File | Summary | Key Topics |
| --- | ----- | ------ |
| `REORGANIZATION-PLAN.md` | Documentation reorganization plan and execution log | `reorganization`, `structure`, `consolidation` |

---

## 🔍 Topic Cross-Reference

| Topic/Keyword | Relevant Docs |
| --- | --- |
| `ADR` | `architecture/ADR.md`, `architecture/archive/ADR-V1.md` |
| `agent transcripts` | `reports/agent-transcript-report.md` |
| `AI` | `guides/AI-INTEGRATION-GUIDE.md`, `guides/AI-TROUBLESHOOTING.md`, `planning/AI-COST-ANALYSIS.md`, `planning/AI-DEVELOPMENT-LOG.md`, `planning/AI-SESSION-LOG.md`, `product/PRD.md` |
| `audit` | `reports/mvp-audit-report.md`, `reports/mvp-audit-matrix.md`, `reports/refactor-audit/REFACTOR_AUDIT_REPORT.md` |
| `benchmarks` | `performance/OPTIMIZATION-PLAN.md`, `reports/mvp-audit-matrix.md`, `operations/RELEASE-AUTOMATION.md` |
| `canvas` | `guides/KONVA-REACT-GUIDE.md`, `product/PRD.md` |
| `constitution` | `CONSTITUTION.md` |
| `deployment` | `operations/DEPLOYMENT.md`, `operations/RELEASE-AUTOMATION.md` |
| `Firebase` | `guides/FIREBASE-GUIDE.md`, `architecture/ADR.md`, `architecture/TECH-STACK.md` |
| `governance` | `CONSTITUTION.md` |
| `FPS` | `performance/OPTIMIZATION-PLAN.md`, `performance/PERFORMANCE_LOG.md` |
| `Konva` | `guides/KONVA-REACT-GUIDE.md`, `architecture/TRADEOFFS.md`, `migrations/IMPERATIVE-KONVA-V5.md` |
| `MVP` | `product/PRD.md`, `reports/mvp-audit-report.md`, `reports/mvp-audit-matrix.md`, `architecture/DESIGN-DOCUMENT.md` |
| `performance` | `performance/PERFORMANCE_LOG.md`, `performance/OPTIMIZATION-PLAN.md` |
| `PRD` | `product/PRD.md`, `product/PRD-UNCHECKED-TRACKER.md`, `roadmap/V2-PRD.md` |
| `state improvement` | `CONSTITUTION.md`, `plans/state/STATE-IMPROVEMENT-PLAN.md` |
| `theme` | `theme/THEME-VISUAL-GUIDE.md`, `theme/theme-screenshots/README.md`, `planning/UI-UX-IMPROVEMENT-PLAN.md`, `guides/TAILWIND-SHADCN-GUIDE.md` |
| `tradeoffs` | `architecture/TRADEOFFS.md` |
| `useEffect` | `performance/USE-EFFECT-CENSUS.md`, `performance/OPTIMIZATION-PLAN.md`, `reports/refactor-audit/REFACTOR_AUDIT_REPORT.md` |
| `v2` | `roadmap/V2-PRD.md`, `roadmap/V2-FEATURES.md`, `roadmap/V2-DESIGN.md`, `roadmap/V2-STATUS.md` |
| `Zustand` | `performance/OPTIMIZATION-PLAN.md`, `plans/state/STATE-MANAGEMENT-PLAN-2.md` |

---

## 🧭 Decision Quick-Lookup

| Decision | Status | Doc |
| --- | ------ | ----- |
| Backend: Firebase vs Supabase | accepted | `architecture/ADR.md` |
| Canvas: Konva.js chosen | accepted | `architecture/ADR.md`, `architecture/TRADEOFFS.md` |
| AI: Groq chosen | accepted | `architecture/ADR.md` |
| Deployment: Render + Firebase | accepted | `architecture/ADR.md`, `operations/DEPLOYMENT.md` |
| Tradeoffs (current stack) | accepted | `architecture/TRADEOFFS.md` |

---

## 📁 Archive Folders

Historical documents are in `architecture/archive/`, `roadmap/archive/`, `plans/archive/`, and `performance/archive/`. These are kept for reference but are not part of the active documentation set.
