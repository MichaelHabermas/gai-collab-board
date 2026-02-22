## 2026-02-22_14-28-10 continue-dblclick-wire-ik18

# Research — Continue dblclick wire IK18

## Done vs pending (Wave 4 / Epic 3)

| Item | Doc/ledger | Code | Status |
|------|------------|------|--------|
| T16 StageEventRouter + ShapeEventWiring | Done | Present + tests | Done |
| T17 Drawing, Marquee, Connector | Done | Present + tests | Done |
| T18 TextEditController | Pending (tasks) / Done (V5) | **Present** (TextEditController.ts + tests) | **Drift** |
| T19 OverlayManager | Pending | Missing | Pending |

## Contradictions / drift

1. **tasks.md IK18** says "reject — TextEditController.ts not present" but **TextEditController.ts exists** and has `open(objectId)` and unit tests (see docs/collab/runs/2025-02-22/continue-text-edit-controller).
2. **ShapeEventWiring** already wires dblclick to `config.openTextEdit(objectId)`; there is **no production call site** that passes a config with `openTextEdit` bound to `TextEditController.open`. The only caller is the unit test (mock `openTextEdit`).
3. V5 §0 Actual status says E3 "11/11" including TextEditController; orchestration Wave 4 says "T17, T18 done; pending T19". tasks.md IK18 is the only source that still says reject.

## Recommended next smallest action

- **In ShapeEventWiring:** Support an optional direct dependency so dblclick can call `TextEditController.open`: add optional `textEditController?: ITextEditController` to `IShapeEventConfig` and in the dblclick handler call `config.textEditController?.open(objectId) ?? config.openTextEdit(objectId)`.
- **In tasks.md:** Set IK18 status to **done** and update notes (TextEditController implemented; dblclick wired via config; reconciliation note).
- **Scope cap:** Max 2 files: ShapeEventWiring.ts, .claude/tasks.md. Optionally extend ShapeEventWiring.test.ts with one test for textEditController path.

## 2026-02-22_14-37-29 continue-epic3-checkpoint

# Research — Continue Epic 3 checkpoint

## Done vs pending (Wave 4 / Epic 3–4)

| Epic / Wave | Done | Pending |
|-------------|------|---------|
| **E3 (Epic 3)** | 11/11: DragCoordinator, StageEventRouter, ShapeEventWiring, DrawingController, MarqueeController, ConnectorController, TextEditController + drag modules; IK16–IK18 done in tasks.md; dblclick wired (continue-dblclick-wire-ik18) | Epic 3 “Completion checkpoint recorded” checkbox in V5 still **unchecked** |
| **E4 (Epic 4)** | T20 TransformerManager, T21 GridRenderer + SelectionDragHandle (IK20, IK21 done) | T19 OverlayManager (IK19 reject — no OverlayManager in repo) |
| **Wave 4** | T15–T18 done | T19 OverlayManager |
| **Wave 5** | T20, T21 done | T19 still pending |

## Contradictions / drift

1. **V5 §9 Epic 3 Definition of Done:** “Completion checkpoint recorded per §0.1... before Epic 5 begins” is `[ ]` unchecked. §0.1 says completion is recorded in `.claude/tasks.md` review notes — IK16–IK18 already have review/reconciliation notes (e.g. IK18: “continue-dblclick-wire-ik18 run; `bun run validate` passes”). So **artifact exists**, but **V5 checkbox not updated**.
2. **Orchestration vs tasks.md:** Orchestration Wave 4 says “T17, T18 done; pending: T19”. tasks.md IK18 = done. No conflict; optional clarity is to make Wave 4 explicitly note “T18 done (dblclick wired)”.
3. **IK19 (OverlayManager):** tasks.md = reject (no files); V5 Actual status = “E4 Partial — Missing: OverlayManager”. Aligned.

## Recommended next smallest action

- **Single step:** Record Epic 3 completion checkpoint in the migration doc by checking the Epic 3 “Completion checkpoint recorded” checkbox in docs/IMPERATIVE-KONVA-MIGRATION-V5.md and adding a one-line note that links to the artifact (e.g. “Recorded in `.claude/tasks.md` IK16–IK18 review notes; continue-dblclick-wire-ik18 run; `bun run validate` passed.”).
- **File count:** 1 file (V5). Optionally 2nd file: docs/IMPERATIVE-KONVA-ORCHESTRATION.md Wave 4 status line to explicitly say T18 done (dblclick wired) — only if we stay ≤2 files.
- **Out of scope for this step:** Any code change; T19 OverlayManager (would require a separate, multi-file plan).

## 2026-02-22_15-30-00 continue-overlay-manager-scaffold

# Research — continue-overlay-manager-scaffold

**Run:** 2026-02-22_15-30-00  
**Depth:** standard  
**Strict:** true  

## Done vs pending (active wave / Epic 4)

| Item | Doc/ledger | Code | Status |
|------|------------|------|--------|
| E0 | Done | Constitution, baselines, 13 E2E | done |
| E1 | Done | 7 factories, types, registry | done |
| E2 | Done | LayerManager, KonvaNodeManager, SelectionSyncController | done |
| E3 | 11/11 | StageEventRouter, ShapeEventWiring, DragCoordinator, controllers, TextEditController | done |
| E4 — TransformerManager | Done | TransformerManager.ts + test | done |
| E4 — GridRenderer | Done | GridRenderer.ts + test | done |
| E4 — SelectionDragHandle | Done | SelectionDragHandle.ts + test | done |
| **E4 — OverlayManager** | **Pending** | **Missing** | **pending** |
| E5, E6 | Not started | — | not started |

## Contradictions (docs / tasks / code drift)

- **None.** V5 Actual status, Orchestration Wave 4/5, and `.claude/tasks.md` all state that OverlayManager (T19/IK19) is not implemented and is the remaining Epic 4 gap.

## Recommended next smallest action

**Implement OverlayManager scaffold (T19 first step):**

- **What:** Add `src/canvas/OverlayManager.ts` as a class with constructor(overlayLayer), `destroy()`, and stub implementations for all five subsystem APIs (marquee, guides, drawing preview, cursors, connection anchors) so the file compiles and satisfies the V5 §10 interface. Add `tests/unit/OverlayManager.test.ts` that instantiates with a mock layer and calls `destroy()` (and optionally each public method) to verify no throw.
- **Why smallest:** T19 is the only remaining Epic 4 item; full 5-subsystem implementation is ~250 LOC and would exceed a single “smallest step.” A scaffold is one verified step (2 files, scope cap compliant) and unblocks future steps (e.g. wiring from DragCoordinator, DrawingController, MarqueeController).
- **Scope cap:** 2 files (OverlayManager.ts, OverlayManager.test.ts). No changes to existing canvas modules in this step.

## 2026-02-22_16-00-00 continue-overlay-guides

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

## 2026-02-22_17-00-00 continue-overlay-marquee

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
