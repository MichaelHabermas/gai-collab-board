# Research — continue-overlay-guides

**Run:** 2026-02-22_16-00-00

## Done vs pending (Epic 4 / OverlayManager)

| Item | Status |
|------|--------|
| OverlayManager scaffold | Done (continue-overlay-manager-scaffold) |
| Alignment guides subsystem | Pending — updateGuides is stub |
| Marquee, drawing preview, cursors, connection anchors | Pending (stubs) |

## Contradictions

None. Docs and code agree: scaffold in place; alignment guides not implemented.

## Recommended next smallest action (Option A)

**Implement the alignment-guides subsystem in OverlayManager.**

- **What:** Implement `updateGuides(guides: IAlignmentGuides | null)` in `OverlayManager.ts`: when `guides` is null or both arrays empty, remove/destroy any existing guide nodes; when non-empty, create Konva Line nodes for each horizontal and vertical position (same geometry as `AlignmentGuidesLayer.tsx`: extent ±50000, stroke 1, dash [4,4], color `#3b82f6`), add to overlay layer. Ensure `destroy()` cleans up guide nodes.
- **Why this subsystem:** Single method; matches existing `IOverlayManagerGuides` used by `alignmentEngine`; no new files—only `OverlayManager.ts` and its test file.
- **Scope:** Max 2 files (`OverlayManager.ts`, `OverlayManager.test.ts`). No changes to alignmentEngine, DragCoordinator, or theme.
