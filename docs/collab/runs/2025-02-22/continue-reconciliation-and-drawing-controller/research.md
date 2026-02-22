# Research — Continue Imperative Konva (One Smallest Step)

## ReconciliationCheck

| Field | Value |
|-------|--------|
| **canonical_sources** | docs/IMPERATIVE-KONVA-MIGRATION-V5.md (§0 Actual status, §9 Epic 3), docs/IMPERATIVE-KONVA-ORCHESTRATION.md Wave 4, .claude/tasks.md IK17/IK18/RL6, src/canvas/events/ (code) |
| **tasks_drift** | IK17 said "DrawingController, MarqueeController, ConnectorController not present"; MarqueeController.ts + test present (untracked). V5 §0 and §9 showed MarqueeController missing. |
| **resolution_actions** | 1) tasks.md IK17: note updated to "MarqueeController present (untracked); DrawingController, ConnectorController not present"; status set to in-progress. 2) V5: Actual status E3 → 10/11, §9 item 9 checked, Definition of Done text updated. |
| **proceed_decision** | Clear (resolution applied). |

## Done vs Pending (Epic 3 / Wave 4)

| Item | Status | Evidence |
|------|--------|----------|
| DragCoordinator, dragCommit, alignmentEngine, dragBounds, frameDragReparenting | Done | src/canvas/drag/ |
| StageEventRouter, ShapeEventWiring | Done | src/canvas/events/, unit tests |
| MarqueeController | Done | src/canvas/events/MarqueeController.ts, tests/unit/MarqueeController.test.ts |
| DrawingController | Done (this run) | src/canvas/events/DrawingController.ts, tests/unit/DrawingController.test.ts |
| ConnectorController | Pending | Not in repo |
| TextEditController | Pending | Not in repo |
| OverlayManager (Epic 4) | Pending | T19 not implemented |

## Contradictions Resolved

- Tasks and V5 previously stated MarqueeController "missing"; code had it. Ledger and V5 updated to reflect MarqueeController done.

## Recommended Next Smallest Action

- Next run: Implement ConnectorController.ts + unit test (or TextEditController), then reconcile V5 §9 and tasks accordingly.
