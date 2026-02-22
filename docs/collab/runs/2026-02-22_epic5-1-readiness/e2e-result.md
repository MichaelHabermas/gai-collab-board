# E2E Result — Epic 5.1 Readiness

**Run:** 2026-02-22 (post Epic 5.2 decoupling)
**Command:** `bun run test:e2e`

## Summary

| Result | Count |
|--------|--------|
| Passed | 78 |
| Failed | 50 |
| Skipped | 14 |
| **Total** | **142** |

## Functional Gate

- [ ] **Full `bun run test:e2e` passes** — 50 failures remain; migration-relevant specs (shapeDrag, connectorCreation, marqueeSelection, stickyTextEdit, undoRedoDrag, etc.) still failing on chromium and firefox.

## Failure Categories

1. **Migration-relevant interaction specs** — alignmentGuides, connectorCreation, connectorEndpointDrag, drawingTools, frameReparenting, frameTitleEdit, lineResizeRotate, marqueeSelection, multiSelectDrag, shapeDrag, shapeResize, shapeRotate, singleSourceUndoRedo, snapToGridDrag, stickyTextEdit, textOverlayStability, undoRedoDrag.
2. **Benchmarks** — FPS, MVP benchmarks (environment/timing sensitive).
3. **Guest board / sidebar** — guest board does not appear in boards list (product or env).

## Next Steps

- Triage failures: product regressions vs environment/timing flakes.
- Fix product regressions in imperative Konva paths (commit, selection, overlay).
- Re-run E2E until functional gate passes.
