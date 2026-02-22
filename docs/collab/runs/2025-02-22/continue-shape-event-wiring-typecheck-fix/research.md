# Research Result — Continue ShapeEventWiring Typecheck Fix

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
| ShapeEventWiring unit tests | Present | ShapeEventWiring.test.ts; typecheck may fail depending on mock typing |
| T17 Drawing/Marquee/Connector controllers | Pending | IK17 reject — files missing |
| T18 TextEditController | Pending | IK18 reject — file missing |
| T19 OverlayManager | Pending | IK19 reject — not in repo |

### Contradictions (docs / tasks / code drift)

- **Code vs validate:** ShapeEventWiring.test.ts uses a mock for IDragCoordinator.createDragBoundFunc. The interface in DragCoordinator.ts is `createDragBoundFunc(objectId: string): (pos: Konva.Vector2d) => Konva.Vector2d`. The test mock must satisfy this type so that `bun run typecheck` passes. If the mock’s inferred type does not match IDragCoordinator, typecheck fails.
- **V5 Actual status:** E3 cell states “unit tests for StageEventRouter/ShapeEventWiring present”. No doc change required unless we add “typecheck passing” after the fix.

### ReconciliationCheck

| Field | Value |
|-------|--------|
| **canonical_sources** | IMPERATIVE-KONVA-MIGRATION-V5.md (§ Actual status), IMPERATIVE-KONVA-ORCHESTRATION.md (Wave 4), .claude/tasks.md (IK15, IK16, IK17), tests/unit/ShapeEventWiring.test.ts, src/canvas/events/ShapeEventWiring.ts, src/canvas/drag/DragCoordinator.ts |
| **tasks_drift** | None. IK15/IK16 marked done; IK17/IK18/IK19 reject — matches code. Only potential drift is test file typecheck. |
| **resolution_actions** | Ensure typecheck passes for ShapeEventWiring.test.ts (mock satisfies IDragCoordinator). Optionally update V5 E3 cell to note typecheck passes. |
| **proceed_decision** | **clear** — fix is test file (+ optional doc); no tasks/doc conflict. |

## Recommendation

- **Next smallest action:** Ensure typecheck passes for tests/unit/ShapeEventWiring.test.ts (createDragBoundFunc mock satisfies `(pos: Konva.Vector2d) => Konva.Vector2d`). Optionally update docs/IMPERATIVE-KONVA-MIGRATION-V5.md E3 cell. Max 2 files; single concern.

## Done Criteria

- [x] Done vs pending table produced
- [x] Contradictions and ReconciliationCheck documented
- [x] One recommended next smallest action defined

## Evidence

- Source: IMPERATIVE-KONVA-MIGRATION-V5.md, IMPERATIVE-KONVA-ORCHESTRATION.md, .claude/tasks.md, repo files listed above.
