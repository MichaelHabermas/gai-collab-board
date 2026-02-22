# Documentation Reorganization Plan

**Date:** 2026-02-22  
**Branch:** agent/docs-reorganization  
**Status:** Plan complete — execution in progress

---

## 1. Executive Summary

The `docs/` folder has grown organically with **72 files** across **15+ top-level folders**. Issues identified:

- **Case inconsistency:** `Optimization/` vs `optimization/` (INDEX references lowercase but folder is PascalCase)
- **Duplication:** research/PRD-V1, PRD-V2, phases/version-2/PRD-V1, PRD-V2, DESIGN-DOCUMENT — overlapping content
- **Scattered plans:** `action-plans/`, `plans/`, root-level IMPERATIVE-KONVA-*, TOOL_EXPANSION_PLAN
- **Orphan references:** INDEX.md cites `TOOL_EXPANSION_PLAN.md` at root but file lives in `action-plans/`
- **Broken paths:** phases/version-2 references `../../PRD.md` (product) and `../../DEPLOYMENT.md` (operations)
- **Historical cruft:** research/ has V1/V2 pairs; phases/version-2 has PRD-V1, PRD-V2, PRD (3 PRD variants)
- **Reports location:** agent-transcript-report.md in INDEX under `reports/` but glob shows it at `reports/agent-transcript-report.md` — verify

---

## 2. Proposed Structure

```
docs/
├── INDEX.md                    # Master index (keep, update)
├── CONSTITUTION.md             # Governance (keep at root)
│
├── guides/                     # Technology guides (keep as-is)
│   ├── README.md
│   ├── AI-INTEGRATION-GUIDE.md
│   ├── AI-TROUBLESHOOTING.md
│   ├── DEVELOPMENT-ENVIRONMENT-GUIDE.md
│   ├── FIREBASE-GUIDE.md
│   ├── KONVA-REACT-GUIDE.md
│   ├── TAILWIND-SHADCN-GUIDE.md
│   └── TESTING-GUIDE.md
│
├── product/                    # Product requirements (consolidate)
│   ├── PRD.md                  # Single source of truth
│   └── PRD-UNCHECKED-TRACKER.md
│
├── architecture/               # NEW: ADRs, design, tradeoffs (from research/)
│   ├── ADR.md                  # Renamed from RECORD-ARCHITECTURE-DECISIONS-V2
│   ├── DESIGN-DOCUMENT.md      # From research/ (original design)
│   ├── TRADEOFFS.md            # Consolidated from IDENTIFY-TRADEOFFS-V2
│   └── TECH-STACK.md           # Consolidated from TECH-STACK-OPTIONS-V2
│
├── architecture/archive/      # Historical, deprecated
│   ├── ADR-V1.md              # RECORD-ARCHITECTURE-DECISIONS (Supabase/Claude)
│   ├── TRADEOFFS-V1.md         # IDENTIFY-TRADEOFFS
│   ├── TECH-STACK-V1.md        # TECH-STACK-OPTIONS
│   ├── PRD-V1.md               # research/PRD-V1
│   └── PRD-V2.md               # research/PRD-V2
│
├── roadmap/                    # NEW: v2, phases, status (consolidate phases + status)
│   ├── V2-PRD.md               # phases/version-2/PRD.md (final v2 spec)
│   ├── V2-FEATURES.md          # phases/version-2/FEATURES.md
│   ├── V2-DESIGN.md            # phases/version-2/DESIGN-DOCUMENT.md
│   ├── V2-STATUS.md            # CollabBoard-v2-Status-Report.md
│   └── archive/
│       ├── V2-PRD-V1.md        # phases/version-2/PRD-V1
│       └── V2-PRD-V2.md        # phases/version-2/PRD-V2
│
├── migrations/                 # NEW: Major migration plans (imperative Konva, etc.)
│   ├── IMPERATIVE-KONVA-V5.md  # Main migration spec
│   ├── IMPERATIVE-KONVA-ORCHESTRATION.md
│   └── IMPERATIVE-KONVA-V5-FOLLOW-UP.md
│
├── plans/                      # Consolidated: action-plans + plans
│   ├── state/
│   │   ├── STATE-IMPROVEMENT-PLAN.md
│   │   ├── STATE-MANAGEMENT-PLAN-2.md
│   │   └── STATE-MGMT-REVIEWER-CHECKLIST.md
│   ├── TOOL-EXPANSION-PLAN.md  # Implemented; keep for reference
│   ├── GUEST-BOARD.md
│   ├── AI-CHAT-IMPROVEMENT-PLAN.md
│   ├── PLAN-frame-ux-overhaul.md
│   ├── PLAN-frame-grouping.md
│   ├── hook-dependency-cleanup.md
│   ├── ai-agent-test-suite-prompt.md
│   └── archive/
│       └── EARLY-SUBMISSION-AUDIT.md  # Typo fix: SUBMISION → SUBMISSION
│
├── performance/                # Performance + optimization (merge Optimization into performance)
│   ├── PERFORMANCE-LOG.md
│   ├── OPTIMIZATION-PLAN.md     # Final cumulative (from Optimization/)
│   ├── USE-EFFECT-CENSUS.md     # From Optimization/
│   ├── last-run-metrics.json
│   ├── metrics-history.json
│   └── archive/
│       ├── OPTIMIZATION-PLAN-1.md
│       ├── OPTIMIZATION-PLAN-2.md
│       ├── OPTIMIZATION-PLAN-3.md
│       ├── OPTIMIZATION-WAVE-4.md
│       ├── OPTIMIZATION-WAVE-5.md
│       ├── Performance-Implementation-Plan.md
│       ├── Performance-Analysis-Report.md
│       ├── UX-PERFORMANCE-DEEP-DIVE.md
│       └── Collabboard-Performance-Deep-Dive.md
│
├── perf-baselines/              # Keep (referenced by migration)
│   ├── README.md
│   └── pre-migration.json
│
├── operations/                  # Keep as-is
│   ├── DEPLOYMENT.md
│   └── RELEASE-AUTOMATION.md
│
├── planning/                   # AI dev logs, cost, UX (keep)
│   ├── AI-COST-ANALYSIS.md
│   ├── AI-DEVELOPMENT-LOG.md
│   ├── AI-SESSION-LOG.md
│   └── UI-UX-IMPROVEMENT-PLAN.md
│
├── reports/                    # Audits, matrices (keep)
│   ├── agent-transcript-report.md
│   ├── mvp-audit-matrix.md
│   ├── mvp-audit-report.md
│   └── refactor-audit/
│       ├── REFACTOR_AUDIT_REPORT.md
│       └── TYPE_MIGRATION_CHECKLIST.md
│
├── theme/                      # Keep as-is
│   ├── THEME-VISUAL-GUIDE.md
│   └── theme-screenshots/
│       └── README.md
│
└── research/                   # REMOVE after migration — content moved to architecture/archive
    └── (delete folder; PRE-SEARCH-DOCUMENT.md → roadmap/archive, PRE-SEARCH-CHECKLIST-MGH.pdf → archive or delete)
```

---

## 3. Key Changes

### 3.1 Consolidate research/ into architecture/

- **RECORD-ARCHITECTURE-DECISIONS-V2.md** → **architecture/ADR.md** (current ADR)
- **RECORD-ARCHITECTURE-DECISIONS.md** → **architecture/archive/ADR-V1.md** (deprecated)
- **IDENTIFY-TRADEOFFS-V2.md** → **architecture/TRADEOFFS.md**
- **IDENTIFY-TRADEOFFS.md** → **architecture/archive/TRADEOFFS-V1.md**
- **TECH-STACK-OPTIONS-V2.md** → **architecture/TECH-STACK.md**
- **TECH-STACK-OPTIONS.md** → **architecture/archive/TECH-STACK-V1.md**
- **DESIGN-DOCUMENT.md** → **architecture/DESIGN-DOCUMENT.md**
- **PRD-V1.md**, **PRD-V2.md** → **architecture/archive/** (historical; product/PRD.md is source of truth)

### 3.2 Consolidate phases/version-2/ into roadmap/

- **PRD.md** → **roadmap/V2-PRD.md**
- **FEATURES.md** → **roadmap/V2-FEATURES.md**
- **DESIGN-DOCUMENT.md** → **roadmap/V2-DESIGN.md**
- **PRD-V1.md**, **PRD-V2.md** → **roadmap/archive/**
- **CollabBoard-v2-Status-Report.md** (root) → **roadmap/V2-STATUS.md**
- **PRE-SEARCH-DOCUMENT.md** → **roadmap/archive/** (or keep in research/archive if needed)

### 3.3 Consolidate Optimization/ into performance/

- **Optimization/** (PascalCase) → **performance/** (merge)
- **OPTIMIZATION-PLAN.md** → **performance/OPTIMIZATION-PLAN.md** (canonical)
- **USE-EFFECT-CENSUS.md** → **performance/USE-EFFECT-CENSUS.md**
- All other Optimization/*.md → **performance/archive/**

### 3.4 Consolidate action-plans/ and plans/ into plans/

- **action-plans/** + **plans/** → single **plans/** folder
- State plans in **plans/state/**
- Fix EARLY-SUBMISION-AUDIT → EARLY-SUBMISSION-AUDIT (typo)

### 3.5 Migrations folder for imperative Konva

- **IMPERATIVE-KONVA-MIGRATION-V5.md** → **migrations/IMPERATIVE-KONVA-V5.md**
- **IMPERATIVE-KONVA-ORCHESTRATION.md** → **migrations/IMPERATIVE-KONVA-ORCHESTRATION.md**
- **IMPERATIVE-KONVA-MIGRATION-V5-FOLLOW-UP.md** → **migrations/IMPERATIVE-KONVA-V5-FOLLOW-UP.md**

### 3.6 Fix product/ PRD references

- **product/PRD.md** stays; fix all `../PRD.md` → `product/PRD.md` or `../product/PRD.md` in moved files
- **DEPLOYMENT.md** lives in **operations/**; fix `../../DEPLOYMENT.md` → `../operations/DEPLOYMENT.md`

---

## 4. Reference Updates Required

After moves, update internal links in:

- **CONSTITUTION.md** — references STATE-MANAGEMENT-PLAN-2, STATE-IMPROVEMENT-PLAN
- **CLAUDE.md** — references docs/CONSTITUTION.md, docs paths
- **phases/version-2/PRD.md** (→ roadmap/V2-PRD.md) — many `../../` links to guides, PRD, DEPLOYMENT
- **action-plans/STATE-MANAGEMENT-PLAN-2.md** — docs/CONSTITUTION, docs/STATE-IMPROVEMENT-PLAN
- **IMPERATIVE-KONVA-MIGRATION-V5.md** — STATE-MANAGEMENT-PLAN-2, perf-baselines
- **guides/README.md** — Related Documents point to research/ (→ architecture/)
- **INDEX.md** — full rewrite of paths and categories

---

## 5. Files to Remove (Archive or Delete)

| File | Action |
|------|--------|
| research/PRE-SEARCH-CHECKLIST-MGH.pdf | Move to roadmap/archive or docs/archive/ |
| docs/G4 Week 1 - CollabBoard.pdf | Referenced but may not exist; skip if missing |
| Duplicate PRD variants | Archive, don't delete (historical value) |

---

## 6. Execution Order

1. Create new folders: architecture/, architecture/archive/, roadmap/, roadmap/archive/, migrations/, plans/state/, plans/archive/, performance/archive/
2. Move research/ → architecture/ (with renames)
3. Move phases/version-2/ → roadmap/ (with renames)
4. Move root IMPERATIVE-KONVA-* → migrations/
5. Move action-plans/ → plans/ (merge with plans/)
6. Move Optimization/ → performance/ (merge)
7. Move CollabBoard-v2-Status-Report.md → roadmap/V2-STATUS.md
8. Fix all internal links
9. Delete empty research/, phases/, action-plans/, Optimization/
10. Update INDEX.md
11. Update .cursor/rules if any reference docs paths

---

## 7. Verification

- [ ] `bun run validate` passes
- [ ] No broken links (grep for `](../` and `](docs/` to verify)
- [ ] INDEX.md has correct count and all files listed
- [ ] CONSTITUTION.md, CLAUDE.md references valid
