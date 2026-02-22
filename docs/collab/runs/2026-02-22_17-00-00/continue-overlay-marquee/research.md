# Research — continue-overlay-marquee

**Run:** 2026-02-22_17-00-00

## Done vs pending (OverlayManager subsystems)

| Subsystem | Status |
|-----------|--------|
| Alignment guides | Done (continue-overlay-guides) |
| **Marquee** | **Pending** — showMarquee, updateMarquee, hideMarquee stubs |
| Drawing preview, cursors, connection anchors | Pending |

## Contradictions

None.

## Recommended next smallest action

**Implement the marquee subsystem in OverlayManager.**

- **What:** Implement `showMarquee()`, `updateMarquee(rect: ISelectionRect)`, `hideMarquee()` in `OverlayManager.ts`. When `rect.visible` and rect has size, create/update a Konva.Rect (x = min(x1,x2), y = min(y1,y2), width = abs(x2-x1), height = abs(y2-y1)); fill rgba(59,130,246,0.1), stroke #3b82f6, strokeWidth 1, dash [4,4], listening false (matching SelectionLayer). When !visible or hideMarquee(), remove the rect. showMarquee() per V5 has no args—no-op or idempotent ready state.
- **Why:** Single subsystem; one rect node; same pattern as guides. Max 2 files: OverlayManager.ts, OverlayManager.test.ts.
- **Scope:** No new files; no theme; no other subsystems.
