# Research — continue-overlay-manager-scaffold

**Run:** 2026-02-22_15-30-00  
**Depth:** standard  
**Strict:** true  

## Done vs pending (active wave / Epic 4)

| Item | Doc/ledger | Code | Status |
|------|------------|------|--------|
| E0 | Done | Constitution, baselines, 13 E2E | done |
| E1 | Done | 7 factories, types, registry | done |
| E2 | Done | LayerManager, KonvaNodeManager, SelectionSyncController | done |
| E3 | 11/11 | StageEventRouter, ShapeEventWiring, DragCoordinator, controllers, TextEditController | done |
| E4 — TransformerManager | Done | TransformerManager.ts + test | done |
| E4 — GridRenderer | Done | GridRenderer.ts + test | done |
| E4 — SelectionDragHandle | Done | SelectionDragHandle.ts + test | done |
| **E4 — OverlayManager** | **Pending** | **Missing** | **pending** |
| E5, E6 | Not started | — | not started |

## Contradictions (docs / tasks / code drift)

- **None.** V5 Actual status, Orchestration Wave 4/5, and `.claude/tasks.md` all state that OverlayManager (T19/IK19) is not implemented and is the remaining Epic 4 gap.

## Recommended next smallest action

**Implement OverlayManager scaffold (T19 first step):**

- **What:** Add `src/canvas/OverlayManager.ts` as a class with constructor(overlayLayer), `destroy()`, and stub implementations for all five subsystem APIs (marquee, guides, drawing preview, cursors, connection anchors) so the file compiles and satisfies the V5 §10 interface. Add `tests/unit/OverlayManager.test.ts` that instantiates with a mock layer and calls `destroy()` (and optionally each public method) to verify no throw.
- **Why smallest:** T19 is the only remaining Epic 4 item; full 5-subsystem implementation is ~250 LOC and would exceed a single “smallest step.” A scaffold is one verified step (2 files, scope cap compliant) and unblocks future steps (e.g. wiring from DragCoordinator, DrawingController, MarqueeController).
- **Scope cap:** 2 files (OverlayManager.ts, OverlayManager.test.ts). No changes to existing canvas modules in this step.
