# PRD — OverlayManager scaffold (T19 first step)

**Run:** 2026-02-22_15-30-00

## One-sentence objective

Add an OverlayManager class scaffold with constructor, destroy, and stub methods for all five overlay subsystems so Epic 4 has a compilable, testable placeholder that matches the V5 §10 API.

## In scope

- `src/canvas/OverlayManager.ts`: class holding overlay layer ref; public API per V5 §10 (marquee, guides, drawing preview, cursors, connection anchors); all methods no-op stubs; `destroy()` clears ref and any internal refs.
- `tests/unit/OverlayManager.test.ts`: instantiate with mock Konva.Layer; call `destroy()`; optionally call each public method once to ensure no throw.

## Out of scope

- Full implementation of any subsystem (marquee rect, guide lines, drawing preview, cursors, connection anchors).
- Wiring OverlayManager into LayerManager, useCanvasSetup, DragCoordinator, or controllers.
- Changes to existing canvas files.
- Doc/checkbox updates for T19 completion (scaffold only).

## Binary acceptance criteria

1. **AC1:** `src/canvas/OverlayManager.ts` exists, exports class `OverlayManager` with constructor(overlayLayer: Konva.Layer), `destroy()`, and the following methods with correct signatures (bodies may be no-op): `showMarquee`, `updateMarquee(rect: ISelectionRect)`, `hideMarquee`, `updateGuides(guides: IAlignmentGuides | null)`, `showDrawingPreview(tool, color)`, `updateDrawingPreview(state, tool, color)`, `hideDrawingPreview`, `updateCursors(cursors, currentUid)`, `updateConnectionNodes(shapeIds, objectsRecord, onNodeClick)`, `highlightAnchor(shapeId, anchor)`, `clearConnectionNodes`.
2. **AC2:** `tests/unit/OverlayManager.test.ts` exists; test instantiates OverlayManager with a mock layer and calls `destroy()`; `bun run test -- tests/unit/OverlayManager.test.ts` passes.
3. **AC3:** File count = 2 (OverlayManager.ts, OverlayManager.test.ts); no other files modified.
4. **AC4:** `bun run validate` passes.
