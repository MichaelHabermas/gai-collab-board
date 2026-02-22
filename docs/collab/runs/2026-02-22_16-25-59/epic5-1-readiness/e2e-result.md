# Epic 5.1 — Full E2E Result

- **Command:** `bun run test:e2e`
- **Date:** 2026-02-22
- **Result:** **failed**
- **Summary:** 85 passed, 43 failed, 14 skipped
- **Raw output:** `C:\Users\haber\.cursor\projects\c-Users-haber-repos-Gauntlet-gai-collab-board\agent-tools\5d7fdee5-c25d-4da8-93f2-7b81e01f0da9.txt`

## High-signal failure pattern

- Many failures report object count stuck at `0/0` after create/draw flows.
- This blocks drag, marquee, connector, undo/redo, resize/rotate, text edit, and snap-to-grid scenarios.

## Failed specs (suite-level)

1. `alignmentGuides.spec.ts` (chromium, firefox)
2. `benchmark.spec.ts` (chromium only, 2 tests)
3. `connectorCreation.spec.ts` (chromium, firefox)
4. `connectorEndpointDrag.spec.ts` (chromium, firefox)
5. `frameReparenting.spec.ts` (chromium, firefox)
6. `frameTitleEdit.spec.ts` (chromium)
7. `guest-board.spec.ts` (chromium, firefox)
8. `lineResizeRotate.spec.ts` (chromium, firefox)
9. `marqueeSelection.spec.ts` (chromium, firefox)
10. `multiSelectDrag.spec.ts` (chromium, firefox)
11. `shapeDrag.spec.ts` (chromium, firefox)
12. `shapeResize.spec.ts` (chromium, firefox)
13. `shapeRotate.spec.ts` (chromium, firefox)
14. `singleSourceUndoRedo.spec.ts` (chromium, firefox)
15. `snapToGridDrag.spec.ts` (chromium, firefox)
16. `stickyTextEdit.spec.ts` (chromium, firefox)
17. `textOverlayStability.spec.ts` (chromium, firefox)
18. `undoRedoDrag.spec.ts` (chromium, firefox)

## Gate decision for Epic 5.1 functional check

- **Functional gate:** **BLOCKED** (full E2E is not green).
