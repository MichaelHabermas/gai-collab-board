# Research Result — Continue ShapeEventWiring Typecheck

## Metadata

- Date: 2025-02-22
- Initiative: Imperative Konva Migration V5 — Collab chain (one smallest step)
- Objective: Re-acquire current state; identify one next smallest verified step.
- Owner: Agent
- Status: Complete

## Scope

- Included: Wave 4 / Epic 3 (StageEventRouter, ShapeEventWiring, tasks ledger, V5 doc Actual status).
- Excluded: T17/T18/T19, RL4/RL5/RL6, other epics.

## Findings

### Done vs pending (active wave: Epic 3)

| Item | Status | Evidence |
|------|--------|----------|
| T15 DragCoordinator | Done | DragCoordinator.ts, DragCoordinator.test.ts |
| T16 StageEventRouter + ShapeEventWiring | Done | StageEventRouter.ts, ShapeEventWiring.ts; both unit test files exist |
| StageEventRouter unit tests | Done | 14 tests in StageEventRouter.test.ts |
| ShapeEventWiring unit tests | Present but typecheck fails | ShapeEventWiring.test.ts — mock type for createDragBoundFunc causes bun run typecheck to fail |
| T17 Drawing/Marquee/Connector controllers | Pending | IK17 reject — files missing |
| T18 TextEditController | Pending | IK18 reject — file missing |
| T19 OverlayManager | Pending | IK19 reject — not in repo |

### Contradictions (docs / tasks / code drift)

- **V5 doc vs tasks/code:** IMPERATIVE-KONVA-MIGRATION-V5.md Actual status table (E3) says "unit tests for StageEventRouter/ShapeEventWiring **pending**". Tasks ledger IK16 and repo: both test files exist; IK16 marked done. Doc is stale; ShapeEventWiring.test.ts has pre-existing typecheck error.
- **Validate vs typecheck:** Previous run noted pre-existing typecheck failure in ShapeEventWiring.test.ts (mock type for createDragBoundFunc). bun run validate cannot be fully green until fixed.

### ReconciliationCheck

| Field | Value |
|-------|--------|
| **canonical_sources** | IMPERATIVE-KONVA-MIGRATION-V5.md (§ Actual status), IMPERATIVE-KONVA-ORCHESTRATION.md (Wave 4), .claude/tasks.md (IK16), tests/unit/ShapeEventWiring.test.ts, src/canvas/events/ShapeEventWiring.ts, src/canvas/drag/DragCoordinator.ts |
| **tasks_drift** | V5 says "unit tests ... pending"; tasks say IK16 done; code has both test files but ShapeEventWiring.test.ts fails typecheck. |
| **resolution_actions** | (1) Fix typecheck in ShapeEventWiring.test.ts. (2) In V5 Actual status E3 cell: change "pending" to "present" for StageEventRouter/ShapeEventWiring unit tests. |
| **proceed_decision** | **clear** — drift well-defined; resolution is one implementation step + one doc line. |

## Recommendation

- **Next smallest action:** Fix typecheck in tests/unit/ShapeEventWiring.test.ts (createDragBoundFunc mock satisfies `(pos: Konva.Vector2d) => Konva.Vector2d`); update docs/IMPERATIVE-KONVA-MIGRATION-V5.md Actual status E3 cell to "unit tests for StageEventRouter/ShapeEventWiring present". Max 2 files; single concern.

## Done Criteria

- [x] Done vs pending table produced
- [x] Contradictions and ReconciliationCheck documented
- [x] One recommended next smallest action defined

## Evidence

- Source: IMPERATIVE-KONVA-MIGRATION-V5.md, IMPERATIVE-KONVA-ORCHESTRATION.md, .claude/tasks.md, repo files listed above.
