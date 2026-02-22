# Tarpey Reconcile — Epic 5 Continue

**Mode:** reconcile  
**Preset:** strict  
**Output Dir:** docs/collab/runs/2026-02-22_15-35-31/continue-epic5-reconcile/

---

## 1. Objective

Re-establish current project truth for Epic 5 and confirm proceed_decision before any implementation.

---

## 2. ReconciliationCheck

### canonical_sources

| Source | Evidence |
|--------|----------|
| docs/IMPERATIVE-KONVA-MIGRATION-V5.md | Epic 5 §11: CanvasHost + useCanvasSetup; sub-tasks 1–7; DoD unchecked |
| docs/IMPERATIVE-KONVA-ORCHESTRATION.md | Wave 6: T22, T23, T24; W5-R done |
| src/canvas/ | 27 files: LayerManager, KonvaNodeManager, OverlayManager, TransformerManager, factories, events, drag — no CanvasHost/useCanvasSetup |
| src/App.tsx | Line 20: BoardCanvas import; lines 348–360: <BoardCanvas> usage |
| .claude/tasks.md | IK19, IK20, IK21 done; Epic 5 section added (IK22, IK23, IK24 pending) |

### drift_items (before resolution)

| Item | Doc/Code | Tasks | Resolution |
|------|----------|-------|------------|
| Epic 5 not in task ledger | V5 §11 + Orchestration Wave 6 define T22–T24 | No IK22/IK23/IK24 | **Resolved:** Epic 5 section added to .claude/tasks.md |

### resolution_actions (applied)

1. Added Epic 5 section to `.claude/tasks.md` with IK22, IK23, IK24 (pending), dependencies W5-R / IK22 / IK23.
2. No doc checkbox changes (Epic 5 sub-tasks remain unchecked until implementation evidence exists).

### proceed_decision

**clear** — Drift resolved. Task ledger now matches canonical Epic 5 scope. No conflicting claims.

---

## 3. Findings (severity-ordered)

| # | Severity | Finding |
|---|----------|--------|
| 1 | Resolved | Epic 5 tasks were missing from .claude/tasks.md; section added. |
| 2 | Info | RL4–RL9 remain blocked; migration track uses IK tasks, not RL gates for Epic 5. |

---

## 4. Risks and Residual Gaps

- **Risk:** Full E2E/perf proof only at IK24; scaffolding steps (IK22, IK23) do not run E2E.
- **Gap:** useCanvasViewport and other hooks must be verified to work with plain Konva.Stage ref (IStageRefLike) during IK23.

---

## 5. Decision

**clear** — Proceed with Epic 5 implementation loop.

---

## 6. Next Smallest Action

**Create `src/canvas/useCanvasSetup.ts` scaffold (IK22-A):** interfaces `ICanvasSetupConfig`, `ICanvasSetupReturn`; function `setupCanvas(config)` that creates Konva.Stage, creates LayerManager, returns `{ stage, destroy }` with destroy clearing stage. Single file, ≤80 LOC. Evidence: file exists, `bun run validate` passes.
