## 2026-02-22_14-28-10 continue-dblclick-wire-ik18

# PRD — Wire dblclick to TextEditController.open, set IK18 done

## One-sentence objective

Wire dblclick in ShapeEventWiring to TextEditController.open via optional `config.textEditController`, then set IK18 to done in `.claude/tasks.md` after review/merge.

## In scope

1. `IShapeEventConfig` gains optional `textEditController?: ITextEditController`.
2. dblclick handler calls `config.textEditController?.open(objectId) ?? config.openTextEdit(objectId)`.
3. `.claude/tasks.md` IK18 status → done and notes updated.

## Out of scope

- OverlayManager (T19), Epic 5 orchestration (useCanvasSetup, BoardCanvas replacement).
- New files beyond the 1–2 (or 3 with test) changed.
- Any change to TextEditController or canvas overlay libs.

## Binary acceptance criteria

- [x] When `wireEvents` is called with `config.textEditController` set, triggering dblclick on the node calls `textEditController.open(objectId)`.
- [x] When only `config.openTextEdit` is set, behavior unchanged (existing test passes).
- [x] IK18 in `.claude/tasks.md` is **done** with a short reconciliation note (artifact + validate).

## 2026-02-22_14-37-29 continue-epic3-checkpoint

# PRD — Record Epic 3 completion checkpoint

## One-sentence objective

Record Epic 3 completion checkpoint in IMPERATIVE-KONVA-MIGRATION-V5.md by checking the “Completion checkpoint recorded” box and adding an artifact link note.

## In scope

1. V5 Epic 3 Definition of Done: change `[ ]` to `[x]` for “Completion checkpoint recorded... before Epic 5 begins” and add one-line “where recorded” note.
2. Optionally: Orchestration Wave 4 status line (T18 done explicitly).

## Out of scope

- Code changes; T19; Epic 5/6; any other checkboxes or waves.

## Binary acceptance criteria

- [ ] Epic 3 “Completion checkpoint recorded” checkbox in V5 is `[x]` with a short artifact note (tasks.md IK16–IK18 + run/validate).
- [ ] No other sections of V5 or Orchestration modified except the optional Wave 4 T18 line.
- [ ] Scope: 1 or 2 files only.

## 2026-02-22_15-30-00 continue-overlay-manager-scaffold

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

## 2026-02-22_16-00-00 continue-overlay-guides

# PRD — OverlayManager alignment-guides subsystem

**Run:** 2026-02-22_16-00-00

## One-sentence objective

Implement the alignment-guides subsystem in OverlayManager so that `updateGuides(guides)` creates/updates/removes Konva guide lines on the overlay layer, matching the behavior of the existing AlignmentGuidesLayer component.

## In scope

- `OverlayManager.updateGuides(guides: IAlignmentGuides | null)`: when null or both arrays empty, remove existing guide nodes; when non-empty, create Konva.Group with Konva.Line children for each horizontal and vertical value (vertical: points [x, -50000, x, 50000]; horizontal: points [-50000, y, 50000, y]); stroke `#3b82f6`, strokeWidth 1, dash [4, 4]; listening false. Reuse one guides group and replace its children when guides change.
- `destroy()`: destroy the guides group if present, then clear overlay layer ref.
- `OverlayManager.test.ts`: add tests that updateGuides(null) and updateGuides({ horizontal: [10], vertical: [20] }) do not throw and (where testable) result in correct node counts or structure.

## Out of scope

- Theme-aware guide color; theme injection; other subsystems (marquee, drawing, cursors, anchors).
- Changes to alignmentEngine, DragCoordinator, or any file other than OverlayManager.ts and OverlayManager.test.ts.

## Binary acceptance criteria

1. **AC1:** `updateGuides(null)` and `updateGuides({ horizontal: [], vertical: [] })` remove any visible guide lines (no nodes or group left for guides).
2. **AC2:** `updateGuides({ horizontal: [100], vertical: [200] })` results in at least one horizontal and one vertical line on the overlay layer (or in the manager’s guides group) with the expected geometry (extent ±50000, dash [4,4]).
3. **AC3:** Calling `updateGuides` with new values replaces previous guides (no accumulation of stale lines).
4. **AC4:** `destroy()` removes guide nodes and does not throw.
5. **AC5:** Only 2 files modified: `src/canvas/OverlayManager.ts`, `tests/unit/OverlayManager.test.ts`. `bun run validate` passes.

## 2026-02-22_17-00-00 continue-overlay-marquee

# PRD — OverlayManager marquee subsystem

**Run:** 2026-02-22_17-00-00

## One-sentence objective

Implement the marquee subsystem in OverlayManager so that showMarquee/updateMarquee/hideMarquee create, update, and remove a selection rect on the overlay layer, matching SelectionLayer behavior.

## In scope

- `showMarquee()`: no-op (V5 API has no args; callers use updateMarquee with visible rect).
- `updateMarquee(rect: ISelectionRect)`: if !rect.visible, remove marquee node if any; else set/create one Konva.Rect with x = min(x1,x2), y = min(y1,y2), width = abs(x2-x1), height = abs(y2-y1), fill rgba(59,130,246,0.1), stroke #3b82f6, strokeWidth 1, dash [4,4], listening false.
- `hideMarquee()`: remove marquee node if any.
- `destroy()`: destroy marquee rect before clearing layer ref.
- `OverlayManager.test.ts`: add tests for updateMarquee(visible rect), updateMarquee(!visible), hideMarquee, destroy cleans marquee.

## Out of scope

- Theme-aware color; other subsystems; changes outside OverlayManager.ts and OverlayManager.test.ts.

## Binary acceptance criteria

1. **AC1:** updateMarquee({ visible: false, ... }) or hideMarquee() removes the marquee rect (no node left).
2. **AC2:** updateMarquee({ visible: true, x1: 0, y1: 0, x2: 100, y2: 50 }) results in one Rect on the layer with x=0, y=0, width=100, height=50 (or equivalent from min/abs).
3. **AC3:** destroy() removes marquee node and does not throw.
4. **AC4:** Only 2 files modified; bun run validate passes.
