# Epic 5 — E2E Run Result

**Date:** 2026-02-22  
**Command:** `bun run test:e2e`

## Result

- **Passed:** 87
- **Failed:** 41
- **Skipped:** 14

## Failure summary

Failures include Epic 0 / migration-relevant specs (e.g. shapeDrag, marqueeSelection, connectorCreation, connectorEndpointDrag, frameReparenting, frameTitleEdit, stickyTextEdit, undoRedoDrag, alignmentGuides, shapeResize, shapeRotate, snapToGridDrag, textOverlayStability, lineResizeRotate, singleSourceUndoRedo) on both chromium and firefox. Likely causes: selectors or timing assumptions tied to BoardCanvas/DOM structure that differ with CanvasHost, or product regressions.

## Implication

Epic 5 **Definition of Done** requires "All E2E tests pass". This run does **not** satisfy that. Epic 5 is **implementation complete** (cutover done, validate passes, LOC within limits) but **not DoD complete** until E2E pass, manual integration checklist, and post-migration baselines are done.
