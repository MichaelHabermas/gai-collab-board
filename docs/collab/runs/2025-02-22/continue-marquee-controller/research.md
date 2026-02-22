# Research — Continue Marquee Controller

## Done vs Pending (Wave 4 / Epic 3)

| Item | Status | Evidence |
|------|--------|----------|
| T15 DragCoordinator | Done | src/canvas/drag/DragCoordinator.ts, DragCoordinator.test.ts |
| T16 StageEventRouter + ShapeEventWiring | Done | StageEventRouter.ts, ShapeEventWiring.ts + unit tests |
| T17 DrawingController | Pending | Not in repo |
| T17 MarqueeController | Pending | Not in repo |
| T17 ConnectorController | Pending | Not in repo |
| T18 TextEditController | Pending | Not in repo |
| T19 OverlayManager | Pending | Not in repo |

## Contradictions (docs / tasks / code)

- None. Tasks ledger matches V5 and orchestration; code matches "9/11" (event wiring + drag coordinator done).

## Recommended Next Smallest Action

- **Implement MarqueeController** (closure-based, ~80 LOC): provides `onMarqueeStart`, `onMarqueeMove`, `onMarqueeEnd` expected by StageEventRouter (marquee controller interface). Use an injected marquee-overlay interface (show/update/hide rect) so OverlayManager is not required yet. **Scope: 2 files** — src/canvas/events/MarqueeController.ts + tests/unit/MarqueeController.test.ts.
