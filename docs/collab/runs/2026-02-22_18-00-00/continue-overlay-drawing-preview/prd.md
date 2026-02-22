# PRD — OverlayManager Drawing Preview

**One-sentence objective:** Implement the drawing-preview subsystem in OverlayManager so that rectangle, circle, line, and frame tools show a live dashed preview during draw, matching the behavior of useShapeDrawing’s renderDrawingPreview.

---

## In scope

- `OverlayManager.ts`: implement `showDrawingPreview(tool, color)`, `updateDrawingPreview(state, tool, color)`, `hideDrawingPreview()` by creating/updating/destroying a single Konva node (Rect or Line) on the overlay layer.
- Preview shape by tool: rectangle → Rect; circle → Rect with cornerRadius; line → Line (points); frame → Rect with fill and cornerRadius 6.
- Styling: dash [5,5], stroke width 2 for rect/frame/circle; line stroke width 3. Fill/stroke per existing useShapeDrawing (fill = color; stroke = consistent overlay stroke e.g. GUIDE_COLOR).
- Cleanup: `hideDrawingPreview()` and `destroy()` remove the preview node.
- Unit tests: extend `OverlayManager.test.ts` so that show/update/hide drawing preview is covered (add/update node, destroy on hide).

---

## Out of scope

- Cursors subsystem (`updateCursors`).
- Connection anchors (`updateConnectionNodes`, `highlightAnchor`, `clearConnectionNodes`).
- Changes to DrawingController or useShapeDrawing.
- E2E or integration tests in this step.

---

## Binary acceptance criteria

1. **AC1:** `showDrawingPreview(tool, color)` with tool in `rectangle` | `circle` | `line` | `frame` does not throw and allows a subsequent `updateDrawingPreview` to display a visible preview (unit test: node added to layer for at least one tool).
2. **AC2:** `updateDrawingPreview(state, tool, color)` updates the preview geometry (unit test: setAttrs or equivalent called with correct bounds/points for rectangle and line).
3. **AC3:** `hideDrawingPreview()` removes the preview node and leaves no reference (unit test: preview node destroyed; subsequent update does not throw).
4. **AC4:** `destroy()` clears the drawing preview node if present (unit test: no leak; destroy() after showDrawingPreview leaves layer clean).
5. **AC5:** `bun run validate` passes (format, lint, typecheck, unit tests).

---

## Test plan

- Run `bun run test:unit -- tests/unit/OverlayManager.test.ts`.
- Run `bun run validate`.
