# PRD — OverlayManager remote cursors subsystem

**Run:** 2026-02-22_20-00-00 continue-overlay-cursors

## One-sentence objective

Implement OverlayManager.updateCursors so remote cursors (excluding current user) are rendered on the overlay layer as Konva nodes matching CursorLayer behavior, and destroy() cleans up the cursor group.

## In scope

- `OverlayManager.updateCursors(cursors, currentUid)`: filter to other users, destroy existing cursor group, create Konva.Group (listening: false, name: 'cursors'), for each cursor add a Group at (x,y) with Circle (radius 6, fill color, stroke white, shadow) and two Text nodes for displayName label; add group to layer; batchDraw.
- `OverlayManager.destroy()`: destroy cursorsGroup if present before clearing overlay ref.
- `OverlayManager.test.ts`: tests for updateCursors (adds nodes for other cursors, skips currentUid, empty cursors adds nothing, destroy cleans cursor group); relax Konva mock so Group name can be 'cursors' or 'alignment-guides'.

## Out of scope

- Connection anchors; Epic 5 wiring; doc/checkbox updates.

## Binary acceptance criteria

- [ ] updateCursors with other users adds a cursors group to the layer with one child group per other cursor.
- [ ] updateCursors filters out currentUid (no node for self).
- [ ] updateCursors with empty or only-currentUid cursors removes existing cursor group and does not add nodes.
- [ ] destroy() destroys the cursor group when present.
- [ ] Only 2 files changed: OverlayManager.ts, OverlayManager.test.ts. bun run validate passes.
