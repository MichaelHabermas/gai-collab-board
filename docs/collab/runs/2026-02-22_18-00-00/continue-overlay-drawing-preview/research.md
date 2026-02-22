# Research — Continue Overlay Drawing Preview

**Mode:** chain (research→prd→implement→review)  
**Objective:** Execute the one next smallest step from current project state.  
**Output dir:** `docs/collab/runs/2026-02-22_18-00-00/continue-overlay-drawing-preview/`

---

## ReconciliationCheck (required before PRD/implement)

| Item | Result |
|------|--------|
| **canonical_sources** | `docs/IMPERATIVE-KONVA-MIGRATION-V5.md` (§Actual status, §10 Epic 4); `docs/IMPERATIVE-KONVA-ORCHESTRATION.md` (Wave 4, T19); `.claude/tasks.md` (IK19); code: `src/canvas/OverlayManager.ts` |
| **tasks_drift** | None. V5 and Orchestration both state E4 partial: OverlayManager scaffold present; marquee + guides done; drawing preview, cursors, connection anchors stubbed. tasks.md IK19 in-progress with same description. |
| **resolution_actions** | None. |
| **proceed_decision** | **clear** |

---

## Done vs Pending (active wave / epic)

**Active:** Epic 4 (OverlayManager T19), Wave 4.

| Item | Status | Evidence |
|------|--------|----------|
| OverlayManager scaffold | Done | `src/canvas/OverlayManager.ts` exists; marquee + guides implemented. |
| Marquee (show/update/hide) | Done | `updateMarquee`, `hideMarquee` with Konva.Rect. |
| Alignment guides | Done | `updateGuides` with Konva.Line group. |
| Drawing preview | Pending | `showDrawingPreview`, `updateDrawingPreview`, `hideDrawingPreview` are stubs. |
| Remote cursors | Pending | `updateCursors` stub. |
| Connection anchors | Pending | `updateConnectionNodes`, `highlightAnchor`, `clearConnectionNodes` stubs. |
| TransformerManager, GridRenderer, SelectionDragHandle | Done | Per V5 §Actual status and orchestration W5. |

---

## Contradictions (docs / tasks / code drift)

- **None.** Docs, tasks ledger, and code agree: Epic 4 partial; IK19 in-progress; three subsystems (drawing preview, cursors, connection anchors) stubbed.

---

## Recommended next smallest action

**Implement the drawing-preview subsystem in OverlayManager only (1 file).**

- **Why this step:** It is one of three stubbed subsystems; it has a direct reference implementation in `useShapeDrawing.tsx` (`renderDrawingPreview`) and is already called by `DrawingController` with the correct API (`showDrawingPreview(tool, color)`, `updateDrawingPreview(state, tool, color)`, `hideDrawingPreview()`).
- **Scope cap:** Max 1 file changed (`OverlayManager.ts`). No changes to `DrawingController`, tests, or other modules except adding unit tests for drawing preview in `OverlayManager.test.ts` if we allow 2 files; per user constraint "max 1–2 files", implementation can be OverlayManager.ts + test file.
- **Out of scope this step:** Cursors, connection anchors (separate steps).

---

## Evidence

- `OverlayManager.ts`: lines 154–165 stubs; lines 166–186 cursors/anchors stubs.
- `useShapeDrawing.tsx`: lines 165–239 render rectangle/circle/line/frame preview with Rect/Line, dash [5,5], fill/stroke.
- `DrawingController.ts`: calls `overlay.showDrawingPreview(getTool(), getColor())`, `overlay.updateDrawingPreview(state, getTool(), getColor())`, `overlay.hideDrawingPreview()`.
