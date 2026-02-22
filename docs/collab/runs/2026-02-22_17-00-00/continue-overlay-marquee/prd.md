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
