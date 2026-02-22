# Tarpey Reconcile — Epic 4 Continue

**Mode:** reconcile  
**Preset:** strict  
**Run:** 2026-02-22_20-00-00  
**Output dir:** `docs/collab/runs/2026-02-22_20-00-00/continue-epic4-reconcile/`

---

## 1. Objective

Confirm exact Epic 4 remaining scope and block any drift before implementation. Re-establish current project truth so the next smallest verified step is unambiguous.

---

## 2. ReconciliationCheck

| Item | Result |
|------|--------|
| **canonical_sources** | `docs/IMPERATIVE-KONVA-MIGRATION-V5.md` (§Actual status, §10 Epic 4, Epic 4 DoD); `docs/IMPERATIVE-KONVA-ORCHESTRATION.md` (Wave 4, Wave 5, T19); `.claude/tasks.md` (IK19); code: `src/canvas/OverlayManager.ts`, `tests/unit/OverlayManager.test.ts`. |
| **drift_items** | One minor: Orchestration Wave 5 status line says "3 subsystems (drawing preview, cursors, connection anchors) pending." Code shows drawing preview **implemented** (show/update/hide, rect/circle/line/frame). V5 Actual status and tasks.md IK19 Notes correctly state drawing preview done; cursors and anchors stubbed. |
| **resolution_actions** | Optional: Update Orchestration Wave 5 status to "2 subsystems (cursors, connection anchors) pending" when editing that file next. Not blocking. |
| **proceed_decision** | **clear** |

---

## 3. Done vs Pending (Epic 4 / IK19)

**Active:** Epic 4 OverlayManager (T19 / IK19).

| Item | Status | Evidence |
|------|--------|----------|
| OverlayManager scaffold | Done | `src/canvas/OverlayManager.ts` exists; constructor, getLayer(), destroy(). |
| Marquee | Done | showMarquee/updateMarquee/hideMarquee — Konva.Rect, layer add/destroy. |
| Alignment guides | Done | updateGuides(guides) — Konva.Group + Line children, destroy/recreate. |
| Drawing preview | Done | showDrawingPreview/updateDrawingPreview/hideDrawingPreview — rect/circle/line/frame, createDrawingPreviewNode, applyDrawingPreviewGeometry. |
| Remote cursors | Pending | updateCursors(_cursors, _currentUid) is stub (lines 318–320). |
| Connection anchors | Pending | updateConnectionNodes, highlightAnchor, clearConnectionNodes are stubs (lines 323–337). |
| TransformerManager, GridRenderer, SelectionDragHandle | Done | Per V5 §Actual status; separate modules with unit tests. |
| Epic 4 DoD "OverlayManager handles all 5 overlay subsystems" | Pending | Blocked until cursors + anchors implemented. |
| Epic 4 completion checkpoint recorded | Pending | After DoD satisfied. |

---

## 4. Findings (severity-ordered)

| Severity | Finding | Evidence |
|----------|---------|----------|
| Low | Orchestration Wave 5 text lists "drawing preview" as pending; code has it implemented. | IMPERATIVE-KONVA-ORCHESTRATION.md line 234 vs OverlayManager.ts 163–315. |
| — | No other contradictions. V5 Actual status, IK19 Notes, and OverlayManager.ts agree: cursors and connection anchors stubbed. | — |

---

## 5. Risks and Residual Gaps

- **destroy():** Does not yet clean up cursor nodes or connection anchor nodes. When cursors/anchors are implemented, destroy() must remove those nodes (and any groups) before `this.overlayLayer = null`.
- **Reference implementations:** CursorLayer.tsx (Circle + Text × 2 for label, filter by currentUid). ConnectionNodesLayer.tsx (getAnchorPosition, isConnectableShapeType, Circle per anchor, onClick/onTap). Both are react-konva; OverlayManager must use imperative Konva nodes and same types (Cursors, ICursorData, ConnectorAnchor, IBoardObject).

---

## 6. Decision

**clear** — No blocking drift. ReconciliationCheck passes. Implementation may proceed with the next smallest step.

---

## 7. Next Smallest Action

**Implement the remote cursors subsystem in OverlayManager only.**

- **Scope cap:** Max 2 files: `src/canvas/OverlayManager.ts`, `tests/unit/OverlayManager.test.ts`.
- **What:** Replace `updateCursors` stub with logic that: (1) filters out `currentUid` from cursors; (2) destroys any existing cursor nodes/group; (3) creates a Konva group and, for each other cursor, adds a Konva Circle (radius 6, fill color, stroke white 2, shadow) and Konva Text for displayName (port from CursorLayer.tsx); (4) add group to overlay layer; (5) batchDraw. In destroy(), remove cursor group if present.
- **Evidence targets:** OverlayManager.ts (updateCursors body; destroy() cleanup), OverlayManager.test.ts (updateCursors adds nodes for other cursors, skips currentUid, destroy cleans up), `bun run validate`.
- **Out of scope this step:** Connection anchors; Epic 5 wiring; doc checkbox updates (do after both subsystems done).

---

## 8. Evidence Targets (for next run)

| Target | Purpose |
|--------|---------|
| `src/canvas/OverlayManager.ts` | Implement updateCursors; extend destroy() for cursor group. |
| `tests/unit/OverlayManager.test.ts` | Cursor tests: other users rendered, current user excluded, destroy clears. |
| `src/components/canvas/CursorLayer.tsx` | Reference: Circle + Text layout, props (x, y, displayName, color). |
| `src/types/collaboration.ts` | ICursorData, Cursors. |
| `bun run validate` | Pass after change. |
