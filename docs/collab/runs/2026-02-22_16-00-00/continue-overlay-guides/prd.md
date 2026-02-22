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
