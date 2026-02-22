# Imperative Konva Migration Plan (V5)

**Supersedes:** IMPERATIVE-KONVA-MIGRATION-V4. Key rules: merge to `development`; E2E path `tests/e2e/`; Zustand vanilla `subscribe(listener)` receives full store state; drag split into five modules (DragCoordinator, dragCommit, alignmentEngine, dragBounds, frameDragReparenting); explicit S-plan dependency contract (§4).

**Task tracking:** Check off each task and sub-task below as you complete it (change `- [ ]` to `- [x]`). This keeps progress visible and avoids duplicate work.

---

## Table of Contents

0. [Actual status (vs. checkboxes)](#actual-status-vs-checkboxes)
1. [Context & Rationale](#1-context--rationale)
2. [Architecture Overview](#2-architecture-overview)
3. [What Survives, Dies, Transforms](#3-what-survives-dies-transforms)
4. [STATE-MANAGEMENT-PLAN-2 Dependency Contract](#4-state-management-plan-2-dependency-contract)
5. [New File Structure](#5-new-file-structure)
6. [Epic 0: Constitutional Amendments, Baselines, E2E Safety Net](#6-epic-0-constitutional-amendments-baselines-e2e-safety-net)
7. [Epic 1: Shape Factories & Core Types](#7-epic-1-shape-factories--core-types)
8. [Epic 2: KonvaNodeManager & LayerManager](#8-epic-2-konvanodemanager--layermanager)
9. [Epic 3: Event System & Drag Handlers (REWRITE)](#9-epic-3-event-system--drag-handlers-rewrite)
10. [Epic 4: Overlay & Transformer Managers](#10-epic-4-overlay--transformer-managers)
11. [Epic 5: CanvasHost & Integration](#11-epic-5-canvashost--integration)
12. [Epic 6: Cleanup & Performance Verification](#12-epic-6-cleanup--performance-verification)
13. [Migration Dependency Graph](#13-migration-dependency-graph)
14. [Risk Matrix](#14-risk-matrix)
15. [Decision Log](#15-decision-log)
16. [Appendix A: Honest LOC Estimates](#appendix-a-honest-loc-estimates)
17. [Appendix B: Dying Code Manifest](#appendix-b-dying-code-manifest)
18. [Appendix C: Zustand v5 Subscription Contract](#appendix-c-zustand-v5-subscription-contract)
19. [Appendix D: Drag Behavior Checklist](#appendix-d-drag-behavior-checklist)

---

## Actual status (vs. checkboxes)

*Last verified against codebase.* Checkboxes below can drift from repo state. This section reflects what actually exists.

| Epic | Doc suggests | Reality |
|------|--------------|---------|
| **E0** | Constitution, baselines, 13 E2E done | Constitution (Articles XX–XXVII) not in CONSTITUTION.md; `docs/perf-baselines/` missing; only 4 of 13 new E2E specs exist (connectorCreation, connectorEndpointDrag, shapeResize, shapeRotate). |
| **E1** | Done | Done — all 7 factories, types, registry, unit tests present. |
| **E2** | Done | Done — LayerManager, KonvaNodeManager, SelectionSyncController + unit tests. |
| **E3** | 9/11 sub-tasks done | **6/11** — drag modules (dragCommit, alignmentEngine, dragBounds, frameDragReparenting) + their tests exist. **Missing:** DragCoordinator, entire `events/` folder (StageEventRouter, ShapeEventWiring, DrawingController, MarqueeController, ConnectorController, TextEditController). |
| **E4** | Not started | **Partial** — TransformerManager, GridRenderer, SelectionDragHandle + unit tests present. Missing: OverlayManager. |
| **E5** | Not started | Not started — App still uses BoardCanvas. |
| **E6** | Not started | Not started. |

---

## 1. Context & Rationale

**Problem:** React-Konva puts React reconciliation in the canvas rendering hot path. Every shape is a React component. Every state change triggers diffing, bridge translation, then Konva redraw — three layers of overhead per frame.

**Evidence:** Zero fast whiteboard apps use React-Konva (Excalidraw: raw Canvas 2D, tldraw: custom Canvas 2D, Figma: WebGL+WASM, Miro: custom Canvas 2D). The pattern is universal — React for UI chrome, direct canvas for the board.

**Solution:** Replace the react-konva component tree with imperative Konva node management. The canvas becomes ONE React component (`CanvasHost`) holding a `Konva.Stage` ref. All shapes are Konva nodes created/updated/destroyed by a `KonvaNodeManager` that subscribes directly to the Zustand store. React never touches canvas internals.

**Outcome:** Eliminate React reconciliation of N shape components from drag/zoom/pan hot paths. Direct `node.setAttrs()` + `layer.batchDraw()` — microseconds, not milliseconds. Zero `memo()` comparisons, zero Zustand selector evaluations per shape per frame.

---

## 2. Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│  React World (UI Chrome Only)                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  CanvasHost.tsx (~250 LOC)                           │   │
│  │  - Creates Konva.Stage via useCanvasSetup hook       │   │
│  │  - Renders: <div ref> + Toolbar + ControlPanel       │   │
│  │  - Re-renders ONLY on tool/color change              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useCanvasSetup.ts (~200 LOC)                        │   │
│  │  - Instantiates all managers                         │   │
│  │  - Wires Zustand subscriptions (vanilla, not hooks)  │   │
│  │  - Returns destroy() for cleanup                     │   │
│  └──────────────────────────────────────────────────────┘   │
│  CanvasToolbarWrapper, CanvasControlPanel, PropertyInspector│
└─────────────────────────────────────────────────────────────┘
         │ ref                    ┌──────────────────────┐
         ▼                       │ Zustand Stores       │
┌─────────────────────┐          │ (ALL UNCHANGED)      │
│ Konva.Stage         │◄─subscribe─┤ objectsStore       │
│  ├─ Layer: static   │          │ selectionStore       │
│  ├─ Layer: active   │          │ dragOffsetStore      │
│  ├─ Layer: overlay  │          │ historyStore         │
│  └─ Layer: selection│          │ viewportActionsStore │
└─────────────────────┘          └──────────────────────┘
         ▲                                │
         │ manages                        │
┌─────────────────────────────────────────┤
│ Imperative Canvas Module (NEW)          │
│                                         │
│  KonvaNodeManager     ◄── objectsStore.subscribe()
│  SelectionSyncController ◄── selectionStore.subscribe()
│  LayerManager         (layer creation + RAF-coalesced batchDraw)
│  TransformerManager   (Konva.Transformer lifecycle)
│  OverlayManager       (marquee, guides, cursors, drawing preview, anchors)
│  StageEventRouter     (stage-level mouse dispatch by tool)
│  ShapeEventWiring     (per-node click/drag/dblclick)
│  DragCoordinator      (thin dispatcher to drag sub-modules)
│  TextEditController   (dblclick → DOM textarea, reuses canvasTextEditOverlay.ts)
│  Shape Factories      (create + update per type, with bitmap caching)
│                                         │
│  drag/                                  │
│    dragCommit.ts      (store persistence on drag end)
│    alignmentEngine.ts (guide computation + snap)
│    dragBounds.ts      (boundary constraint functions)
│    frameDragReparenting.ts (frame containment logic)
└─────────────────────────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Persistence          │
│ (ALL UNCHANGED)      │
│ writeQueue.ts        │
│ objectService.ts     │
│ realtimeService.ts   │
└──────────────────────┘
```

### Subscription Flow

```text
objectsStore.subscribe((state, prevState) => {
  // Zustand v5 vanilla: listener receives (fullState, fullPrevState)
  // NOT selector output — full store state including objects, indexes, actions

  if (state.objects === prevState.objects) return; // No object changes — skip

  const nextObjects = state.objects;      // Record<string, IBoardObject>
  const prevObjects = prevState.objects;  // Record<string, IBoardObject>

  // O(changed) diff: for each key, nextObj === prevObj → skip
  nodeManager.handleStoreChange(nextObjects, prevObjects);
});
```

See **Appendix C** for the verified Zustand v5 subscription API contract.

---

## 3. What Survives, Dies, Transforms

### Survives Unchanged

| Module | Path | Reason |
|--------|------|--------|
| All Zustand stores | `src/stores/*` | Constitution Article V: stores may not be deleted or merged |
| Spatial index | `src/lib/spatialIndex.ts` | Module-level singleton, no React coupling |
| Write queue | `src/lib/writeQueue.ts` | Debounced Firestore writes, unchanged API |
| Object service | `src/modules/sync/objectService.ts` | Firestore CRUD |
| Realtime service | `src/modules/sync/realtimeService.ts` | Cursor/presence via RTDB |
| Alignment guides (logic) | `src/lib/alignmentGuides.ts` | Pure geometry functions — reused by `alignmentEngine.ts` |
| Canvas bounds | `src/lib/canvasBounds.ts` | AABB calculations |
| Snap to grid | `src/lib/snapToGrid.ts` | Pure geometry |
| Line transform | `src/lib/lineTransform.ts` | Connector math |
| Connector anchors | `src/lib/connectorAnchors.ts` | `getAnchorPosition()` |
| Text edit overlay | `src/lib/canvasTextEditOverlay.ts` | Takes `Konva.Stage` + `Konva.Node`, zero React deps |
| Overlay positioning | `src/lib/canvasOverlayPosition.ts` | Pure geometry |
| Shadow props | `src/lib/shapeShadowProps.ts` | Konva shadow config |
| Stroke patterns | `src/lib/strokePatterns.ts` | Dash array config |
| Board canvas theme | `src/components/canvas/boardCanvasTheme.ts` | CSS var → color |
| Perf timer | `src/lib/perfTimer.ts` | Dev-only measurement |
| All UI components | `CanvasControlPanel`, `Toolbar`, `PropertyInspector`, etc. | React UI chrome |
| All types | `src/types/*` | IBoardObject, IViewportState, etc. |
| useCanvasViewport | `src/hooks/useCanvasViewport.ts` (384 LOC) | Uses `IStageRefLike` — works with plain Konva.Stage |
| useCanvasKeyboardShortcuts | `src/hooks/useCanvasKeyboardShortcuts.ts` | DOM keyboard, no canvas coupling |
| useCanvasOperations | `src/hooks/useCanvasOperations.ts` | Store operations, no canvas coupling |
| useBoardSubscription | `src/hooks/useBoardSubscription.ts` | Firestore subscription |
| useCursors | `src/hooks/useCursors.ts` | RTDB cursor subscription |
| useVisibleShapeIds | `src/hooks/useVisibleShapeIds.ts` (91 LOC) | Zustand selector + useMemo, zero react-konva |

### Dies (Replaced by Imperative Equivalents)

See **Appendix B** for the complete manifest with LOC counts.

**Summary:** 26 dying files totaling ~4,907 LOC.

### Transforms (Logic REWRITTEN, Not Extracted)

| Hook | Current LOC | New Location | Why Rewrite |
|------|-------------|-------------|-------------|
| `useObjectDragHandlers` | 761 | `DragCoordinator` + 4 drag modules (~600 total) + `ShapeEventWiring` (~150) | 27 React hooks. Handler factory maps solve React-specific problem. Direct store reads replace closures. |
| `useShapeDrawing` | 250 | `DrawingController.ts` (~100) + `OverlayManager.updateDrawingPreview()` (~50) | Returns React-Konva JSX. Must become imperative node creation. |
| `useMarqueeSelection` | 127 | `MarqueeController.ts` (~80) | `useState` in 60Hz hot path. Must become plain state + direct overlay call. |
| `useConnectorCreation` | 98 | `ConnectorController.ts` (~70) | Moderate port. Two-click state machine is simple. |

---

## 4. STATE-MANAGEMENT-PLAN-2 Dependency Contract

This section establishes the dependency contract between this migration and STATE-MANAGEMENT-PLAN-2.

### Current S-Task Status (as of this plan)

| Task | Status | Relevant to Migration? |
|------|--------|----------------------|
| S1: Single source of truth | Merged | Yes — objectsStore is canonical. Migration depends on this. ✅ |
| S2: queueObjectUpdate | Merged | Yes — DragEngine calls `queueObjectUpdate`. ✅ |
| S3: Pagination | Partial (cursor-based delta subscription done) | No hard dependency. Pagination affects initial load, not rendering. |
| S4: (reserved) | N/A | — |
| S5: applyChanges batching | Not started | **Soft dependency.** See below. |
| S6: Subscriber notification | Not started | **Soft dependency.** See below. |
| S7: Ref elimination | Not started | No dependency. Ref cleanup is internal to hooks that survive. |

### Dependency Rules

1. **Hard prerequisites (must be merged before Epic 1):** S1, S2. Both already merged. ✅

2. **No hard dependency on S3-S7.** The migration can proceed in parallel with S3-S7 work. The imperative system subscribes to `objectsStore` via vanilla `subscribe()` — this works regardless of whether `applyChanges` (S5/S6) is the primary mutation path.

3. **Soft dependency on S5/S6 for Epic 5 timing.** If S5 changes the store mutation pattern (e.g., `applyChanges` produces one `set()` per batch instead of multiple `updateObject()` calls), `KonvaNodeManager.handleStoreChange` must be retested:
   - **O(changed) diff still works** — reference equality check is agnostic to how objects got updated.
   - **Subscription frequency may change** — S5 coalescing multiple updates into one `set()` means fewer subscription fires, which is strictly better for performance.
   - **Required action:** After S5/S6 merge, run the full E2E suite + perf baselines against the imperative system. File a validation task in `.claude/tasks.md`.

4. **If S5/S6 run in parallel with Epic 2:** The `handleStoreChange` diff loop must not assume any specific mutation pattern (single `updateObject` vs batch `applyChanges`). It must handle:
   - Single object updated (1 ref change in `objects`)
   - Multiple objects updated in one `set()` (N ref changes in `objects`)
   - Objects added and removed in the same `set()` (keys appear/disappear)

   This is already the design — the diff loop iterates all keys and compares by reference. No special handling needed.

5. **Wave ordering per Article XVII:**
   - S2 merged before S5 PR opens ✅
   - S5 merged before S7 PR opens (not started)
   - Migration Epics 0-4 may proceed regardless of S5/S7 timing
   - Migration Epic 5 (cutover) should ideally land after S5, but is not blocked by it

---

## 5. New File Structure

```text
src/canvas/                              # NEW top-level module
  CanvasHost.tsx                          # React shell (~250 LOC)
  useCanvasSetup.ts                      # Manager instantiation + subscription wiring (~200 LOC)
  KonvaNodeManager.ts                    # Node lifecycle: create/update/destroy/layer-sync (~350 LOC)
  LayerManager.ts                        # Layer creation + RAF-coalesced batchDraw (~80 LOC)
  TransformerManager.ts                  # Imperative Konva.Transformer (~120 LOC)
  OverlayManager.ts                      # Marquee, guides, cursors, drawing preview, anchors (~250 LOC)
  SelectionSyncController.ts             # Selection ↔ layer sync + drag offset application (~120 LOC)
  GridRenderer.ts                        # Grid sceneFunc (port of existing Shape) (~40 LOC)
  factories/
    types.ts                             # IShapeNodes, ShapeFactory, ShapeUpdater interfaces (~40 LOC)
    index.ts                             # Registry: Map<ShapeType, IShapeFactoryEntry> (~30 LOC)
    createStickyNote.ts                  # Group → Rect(bg) + Rect(fold) + Text + cache logic (~120 LOC)
    createFrame.ts                       # Group → Rects + Texts, child count via store read (~130 LOC)
    createRectangle.ts                   # Rect (~50 LOC)
    createCircle.ts                      # Ellipse (center-based) (~50 LOC)
    createLine.ts                        # Line (points-based) (~50 LOC)
    createConnector.ts                   # Arrow | Line | Group(2×Arrow) by arrowhead mode (~100 LOC)
    createTextElement.ts                 # Text node (~60 LOC)
  events/
    StageEventRouter.ts                  # Stage mousedown/move/up → tool dispatch (~120 LOC)
    ShapeEventWiring.ts                  # Per-node: click, drag*, dblclick, dragBoundFunc (~150 LOC)
    DrawingController.ts                 # Drawing state machine (replaces useShapeDrawing) (~100 LOC)
    MarqueeController.ts                 # Marquee state machine (replaces useMarqueeSelection) (~80 LOC)
    ConnectorController.ts               # Two-click connector flow (~70 LOC)
    TextEditController.ts                # dblclick → DOM textarea (reuses canvasTextEditOverlay.ts) (~80 LOC)
  drag/
    DragCoordinator.ts                   # Thin dispatcher — routes to sub-modules (~50 LOC)
    dragCommit.ts                        # Store persistence on drag end (~200 LOC)
    alignmentEngine.ts                   # Guide computation + snap position (~150 LOC)
    dragBounds.ts                        # Boundary constraint functions (~80 LOC)
    frameDragReparenting.ts              # Frame containment detection + reparenting (~120 LOC)
```

**Estimated total new code: ~3,290 LOC** replacing ~4,907 LOC of existing code. The value is performance, not fewer lines.

**Every file stays under the 300-line project limit.** Every drag sub-module stays under 200 LOC.

**Enforcement:** LOC limits (300 for CanvasHost/useCanvasSetup, 200 per drag module) are enforced in PR review; split before merge if exceeded.

---

## 6. Epic 0: Constitutional Amendments, Baselines, E2E Safety Net

**Goal:** Establish inviolable rules, capture performance baselines BEFORE any code changes, and fill E2E test gaps that the migration will rely on as its safety net.

### 6.1 — Constitutional Amendments

Add the following to `docs/CONSTITUTION.md` as Articles XX–XXV and XXVII (additive to Articles I–XIX). When amending CONSTITUTION.md, do not use a range that implies XXVI; the implementation note replaces it. OOP vs. functions is an implementation note below, not a constitution article.

#### Article XX — Imperative Canvas Rendering Contract

1. `KonvaNodeManager` is a **derived rendering projection** of `useObjectsStore`. Konva nodes are never the source of truth (reinforces Article I).
2. `KonvaNodeManager` must not hold stale snapshots of `IBoardObject` data. Its internal `lastObj` field is a **diff optimization cache**, not authoritative state. Any detected divergence must be resolved by re-reading the store, not by trusting the cache.
3. No imperative canvas module may call `useObjectsStore.getState().updateObject()` directly during the render/update cycle. Store mutations happen only in event handlers (drag end, text change, transform end) — never in the subscription callback that processes store changes.

#### Article XXI — Connector Endpoint Reactivity

1. When a shape moves, `KonvaNodeManager.handleStoreChange()` must update all connectors referencing that shape as an endpoint, using the `connectorsByEndpoint` index.
2. Connector updates must be **deduplicated** within a single `handleStoreChange` call. If both endpoints of a connector move in the same store change (e.g., multi-select drag), the connector must be updated exactly once, after both endpoint positions are resolved.
3. Connector endpoint updates must complete within the same `batchDraw()` call as the endpoint shape updates. No visual frame may show a connector lagging behind its endpoint.

#### Article XXII — Subscription Efficiency

1. The imperative canvas must not regress the subscription efficiency of the current per-shape model:
   - Store change processing must be O(changed) not O(total). The `handleStoreChange` diff must short-circuit for objects whose reference identity has not changed.
   - During drag (high-frequency updates to 1–N shapes), only the dragged shapes and their connected connectors may have their Konva nodes updated. All other nodes must remain untouched.

2. **Zustand v5 vanilla subscription API (verified):**

   ```typescript
   // From node_modules/zustand/esm/vanilla.d.mts:
   // subscribe: (listener: (state: T, prevState: T) => void) => () => void
   //
   // listener receives the FULL store state, not a selector projection.
   // No subscribeWithSelector middleware is used in this project.
   ```

   The subscription callback receives `(state, prevState)` where both are the full store state object. To detect object changes:

   ```typescript
   const unsub = useObjectsStore.subscribe((state, prevState) => {
     if (state.objects === prevState.objects) return; // early exit
     nodeManager.handleStoreChange(state.objects, prevState.objects);
   });
   ```

   The diff compares `state.objects[id] === prevState.objects[id]` by reference identity. This is O(n) in the worst case but O(changed) in practice because Zustand's `updateObject` only replaces the changed entry in the Record.

#### Article XXIII — Bitmap Caching Preservation

1. Complex shapes (StickyNote, Frame) must be bitmap-cached when idle; cache cleared when selected, editing, or dragging; re-applied when returning to idle after visual changes.
2. Cache pixel ratio ≥ device pixel ratio (minimum 2x). Factory `update()` must invalidate cache when any visual property changes.

#### Article XXIV — Layer Partitioning Invariant

1. Shapes exist on exactly one of two layers: **static** (idle shapes) or **active** (selected/dragging shapes).
2. When selection changes, shapes must move between layers atomically. No shape may exist on both layers simultaneously.
3. The active layer redraws at 60Hz during drag. The static layer redraws only when its contents change (shape added/removed/updated while idle).
4. The overlay layer (marquee, guides, cursors, drawing preview, connection anchors) is independent of both shape layers.
5. The selection layer (Konva.Transformer) is independent of both shape layers.

#### Article XXV — Event System Isolation

1. Stage-level events (mousedown/mousemove/mouseup on empty canvas) are handled by `StageEventRouter` and dispatched based on `activeTool`.
2. Per-shape events (click, drag, dblclick) are wired by `ShapeEventWiring` when a shape node is created.
3. No event handler may directly create or destroy Konva nodes. Event handlers mutate Zustand stores or call imperative overlay updates. Node creation/destruction is exclusively `KonvaNodeManager`'s responsibility in response to store changes.
4. Exception: `OverlayManager` may create/destroy transient overlay nodes (marquee rect, guide lines, drawing preview) in response to direct method calls from event handlers. These are not store-backed.

#### Article XXVII — Migration Safety (extends Article V)

1. Epics 1–4 are purely additive. They create new files alongside the existing system. No existing file is modified or deleted until Epic 5.
2. Epic 5 is the cut-over. It is a single atomic PR that replaces `<BoardCanvas>` with `<CanvasHost>`. This PR must pass all E2E tests.
3. Epic 6 deletes dead files. It is a separate PR from Epic 5. If Epic 5 introduces regressions discovered post-merge, Epic 6 is blocked and Epic 5 is reverted.
4. At no point during the migration may both `BoardCanvas` and `CanvasHost` be active simultaneously in production. Feature flags are acceptable for local testing only.
5. **Rollback:** Revert the Epic 5 merge (or the BoardCanvas → CanvasHost swap in a follow-up PR); do not merge Epic 6 until Epic 5 is stable.

**Implementation note (OOP vs. functions):** Imperative Konva node management requires mutable state (Konva nodes have lifecycle methods). Use classes for modules that own node lifecycles: `KonvaNodeManager`, `LayerManager`, `TransformerManager`, `OverlayManager`. Use pure functions for stateless logic: drag sub-modules, `ShapeEventWiring.wireEvents()`, shape factories. Controllers with simple state machines (`DrawingController`, `MarqueeController`, etc.) use closure-based modules (factory functions returning method objects). Use classes only when state genuinely benefits from `this` — justify in PR.

### 6.2 — Performance Baselines

Capture BEFORE writing any factory code. Store results in `docs/perf-baselines/pre-migration.json`.

| Metric | How to Measure | Tool |
|--------|---------------|------|
| Frame time during 100-object drag | Chrome DevTools Performance tab, drag a selected shape for 3s, record p50/p95/p99 frame times | Chrome DevTools |
| Frame time during 500-object pan | Same, but pan across a board with 500 objects | Chrome DevTools |
| React component re-renders during drag | React DevTools Profiler, count StoreShapeRenderer re-renders during a single drag | React DevTools |
| Zustand selector evaluations per drag frame | Custom instrumentation in `selectObject` and `selectGroupDragOffset` selectors | Manual or follow-up script |
| Bundle size (gzipped) | `bun run build` then measure `dist/assets/*.js` | Build output |
| `bun run perf:check` output | Run existing perf benchmark | Existing script |
| Time-to-interactive for 1000-object board | Measure from `setAll()` to first `batchDraw()` complete | Manual or follow-up script |

*Epic 0: capture these metrics manually; the script is optional (see follow-up doc).*

**Baseline capture:** Capture the metrics above manually and save to `docs/perf-baselines/pre-migration.json`. Schema and optional automated script spec are in [IMPERATIVE-KONVA-MIGRATION-V5-FOLLOW-UP.md](IMPERATIVE-KONVA-MIGRATION-V5-FOLLOW-UP.md#2-performance-baseline-capture). Epic 0 does not require an automated script; add one later if repeatability is needed.

### 6.3 — E2E Safety Net

Write Playwright E2E tests for every interaction the migration touches. Tests must pass against the CURRENT codebase before any migration code is written (Article XIX: E2E must pass on current codebase before migration changes; same pattern here).

All E2E paths use `tests/e2e/`.

| Test | File | What It Verifies |
|------|------|-----------------|
| Marquee selection | `tests/e2e/marqueeSelection.spec.ts` | Drag empty canvas → selection rect appears → shapes inside selected → release → rect disappears |
| Single shape drag | `tests/e2e/shapeDrag.spec.ts` | Click shape → drag → release → shape at new position → Firestore updated |
| Multi-select drag | `tests/e2e/multiSelectDrag.spec.ts` | Select 3 shapes → drag → all 3 move together → release → all positions committed |
| Connector creation | `tests/e2e/connectorCreation.spec.ts` | Activate connector tool → click anchor on shape A → click anchor on shape B → connector created |
| Connector endpoint drag | `tests/e2e/connectorEndpointDrag.spec.ts` | Create connector between A and B → drag A → connector follows A's anchor |
| Transform (resize) | `tests/e2e/shapeResize.spec.ts` | Select shape → drag corner handle → shape resized → new dimensions committed |
| Transform (rotate) | `tests/e2e/shapeRotate.spec.ts` | Select shape → drag rotation handle → shape rotated → rotation committed |
| Frame reparenting | `tests/e2e/frameReparenting.spec.ts` | Drag shape into frame → shape becomes frame child → drag out → shape leaves frame |
| Text editing (sticky) | `tests/e2e/stickyTextEdit.spec.ts` | Double-click sticky → textarea appears → type text → press Enter → text saved |
| Text editing (frame title) | `tests/e2e/frameTitleEdit.spec.ts` | Double-click frame title → input appears → type → Enter → title saved |
| Alignment guides | `tests/e2e/alignmentGuides.spec.ts` | Drag shape near another → guide lines appear → snap occurs |
| Drawing tools | `tests/e2e/drawingTools.spec.ts` | Select rectangle tool → drag on canvas → rectangle created at drag bounds |
| Undo/redo after drag | `tests/e2e/undoRedoDrag.spec.ts` | Drag shape → undo → shape returns → redo → shape moves again |
| Snap to grid | Already exists: `tests/e2e/snapToGridDrag.spec.ts` | Verify still passes |
| Text overlay stability | Already exists: `tests/e2e/textOverlayStability.spec.ts` | Verify still passes |

Deferred to [IMPERATIVE-KONVA-MIGRATION-V5-FOLLOW-UP.md](IMPERATIVE-KONVA-MIGRATION-V5-FOLLOW-UP.md#1-deferred-e2e-tests): frame enter (zoom), keyboard shortcuts. Mobile E2E is out of scope for this migration.

**13 new tests.**

### 6.4 — Epic 0 Definition of Done

- [ ] Constitutional amendments (Articles XX–XXV, XXVII) added to `docs/CONSTITUTION.md`
- [ ] Performance baselines captured and saved to `docs/perf-baselines/pre-migration.json` (per follow-up doc: manual or script)
- [ ] All 13 new E2E tests written and passing against current codebase (only 4 of 13 exist: connectorCreation, connectorEndpointDrag, shapeResize, shapeRotate)
- [x] All existing E2E tests still pass
- [x] `bun run validate` passes
- [ ] **PR merged to `development`**

*Check off each item above as completed.*

PRs that modify Zustand stores during this migration should also satisfy [STATE-MGMT-REVIEWER-CHECKLIST.md](docs/STATE-MGMT-REVIEWER-CHECKLIST.md) where applicable.

---

## 7. Epic 1: Shape Factories & Core Types

**Goal:** Create pure TypeScript factory functions that produce Konva node trees from `IBoardObject` data, with companion updater functions that patch existing nodes. Factories include bitmap caching logic.

**Estimated LOC:** ~630 new lines across 9 files.

### Key Types

```typescript
// src/canvas/factories/types.ts (~40 LOC)

/** The node tree created for a single board object. */
interface IShapeNodes {
  /** Root node added to the layer (Group for compound shapes, Shape for simple ones). */
  root: Konva.Group | Konva.Shape;
  /** Named sub-nodes for targeted attr patches. E.g., { bg: Rect, text: Text }. */
  parts: Record<string, Konva.Shape>;
  /** Whether this shape benefits from bitmap caching. */
  cacheable: boolean;
}

/** Creates the initial Konva node tree from object data. */
type ShapeFactory = (obj: IBoardObject) => IShapeNodes;

/**
 * Patches an existing node tree from new vs. previous object data.
 * MUST return true if a visual property changed (triggers cache invalidation).
 * MUST return false if only position/selection state changed (no cache invalidation).
 */
type ShapeUpdater = (nodes: IShapeNodes, obj: IBoardObject, prev: IBoardObject) => boolean;

/** Registry entry binding create + update for a shape type. */
interface IShapeFactoryEntry {
  create: ShapeFactory;
  update: ShapeUpdater;
}
```

### Bitmap Caching Strategy (Article XXIII)

```text
Shape created → cache(pixelRatio: 2)  (if cacheable)
Shape selected → clearCache()
Shape deselected, no visual change → cache(pixelRatio: 2)
Shape updated (visual prop changed) → clearCache() → update attrs → cache(pixelRatio: 2)
Shape enters edit mode → clearCache()
Shape exits edit mode → cache(pixelRatio: 2)
```

Only compound shapes (StickyNote: Group, Frame: Group) set `cacheable: true`. Simple shapes (Rect, Ellipse, Line, Arrow, Text) are single Konva nodes — bitmap caching overhead isn't worth it.

### Sub-Tasks

- [x] 1. **`src/canvas/factories/types.ts`** (~40 LOC) — Interfaces above.

- [x] 2. **`createRectangle.ts`** (~50 LOC) — Simplest factory.
  - `create()`: `new Konva.Rect({ id, x, y, width, height, fill, stroke, strokeWidth, opacity, rotation, cornerRadius, dash })`.
  - `update()`: Diff each attr by reference. Only call `node.setAttr()` for changed fields. Return `true` if visual prop changed.
  - Port of: `shapes/RectangleShape.tsx` (85 LOC).

- [x] 3. **`createCircle.ts`** (~50 LOC) — Center-based positioning.
  - `create()`: `new Konva.Ellipse({ id, x: obj.x + obj.width/2, y: obj.y + obj.height/2, radiusX: obj.width/2, radiusY: obj.height/2, ... })`.
  - Port of: `shapes/CircleShape.tsx` (93 LOC).

- [x] 4. **`createLine.ts`** (~50 LOC) — Points-based positioning.
  - `create()`: `new Konva.Line({ id, x, y, points: obj.points, ... })`.
  - Port of: `shapes/LineShape.tsx` (84 LOC).

- [x] 5. **`createConnector.ts`** (~100 LOC) — 4 arrowhead modes.
  - Branch on `obj.arrowheads`: `'end'` → Arrow, `'start'` → reversed Arrow, `'both'` → Group with 2 Arrows, `'none'` → Line.
  - `update()`: Recalculate points when linked endpoints move. If arrowhead mode changes, destroy and recreate.
  - Port of: `shapes/Connector.tsx` (192 LOC).

- [x] 6. **`createTextElement.ts`** (~60 LOC) — Text node.
  - `create()`: `new Konva.Text({ id, x, y, width, text, fontSize, fontFamily, fill, wrap: 'word', ... })`.
  - Port of: `shapes/TextElement.tsx` (224 LOC) — most LOC is overlay lifecycle, handled by TextEditController.

- [x] 7. **`createStickyNote.ts`** (~120 LOC) — Compound shape with caching.
  - `create()`: `new Konva.Group({ id, x, y })` with:
    - `Konva.Rect` (bg): fill, shadow props from `shapeShadowProps.ts`
    - `Konva.Rect` (fold): corner fold decoration
    - `Konva.Text` (text): wrapped text content
  - Parts map: `{ bg, fold, text }`
  - `cacheable: true`
  - Port of: `shapes/StickyNote.tsx` (328 LOC) — factory handles node creation only.

- [x] 8. **`createFrame.ts`** (~130 LOC) — Compound shape with child count.
  - `create()`: `new Konva.Group({ id, x, y })` with:
    - `Konva.Rect` (titleBar): gradient fill, title area
    - `Konva.Rect` (body): frame body, lighter fill
    - `Konva.Text` (title): frame title + chevron + child count badge
    - `Konva.Text` (dropHint): "Drop here" text, initially hidden
  - `cacheable: true`
  - Child count text updated by `KonvaNodeManager` (reads `frameChildrenIndex` after store change), not the factory.
  - Port of: `shapes/Frame.tsx` (389 LOC).

- [x] 9. **`src/canvas/factories/index.ts`** (~30 LOC) — Registry.

   ```typescript
   const FACTORY_REGISTRY = new Map<ShapeType, IShapeFactoryEntry>([
     ['rectangle', { create: createRectangle, update: updateRectangle }],
     ['circle', { create: createCircle, update: updateCircle }],
     ['line', { create: createLine, update: updateLine }],
     ['connector', { create: createConnector, update: updateConnector }],
     ['text', { create: createTextElement, update: updateTextElement }],
     ['sticky', { create: createStickyNote, update: updateStickyNote }],
     ['frame', { create: createFrame, update: updateFrame }],
   ]);
   export function getFactory(type: ShapeType): IShapeFactoryEntry { ... }
   ```

- [x] 10. **Unit tests** (~200 LOC):
  - Each factory: `create()` returns correct Konva node class and structure
  - Each factory: `update()` patches only changed attrs (spy on `node.setAttr`)
  - Each factory: `update()` returns `true` for visual changes, `false` for position-only
  - Connector: test all 4 arrowhead modes
  - StickyNote: verify Group structure (bg + fold + text), `cacheable: true`
  - Frame: verify Group structure (titleBar + body + title + dropHint), `cacheable: true`

### Epic 1 Definition of Done

- [x] All 7 factory files + types + registry created and passing unit tests
- [x] Registry returns correct factory for each shape type
- [x] `bun run validate` passes
- [x] No existing files modified
- [ ] PR merged to `development` before Epic 2 begins

---

## 8. Epic 2: KonvaNodeManager & LayerManager

**Goal:** Build the central module that bridges Zustand stores to imperative Konva nodes, with efficient O(changed) subscription processing.

**Estimated LOC:** ~550 new lines across 3 files.

### KonvaNodeManager Design

```text
Store change detected (via objectsStore.subscribe)
  │
  ├─ state.objects === prevState.objects? → RETURN (no object changes)
  │
  ▼
handleStoreChange(nextObjects, prevObjects)
  │
  ├─ For each key in nextObjects:
  │   ├─ nextObj === prevObj (reference equal)? → SKIP (O(1) check, Article XXII)
  │   ├─ key not in managed? → CREATE (factory.create + add to static layer + wire events)
  │   └─ key in managed, refs differ? → UPDATE (factory.update + handle cache)
  │       └─ After updating shape, check connectorsByEndpoint for this id
  │           └─ Queue connector IDs for deferred update (Article XXI.2)
  │
  ├─ For each key in managed but not in nextObjects:
  │   └─ DESTROY (unwire events + remove from layer + node.destroy())
  │
  ├─ Deferred connector pass (deduplicated):
  │   └─ For each unique connector ID queued:
  │       └─ Recalculate points from both endpoint positions
  │       └─ factory.update(connectorNodes, newConnectorObj, prevConnectorObj)
  │
  └─ scheduleBatchDraw(affectedLayers)
```

**O(changed) guarantee (Article XXII):** For a drag of 1 shape on a 500-shape board:

- 1 entry has a new reference → processed
- 499 entries have the same reference → skipped (1 comparison each)
- Total work: 499 reference checks + 1 factory.update + K connector updates

### Internal State

```typescript
interface IManagedNode {
  id: string;
  type: ShapeType;
  nodes: IShapeNodes;
  lastObj: IBoardObject;           // Diff cache (Article XX.2: NOT authoritative)
  currentLayer: 'static' | 'active';
  isCached: boolean;               // Bitmap cache state (Article XXIII)
  isEditing: boolean;              // Text edit mode flag
}
```

### Connector Deduplication (Article XXI.2)

During multi-select drag of shapes A and B, both connected by connector C:

1. `handleStoreChange` processes A → queues connector C for update
2. `handleStoreChange` processes B → queues connector C for update (already in `Set`, deduplicated)
3. After all shapes processed, deferred connector pass runs once for C with both endpoints at final positions

Implementation: `Set<string>` for pending connector IDs, populated during shape update loop, drained after loop completes.

### LayerManager

```typescript
// ~80 LOC — Closure-based module (implementation note)
interface ILayerRefs {
  static: Konva.Layer;
  active: Konva.Layer;
  overlay: Konva.Layer;
  selection: Konva.Layer;
}

function createLayerManager(stage: Konva.Stage): {
  layers: ILayerRefs;
  scheduleBatchDraw: (layer: Konva.Layer) => void;
  destroy: () => void;
}
// Creates 4 layers, attaches to stage in correct z-order
// scheduleBatchDraw coalesces to 1 RAF per frame per layer
// destroy cancels pending RAFs
```

### SelectionSyncController

```typescript
// ~120 LOC
function createSelectionSyncController(
  manager: KonvaNodeManager,
  layerManager: ILayerManagerReturn,
  transformerManager: TransformerManager
): {
  start: () => void;      // Begins subscriptions
  destroy: () => void;    // Cleans up subscriptions
}
// Handles:
// 1. Moving nodes between static/active layers on selection change
// 2. Applying groupDragOffset to active layer nodes during drag
// 3. Updating bitmap cache state when selection changes (Article XXIII)
// Subscribes to: selectionStore, dragOffsetStore
```

### Sub-Tasks

- [x] 1. **`LayerManager.ts`** (~80 LOC) — Creates 4 layers, attaches to stage, RAF-coalesced `scheduleBatchDraw()`.

- [x] 2. **`KonvaNodeManager.ts`** (~350 LOC) — Core class.
  - `start()`: Subscribe to `useObjectsStore`, call `handleStoreChange` on every change.
  - `handleStoreChange(nextObjects, prevObjects)`: Diff loop with O(changed) skip, connector deduplication.
  - `getNode(id)`: Returns `IManagedNode` for a given object ID.
  - `getAllManagedIds()`: Returns all managed node IDs.
  - `setCacheState(id, cached)`: Enable/disable bitmap caching (Article XXIII).
  - `setEditingState(id, editing)`: Track text editing for cache management.
  - `destroy()`: Unsubscribe, destroy all nodes, clear managed map.

- [x] 3. **`SelectionSyncController.ts`** (~120 LOC) — Selection ↔ layer sync.
  - `onSelectionChange(nextSelectedIds, prevSelectedIds)`: Move newly selected to active, newly deselected to static. Clear cache on selected, re-cache on deselected (Article XXIII).
  - `onDragOffsetChange(offset)`: Apply offset to active layer nodes imperatively.

- [x] 4. **Unit tests** (~200 LOC):
  - Add object to store → node created on static layer
  - Update object in store → node attrs patched, not recreated
  - Delete object from store → node destroyed, removed from layer
  - Move shape with connector → connector updated in same cycle
  - Multi-select drag of connected shapes → connector updated once (deduplication)
  - Reference-equal objects → skipped (spy on factory.update, assert not called)
  - Select shape → node moves to active layer
  - Deselect shape → node moves to static layer

- [ ] 5. **Integration tests** — Full flow: create store → populate → verify nodes on layers → update store → verify patches → change selection → verify layer moves.

### Epic 2 Definition of Done

- [x] KonvaNodeManager creates/updates/destroys nodes in response to store changes
- [x] O(changed) diff verified by test (spy on factory.update for unchanged objects)
- [x] Connector deduplication verified by test
- [x] Selection sync moves nodes between layers
- [x] Bitmap caching enabled/disabled on selection change
- [x] `bun run validate` passes
- [x] No existing files modified
- [ ] PR merged to `development` before Epic 3 begins

---

## 9. Epic 3: Event System & Drag Handlers (REWRITE)

**Goal:** Rewrite (not extract) the event handling system. The current `useObjectDragHandlers` (761 LOC, 27 React hooks) must be rebuilt as standalone functions that read from Zustand stores directly.

**Estimated LOC:** ~1,200 new lines across 11 files.

**Behavior contract:** Epic 3 is done only when every behavior in **[Appendix D: Drag Behavior Checklist](#appendix-d-drag-behavior-checklist)** is satisfied (by unit test, integration test, or explicit manual verification). The checklist is the source of truth for "what the current hook does"; the rewrite must preserve it.

**Why "rewrite" not "extract":** Handler factory maps, ref-syncing, useCallback dependency arrays — all React-specific patterns that don't exist in imperative Konva. Every function signature changes because they read from stores directly instead of receiving values through React closures.

### DragCoordinator.ts (~50 LOC)

Thin dispatcher that routes drag events to the appropriate sub-module:

```typescript
function createDragCoordinator(config: {
  overlayManager: OverlayManager;
  snapToGridEnabled: () => boolean;
  canEdit: () => boolean;
  onObjectUpdate: (id: string, updates: Partial<IBoardObject>) => void;
  onObjectsUpdate: (updates: Array<{objectId: string; updates: Partial<IBoardObject>}>) => void;
}): IDragCoordinator {
  return {
    selectObject: (id, metaKey) => dragCommit.selectObject(id, metaKey),
    onDragMove: (e, candidates) => alignmentEngine.onDragMove(e, candidates, config.overlayManager),
    commitDragEnd: (id, x, y) => dragCommit.commitDragEnd(id, x, y, config),
    createDragBoundFunc: (id) => dragBounds.createDragBoundFunc(id, config),
    handleSelectionDragStart: (e) => dragCommit.handleSelectionDragStart(e),
    handleSelectionDragMove: (e) => dragCommit.handleSelectionDragMove(e),
    handleSelectionDragEnd: (e) => dragCommit.handleSelectionDragEnd(e, config),
  };
}
```

### dragCommit.ts (~200 LOC)

Handles store persistence on drag end. Ports the core logic from `useObjectDragHandlers.handleObjectDragEnd` (lines 162-360):

```typescript
/** Handle single click on a shape (toggle/set selection). */
export function selectObject(objectId: string, metaKey: boolean): void {
  const { selectedIds, setSelectedIds, toggleSelectedId } = useSelectionStore.getState();
  if (metaKey) toggleSelectedId(objectId);
  else if (!selectedIds.has(objectId)) setSelectedIds([objectId]);
}

/** Called on per-node dragend. Commits position to store + Firestore. */
export function commitDragEnd(
  objectId: string, x: number, y: number,
  config: IDragConfig
): void {
  // 1. Get selected IDs from store
  // 2. Compute dx/dy from original positions
  // 3. Snap to grid if enabled
  // 4. Check frame reparenting via frameDragReparenting.findContainingFrame()
  // 5. Call onObjectUpdate for single, onObjectsUpdate for multi
  // 6. Call queueObjectUpdate for each changed object
}

/** Selection box drag (multi-select via drag handle). */
export function handleSelectionDragStart(e: Konva.KonvaEventObject<DragEvent>): void { ... }
export function handleSelectionDragMove(e: Konva.KonvaEventObject<DragEvent>): void { ... }
export function handleSelectionDragEnd(
  e: Konva.KonvaEventObject<DragEvent>,
  config: IDragConfig
): void { ... }
```

### alignmentEngine.ts (~150 LOC)

Guide computation and snap position. Wraps existing `src/lib/alignmentGuides.ts` pure functions:

```typescript
/** Called on per-node dragmove (60Hz). Computes alignment guides. */
export function onDragMove(
  e: Konva.KonvaEventObject<DragEvent>,
  guideCandidateBounds: IAlignmentCandidate[],
  overlayManager: OverlayManager
): void {
  // Calls computeAlignmentGuides() from src/lib/alignmentGuides.ts
  // Calls computeSnappedPosition() for magnetic snap
  // Calls overlayManager.updateGuides(guides)
}

/** Create guide candidates from visible objects (excludes dragged). */
export function buildGuideCandidates(
  visibleIds: string[],
  draggedIds: Set<string>,
  objects: Record<string, IBoardObject>
): IAlignmentCandidate[] { ... }
```

### dragBounds.ts (~80 LOC)

Boundary constraint functions for Konva's `dragBoundFunc`:

```typescript
/** Creates a dragBoundFunc that respects grid snap + alignment. */
export function createDragBoundFunc(
  objectId: string,
  config: IDragConfig
): (pos: Konva.Vector2d) => Konva.Vector2d {
  return (pos) => {
    if (config.snapToGridEnabled()) {
      return snapToGrid(pos.x, pos.y, GRID_SIZE);
    }
    return pos;
  };
}
```

### frameDragReparenting.ts (~120 LOC)

Frame containment detection and reparenting logic. Ports from `useFrameContainment.ts` (139 LOC):

```typescript
/** Find the frame containing a given position (center-point check). */
export function findContainingFrame(
  x: number, y: number, width: number, height: number,
  frames: IBoardObject[],
  excludeId: string
): string | null { ... }

/** Execute reparenting: update parentFrameId, frameChildrenIndex. */
export function reparentObject(
  objectId: string,
  newParentFrameId: string | null,
  oldParentFrameId: string | null,
  onObjectUpdate: (id: string, updates: Partial<IBoardObject>) => void
): void { ... }

/** Compute drop target highlighting (throttled at 100ms). */
export function updateDropTarget(
  draggedBounds: { x: number; y: number; width: number; height: number },
  frames: IBoardObject[],
  excludeIds: Set<string>
): string | null { ... }
```

### StageEventRouter.ts (~120 LOC)

```typescript
function createStageEventRouter(
  stage: Konva.Stage,
  getActiveTool: () => ToolMode,
  controllers: {
    drawing: IDrawingController;
    marquee: IMarqueeController;
    connector: IConnectorController;
    drag: IDragCoordinator;
    viewport: { handleWheel: (e: any) => void; handleDragEnd: (e: any) => void };
    cursorBroadcast: (x: number, y: number) => void;
  }
): { destroy: () => void } {
  // Attaches mousedown/mousemove/mouseup/wheel/touchstart/touchmove/touchend
  // Dispatches based on activeTool
  // RAF-throttles mousemove for drawing + marquee
  // Returns cleanup function
}
```

### ShapeEventWiring.ts (~150 LOC)

```typescript
/** Wire all events on a newly created shape node. */
export function wireEvents(
  node: Konva.Node,
  objectId: string,
  config: IShapeEventConfig
): void {
  // node.on('click tap', () => drag.selectObject(objectId, e.evt.metaKey))
  // node.on('dragstart', () => spatialIndex.setDragging(objectId))
  // node.on('dragmove', (e) => drag.onDragMove(e, ...))
  // node.on('dragend', (e) => drag.commitDragEnd(objectId, ...))
  // node.on('dblclick dbltap', () => textEditController.open(objectId))
  // node.draggable(config.canEdit())
  // node.dragBoundFunc(drag.createDragBoundFunc(objectId))
}

/** Remove all events from a node before destruction. */
export function unwireEvents(node: Konva.Node): void {
  node.off('click tap dragstart dragmove dragend dblclick dbltap');
}
```

### DrawingController.ts (~100 LOC)

Replaces `useShapeDrawing` (250 LOC .tsx):

```typescript
function createDrawingController(
  overlayManager: OverlayManager,
  onCreate: (params: ICreateObjectParams) => Promise<IBoardObject | null>
): IDrawingController {
  // Plain object state (no React useState, no ref mirror pattern)
  // start: set state, overlayManager.showDrawingPreview()
  // move: update state, overlayManager.updateDrawingPreview()
  // end: validate min size (5px), call onCreate, overlayManager.hideDrawingPreview()
}
```

### MarqueeController.ts (~80 LOC)

Replaces `useMarqueeSelection` (127 LOC):

```typescript
function createMarqueeController(
  overlayManager: OverlayManager
): IMarqueeController {
  // Plain object state (no React useState — Article XXII hot path)
  // start: set start coords, overlayManager.showMarquee()
  // move: update end coords, overlayManager.updateMarquee() DIRECTLY
  // end: AABB hit-test objects, call setSelectedIds, overlayManager.hideMarquee()
}
```

### ConnectorController.ts (~70 LOC)

Replaces `useConnectorCreation` (98 LOC):

```typescript
function createConnectorController(
  overlayManager: OverlayManager,
  onObjectCreate: (params: ICreateObjectParams) => Promise<IBoardObject | null>,
  setActiveTool: (tool: ToolMode) => void
): IConnectorController {
  // First click: store from, overlayManager.highlightAnchor()
  // Second click: compute points, call onObjectCreate, clear, setActiveTool('select')
}
```

### TextEditController.ts (~80 LOC)

```typescript
function createTextEditController(
  stage: Konva.Stage,
  nodeManager: KonvaNodeManager
): ITextEditController {
  // open():
  //   1. Get managed node for objectId
  //   2. Determine text sub-node (sticky: parts.text, frame: parts.title)
  //   3. Hide Konva text node
  //   4. Create DOM textarea via getOverlayRectFromLocalCorners + attachOverlayRepositionLifecycle
  //   5. On blur/Enter: read textarea, queueObjectUpdate(id, { text }), restore Konva text
  //   6. nodeManager.setEditingState(id, true/false)
  // Reuses canvasTextEditOverlay.ts and canvasOverlayPosition.ts UNCHANGED
}
```

### Sub-Tasks

- [ ] 1. **`drag/DragCoordinator.ts`** (~50 LOC) — Thin dispatcher.
- [x] 2. **`drag/dragCommit.ts`** (~200 LOC) — Store persistence on drag end.
- [x] 3. **`drag/alignmentEngine.ts`** (~150 LOC) — Guide computation + snap.
- [x] 4. **`drag/dragBounds.ts`** (~80 LOC) — Boundary constraint functions.
- [x] 5. **`drag/frameDragReparenting.ts`** (~120 LOC) — Frame containment logic.
- [ ] 6. **`events/StageEventRouter.ts`** (~120 LOC) — Stage-level event dispatch.
- [ ] 7. **`events/ShapeEventWiring.ts`** (~150 LOC) — Per-node event wiring.
- [ ] 8. **`events/DrawingController.ts`** (~100 LOC) — Drawing state machine.
- [ ] 9. **`events/MarqueeController.ts`** (~80 LOC) — Marquee state machine.
- [ ] 10. **`events/ConnectorController.ts`** (~70 LOC) — Two-click connector flow.
- [ ] 11. **`events/TextEditController.ts`** (~80 LOC) — Text editing via DOM overlay.
- [x] 12. **Unit tests** (~300 LOC):
  - dragCommit: selectObject toggles selection, commitDragEnd calls queueObjectUpdate
  - alignmentEngine: guide computation returns correct snap positions
  - dragBounds: dragBoundFunc respects grid snap
  - frameDragReparenting: findContainingFrame with center-point check
  - (Controllers and ShapeEventWiring tests pending with their modules.)

### Epic 3 Definition of Done

- [ ] All 11 event/drag files created and passing unit tests (6/11: drag modules done; DragCoordinator + events/ folder pending)
- [x] **Every drag sub-module stays under 200 LOC**
- [ ] DragCoordinator is a thin dispatcher, not a monolith
- [ ] MarqueeController uses no React state (plain object)
- [ ] TextEditController reuses canvasTextEditOverlay.ts unchanged
- [ ] **All items in [Appendix D: Drag Behavior Checklist](#appendix-d-drag-behavior-checklist) verified** (each row marked as covered by unit test, integration test, or manual verification in PR)
- [x] `bun run validate` passes
- [x] No existing files modified
- [ ] PR merged to `development` before Epic 5 begins (may merge in parallel with Epic 4)

---

## 10. Epic 4: Overlay & Transformer Managers

**Goal:** Imperatively manage all non-shape canvas elements on the overlay and selection layers.

**Estimated LOC:** ~490 new lines across 4 files.

### OverlayManager (~250 LOC)

Replaces 4 React components (SelectionLayer 66 LOC, ConnectionNodesLayer 72 LOC, CursorLayer 74 LOC, AlignmentGuidesLayer 67 LOC) plus drawing preview from useShapeDrawing.

```typescript
class OverlayManager {
  private overlayLayer: Konva.Layer;

  // ── Marquee (replaces SelectionLayer.tsx) ──
  showMarquee(): void;
  updateMarquee(rect: ISelectionRect): void;
  hideMarquee(): void;

  // ── Alignment Guides (replaces AlignmentGuidesLayer.tsx) ──
  updateGuides(guides: IAlignmentGuides | null): void;

  // ── Drawing Preview (replaces useShapeDrawing renderDrawingPreview) ──
  showDrawingPreview(tool: ToolMode, color: string): void;
  updateDrawingPreview(state: IDrawingState, tool: ToolMode, color: string): void;
  hideDrawingPreview(): void;

  // ── Remote Cursors (replaces CursorLayer.tsx) ──
  updateCursors(cursors: Cursors, currentUid: string): void;

  // ── Connection Anchors (replaces ConnectionNodesLayer.tsx) ──
  updateConnectionNodes(
    shapeIds: string[],
    objectsRecord: Record<string, IBoardObject>,
    onNodeClick: (shapeId: string, anchor: ConnectorAnchor) => void
  ): void;
  highlightAnchor(shapeId: string, anchor: ConnectorAnchor): void;
  clearConnectionNodes(): void;

  destroy(): void;
}
```

### TransformerManager (~120 LOC)

Ports `TransformHandler.tsx` (187 LOC):

```typescript
class TransformerManager {
  constructor(selectionLayer: Konva.Layer) {
    this.transformer = new Konva.Transformer({
      // Exact config from TransformHandler.tsx lines 148-181:
      flipEnabled: false,
      rotateEnabled: true,
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
      rotationSnapTolerance: 5,
      enabledAnchors: ['top-left', 'top-center', 'top-right', 'middle-right',
                        'bottom-right', 'bottom-center', 'bottom-left', 'middle-left'],
      anchorSize: 8, anchorCornerRadius: 2,
      anchorStroke: '#3b82f6', anchorFill: '#ffffff', anchorStrokeWidth: 1,
      borderStroke: '#3b82f6', borderStrokeWidth: 1, borderDash: [3, 3],
      boundBoxFunc: (oldBox, newBox) =>
        Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10 ? oldBox : newBox,
    });
  }

  /** Update which nodes the transformer attaches to. */
  syncNodes(selectedIds: string[], activeLayer: Konva.Layer): void;

  /** Shape-aware attr extraction on transform end. */
  handleTransformEnd(onTransformEnd: (id: string, attrs: ITransformEndAttrs) => void): void;

  destroy(): void;
}
```

### GridRenderer (~40 LOC)

Port of the grid `sceneFunc` from BoardCanvas.

### SelectionDragHandle (~40 LOC)

Imperative replacement for the `SelectionDragHandle` component in BoardCanvas.

### Sub-Tasks

- [ ] 1. **`OverlayManager.ts`** (~250 LOC)
- [x] 2. **`TransformerManager.ts`** (~120 LOC)
- [x] 3. **`GridRenderer.ts`** (~40 LOC)
- [x] 4. **`SelectionDragHandle.ts`** (~40 LOC)
- [x] 5. **Unit tests** (TransformerManager, GridRenderer, SelectionDragHandle)

### Epic 4 Definition of Done

- [ ] OverlayManager handles all 5 overlay subsystems
- [x] TransformerManager config matches TransformHandler exactly
- [x] Grid renders correctly at different zoom levels
- [x] `bun run validate` passes
- [ ] No existing files modified
- [ ] PR merged to `development` before Epic 5 begins (may merge in parallel with Epic 3)

---

## 11. Epic 5: CanvasHost & Integration

**Goal:** Build `CanvasHost.tsx` + `useCanvasSetup.ts` and swap in for `BoardCanvas.tsx`. This is the cut-over — the first moment existing files change.

**Prerequisite:** Epics 2, 3, and 4 must be merged to `development` before opening the Epic 5 PR.

**Estimated LOC:** ~250 for CanvasHost + ~200 for useCanvasSetup + ~50 for import change = ~500 total.

### CanvasHost and useCanvasSetup

CanvasHost and useCanvasSetup are split to keep each file under the 300-line project limit.

- **`CanvasHost.tsx` (~250 LOC)** — React shell. Tool/color state, surviving React hooks, render UI chrome, mount/unmount lifecycle calling `useCanvasSetup`.
- **`useCanvasSetup.ts` (~200 LOC)** — Manager instantiation, Zustand subscription wiring, dependency injection graph, cleanup. Returns `{ destroy, stageRef }`. Called from CanvasHost's mount effect.

### useCanvasSetup.ts Structure

```typescript
interface ICanvasSetupConfig {
  container: HTMLDivElement;
  boardId: string;
  getActiveTool: () => ToolMode;
  getActiveColor: () => string;
  canEdit: () => boolean;
  onObjectCreate: (params: ICreateObjectParams) => Promise<IBoardObject | null>;
  onObjectUpdate: (id: string, updates: Partial<IBoardObject>) => void;
  onObjectsUpdate: (updates: Array<{objectId: string; updates: Partial<IBoardObject>}>) => void;
  onObjectDelete: (id: string) => void;
}

interface ICanvasSetupReturn {
  stage: Konva.Stage;
  destroy: () => void;
}

export function setupCanvas(config: ICanvasSetupConfig): ICanvasSetupReturn {
  // 1. Create Konva.Stage
  const stage = new Konva.Stage({ container: config.container, width, height });

  // 2. Instantiate managers (dependency injection order)
  const layerManager = createLayerManager(stage);
  const nodeManager = new KonvaNodeManager(layerManager, getFactory);
  const transformerManager = new TransformerManager(layerManager.layers.selection);
  const overlayManager = new OverlayManager(layerManager.layers.overlay);
  const selectionSync = createSelectionSyncController(nodeManager, layerManager, transformerManager);
  const dragCoordinator = createDragCoordinator({ overlayManager, ...config });
  const drawingController = createDrawingController(overlayManager, config.onObjectCreate);
  const marqueeController = createMarqueeController(overlayManager);
  const connectorController = createConnectorController(overlayManager, config.onObjectCreate, ...);
  const textEditController = createTextEditController(stage, nodeManager);
  const stageRouter = createStageEventRouter(stage, config.getActiveTool, { ... });

  // 3. Wire Zustand subscriptions (vanilla subscribe — see Appendix C)
  const unsubs: Array<() => void> = [];

  unsubs.push(useObjectsStore.subscribe((state, prevState) => {
    if (state.objects === prevState.objects) return;
    nodeManager.handleStoreChange(state.objects, prevState.objects);
  }));

  unsubs.push(useSelectionStore.subscribe((state, prevState) => {
    if (state.selectedIds === prevState.selectedIds) return;
    selectionSync.onSelectionChange(state.selectedIds, prevState.selectedIds);
  }));

  unsubs.push(useDragOffsetStore.subscribe((state, prevState) => {
    if (state.groupDragOffset === prevState.groupDragOffset) return;
    selectionSync.onDragOffsetChange(state.groupDragOffset);
  }));

  // 4. Start
  nodeManager.start();
  selectionSync.start();

  // 5. Return cleanup
  return {
    stage,
    destroy: () => {
      unsubs.forEach(fn => fn());
      stageRouter.destroy();
      selectionSync.destroy();
      nodeManager.destroy();
      overlayManager.destroy();
      transformerManager.destroy();
      layerManager.destroy();
      stage.destroy();
    },
  };
}
```

### CanvasHost.tsx Structure

```typescript
export function CanvasHost({ boardId, ... }: ICanvasHostProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [activeColor, setActiveColor] = useState('#000000');
  const activeToolRef = useRef(activeTool); // ref for event handlers

  // Surviving hooks
  const { viewport, handleWheel, ... } = useCanvasViewport({ stageRef });
  const visibleShapeIds = useVisibleShapeIds(viewport);
  useBoardSubscription(boardId);
  const { cursors } = useCursors(boardId);
  useCanvasKeyboardShortcuts(...);
  const ops = useCanvasOperations(boardId);

  // Mount: create Stage + all managers via useCanvasSetup
  useEffect(() => {
    if (!containerRef.current) return;

    const { stage, destroy } = setupCanvas({
      container: containerRef.current,
      boardId,
      getActiveTool: () => activeToolRef.current,
      getActiveColor: () => activeColorRef.current,
      canEdit: () => canEditRef.current,
      onObjectCreate: ops.onObjectCreate,
      onObjectUpdate: ops.onObjectUpdate,
      onObjectsUpdate: ops.onObjectsUpdate,
      onObjectDelete: ops.onObjectDelete,
    });

    stageRef.current = stage;
    return destroy;
  }, [boardId]);

  return (
    <div className="canvas-host">
      <div ref={containerRef} className="canvas-container" />
      <CanvasToolbarWrapper activeTool={activeTool} onToolChange={setActiveTool} ... />
      <CanvasControlPanel viewport={viewport} ... />
    </div>
  );
}
```

### Integration Checklist

| Feature | How to Verify |
|---------|--------------|
| Shape rendering (all 7 types) | Visual inspection + E2E |
| Shape selection (click) | Click shape → blue border |
| Multi-select (Shift+click) | Shift+click → multiple selected |
| Marquee selection | Drag empty area → selection rect |
| Selection box drag handle | Drag selection box → whole selection moves |
| Shape drag (single) | Drag → position updates → Firestore |
| Shape drag (multi) | Drag one → all selected move together |
| Snap to grid | Enable grid → drag → snaps to 20px |
| Alignment guides | Drag near another → guides appear |
| Frame reparenting | Drag into/out of frame |
| Connector creation | Tool → click anchors → connector appears |
| Connector follows endpoints | Drag connected shape → connector repositions |
| Text editing (sticky) | Double-click → textarea → type → save |
| Text editing (frame) | Double-click title → input → type → save |
| Transform (resize/rotate) | Drag handles → shape transforms |
| Undo/redo | Ctrl+Z / Ctrl+Y |
| Pan / Zoom | Space+drag, scroll |
| Remote cursors | Second client → cursor appears |
| Grid rendering | Toggle grid |
| Viewport persistence | Pan/zoom → refresh → same viewport |
| Drawing tools | Select tool → drag → shape created |
| Frame child count | Add shape → count badge updates |
| Bitmap caching | Idle→cached, drag→uncached, release→recached |

### Sub-Tasks

- [ ] 1. **Create `useCanvasSetup.ts`** (~200 LOC)
- [ ] 2. **Create `CanvasHost.tsx`** (~250 LOC)
- [ ] 3. **Wire all surviving hooks** — Verify `useCanvasViewport` works with plain Konva.Stage ref via `IStageRefLike`.
- [ ] 4. **Replace `<BoardCanvas>` import** — Single import swap in `App` (`src/App.tsx`).
- [ ] 5. **Run full E2E suite** — All 13 new Epic 0 tests + all existing tests must pass.
- [ ] 6. **Run performance comparison** — Capture post-migration baselines.
- [ ] 7. **Manual test matrix** — Every row in integration checklist verified.

### Epic 5 Definition of Done

- [ ] `<CanvasHost>` renders and manages all shape types
- [ ] **CanvasHost.tsx ≤ 300 LOC, useCanvasSetup.ts ≤ 300 LOC**
- [ ] All E2E tests pass (13 new from Epic 0 + all existing)
- [ ] All items in integration checklist verified
- [ ] Performance baselines captured (post-migration)
- [ ] `bun run validate` passes
- [ ] **PR merged to `development`**

---

## 12. Epic 6: Cleanup & Performance Verification

**Goal:** Delete dead code, remove react-konva dependency, verify performance improvements.

**SEPARATE PR from Epic 5.** If Epic 5 regresses, Epic 6 is blocked and Epic 5 can be reverted (Article XXVII.3).

### Deletion Manifest

See **Appendix B** for the full 26-file manifest with LOC counts. Summary:

| Category | Files | LOC |
|----------|-------|-----|
| Components (canvas) | 15 files | 3,165 |
| Hooks (canvas-coupled) | 10 files | 1,533 |
| shapes/index.ts | Modify (keep STICKY_COLORS only) | ~25 removed |
| react-konva dep | Remove from package.json | — |
| **Total dying code** | **26 files** | **~4,907** |

### Performance Verification

Compare against Epic 0 baselines in `docs/perf-baselines/pre-migration.json`. If pre-migration p95 frame time is already >16 ms, investigate and improve before or alongside the migration.

| Metric | Pre-Migration | Post-Migration Target | How to Measure |
|--------|--------------|----------------------|---------------|
| React re-renders during drag | N (visible shapes) | 0 (only UI chrome) | React DevTools Profiler |
| Frame time: 100-object drag (p95) | Baseline | ≤ baseline × 0.5 | Chrome DevTools |
| Frame time: 500-object pan (p95) | Baseline | ≤ baseline × 0.5 | Chrome DevTools |
| Zustand selector evals per drag frame | N per shape | 1 (manager subscription) | Custom instrumentation |
| Bundle size (gzipped) | Baseline | Baseline - ~45KB (react-konva) | Build output |
| Time-to-interactive: 1000 objects | Baseline | ≤ baseline × 0.8 | `scripts/capture-perf-baseline.ts` |

**Target: ≥50% reduction in drag frame times.** If not hit, investigate why before merging.

### Sub-Tasks

- [ ] 1. Delete all files in the manifest (Appendix B) — one commit.
- [ ] 2. Remove `react-konva` from `package.json` — `bun install`.
- [ ] 3. Update `shapes/index.ts` — keep only `STICKY_COLORS` and `StickyColor`.
- [ ] 4. Fix orphaned imports — `bun run validate` catches these.
- [ ] 5. Re-evaluate `useFrameContainment` and `useViewportActions`; if canvas-only after migration, add to deletion manifest and delete in this PR or a follow-up.
- [ ] 6. Capture post-migration performance baselines — `docs/perf-baselines/post-migration.json`.
- [ ] 7. Compare pre vs. post — write comparison in PR description.
- [ ] 8. Update `CLAUDE.md` — Component chain: `CanvasHost → useCanvasSetup → KonvaNodeManager → Shape Factories`.
- [ ] 9. Run `bun run release:gate` — full release validation.

### Epic 6 Definition of Done

- [ ] All 26 dead files deleted (Appendix B)
- [ ] `react-konva` removed from package.json
- [ ] `useFrameContainment` / `useViewportActions` either kept (non-canvas use confirmed) or added to manifest and deleted
- [ ] Performance comparison shows ≥50% reduction in drag frame times
- [ ] No regressions in any E2E test
- [ ] `bun run validate` passes
- [ ] `bun run release:gate` passes
- [ ] CLAUDE.md updated
- [ ] **PR merged to `development`**

---

## 13. Migration Dependency Graph

```text
Epic 0: Rules + Baselines + E2E
  │
  ▼
Epic 1: Shape Factories ──────────┐
  │                                │
  ▼                                ▼
Epic 2: KonvaNodeManager    Epic 3: Event System (parallel with E2)
  │                                │
  ├────────────────────────────────┤
  │                                │
  ▼                                ▼
Epic 4: Overlays ─────────────────┘
  │
  ▼
Epic 5: CanvasHost (CUT-OVER) ← All E2E must pass
  │
  ▼ (separate PR, blocks on E5 stability)
Epic 6: Cleanup + Perf Verification
```

**Parallel work opportunities:**

- Epic 3 can start after Epic 1 (needs factory types only, not KonvaNodeManager)
- Epic 4 can start after Epic 2 (needs layer references)
- Epics 3 and 4 can proceed in parallel

**Hard dependencies:**

- Epic 0 → Epic 1 (baselines + rules + E2E)
- Epic 1 → Epic 2 (factories are inputs to manager)
- Epics 2 + 3 + 4 → Epic 5 (all modules required)
- Epic 5 stable → Epic 6 (cleanup gated on stability)

---

## 14. Risk Matrix

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| Feature regression on cutover | 🔴 Critical | Medium | 13 E2E tests from Epic 0 + manual test matrix in Epic 5 |
| Per-shape subscription regression | 🔴 Critical | Low | Article XXII mandates O(changed). Reference equality in diff loop. Perf test verifies. |
| Connector visual lag | 🔴 Critical | Medium | Article XXI.3 mandates same-batchDraw. Deduplication prevents double-update. Unit test. |
| S5/S6 store API change breaks subscription | 🟡 High | Medium | §4 dependency contract: retest after any store API change. Diff loop is mutation-pattern agnostic. |
| Bitmap caching not restored | 🟡 High | Medium | Article XXIII mandates cache lifecycle. `isCached` tracked per node. |
| Marquee causes React re-render | 🟡 High | Low | MarqueeController uses plain state, not useState. |
| `lastObj` diverges from store | 🟡 High | Low | Article XX.2 mandates store re-read. Dev-mode assertions. |

---

## 15. Decision Log

| Decision | Rationale | Alternatives Rejected |
|----------|-----------|----------------------|
| Rewrite useObjectDragHandlers, don't extract | 27 React hooks, handler factory maps — all React-specific. Extraction = Frankenstein code. | Extract as-is (dead patterns left behind) |
| **Split DragEngine into 5 modules** | 600 LOC DragEngine would violate the 300-line limit. Existing seams (alignmentGuides.ts, snapToGrid.ts, useFrameContainment.ts) prove the algorithms are separable. Each module ≤200 LOC. | Single DragEngine.ts (rejected: 600 LOC violates 300-line limit, hard to test) |
| **Split CanvasHost into CanvasHost + useCanvasSetup** | Single 400-500 LOC CanvasHost would violate 300-line limit. Manager instantiation + subscription wiring is a cohesive unit that extracts cleanly. | Single CanvasHost.tsx (rejected: 500+ LOC, hard to reason about) |
| O(changed) diff via reference equality | O(1) per object check. O(changed) in practice. Matches current per-shape subscription efficiency. | Per-shape subscriptions (500 subscribe/unsubscribe), Deep diff (O(n×fields)) |
| Separate PR for Epic 5 (cutover) and Epic 6 (cleanup) | Safe revert path. | Single PR (can't revert without losing deletions) |

---

## Appendix A: Honest LOC Estimates

| File | Estimated LOC | Confidence | Notes |
|------|--------------|-----------|-------|
| `CanvasHost.tsx` | 250 | High | React shell: tool state + surviving hooks + render + mount effect |
| `useCanvasSetup.ts` | 200 | High | Manager instantiation + subscription wiring + cleanup |
| `KonvaNodeManager.ts` | 350 | High | Diff loop ~100, create/update/destroy ~80, connector dedup ~60, cache ~40, API ~30, types ~40 |
| `OverlayManager.ts` | 250 | High | 5 subsystems × ~50 LOC each |
| `dragCommit.ts` | 200 | Medium | Core drag end logic from useObjectDragHandlers |
| `ShapeEventWiring.ts` | 150 | High | wireEvents + unwireEvents + dragBoundFunc |
| `alignmentEngine.ts` | 150 | Medium | Guide computation wrapping existing pure functions |
| `createFrame.ts` | 130 | Medium | Compound shape + title/count text |
| `createStickyNote.ts` | 120 | High | Compound shape + fold + shadow |
| `StageEventRouter.ts` | 120 | High | Event dispatch + RAF throttle |
| `TransformerManager.ts` | 120 | High | Direct port minus JSX |
| `SelectionSyncController.ts` | 120 | Medium | Layer sync + drag offset + cache state |
| `frameDragReparenting.ts` | 120 | High | Port of useFrameContainment.ts (139 LOC) |
| `DrawingController.ts` | 100 | High | Simple state machine |
| `createConnector.ts` | 100 | High | 4 arrowhead branches |
| `dragBounds.ts` | 80 | High | Boundary constraint functions |
| `LayerManager.ts` | 80 | High | 4 layers + RAF coalesce |
| `MarqueeController.ts` | 80 | High | Simple state machine + AABB |
| `TextEditController.ts` | 80 | Medium | Reuses existing overlay lib |
| `ConnectorController.ts` | 70 | High | Two-click state machine |
| `createTextElement.ts` | 60 | High | Text node factory |
| `DragCoordinator.ts` | 50 | High | Thin dispatcher |
| `createRectangle.ts` | 50 | High | Simplest factory |
| `createCircle.ts` | 50 | High | Center-based |
| `createLine.ts` | 50 | High | Points-based |
| `GridRenderer.ts` | 40 | High | sceneFunc port |
| `SelectionDragHandle.ts` | 40 | High | Single rect management |
| `factories/types.ts` | 40 | High | Interfaces |
| `factories/index.ts` | 30 | High | Registry |
| **Total new code** | **~3,290** | — | Replacing ~4,907 LOC of existing code |
| **Total new tests** | **~850** | — | Unit + integration across all epics |

**Every file ≤ 300 LOC. Every drag sub-module ≤ 200 LOC.**

---

## Appendix B: Dying Code Manifest

26 files, ~4,907 LOC (see table below).

### Components (15 files, ~3,165 LOC)

| File | LOC | Action | Replaced By |
|------|-----|--------|------------|
| `src/components/canvas/BoardCanvas.tsx` | 970 | Delete | CanvasHost.tsx + useCanvasSetup.ts |
| `src/components/canvas/StoreShapeRenderer.tsx` | 149 | Delete | KonvaNodeManager.ts |
| `src/components/canvas/CanvasShapeRenderer.tsx` | 290 | Delete | Shape factories |
| `src/components/canvas/shapes/StickyNote.tsx` | 328 | Delete | createStickyNote.ts |
| `src/components/canvas/shapes/Frame.tsx` | 389 | Delete | createFrame.ts |
| `src/components/canvas/shapes/TextElement.tsx` | 224 | Delete | createTextElement.ts |
| `src/components/canvas/shapes/Connector.tsx` | 192 | Delete | createConnector.ts |
| `src/components/canvas/shapes/RectangleShape.tsx` | 85 | Delete | createRectangle.ts |
| `src/components/canvas/shapes/CircleShape.tsx` | 93 | Delete | createCircle.ts |
| `src/components/canvas/shapes/LineShape.tsx` | 84 | Delete | createLine.ts |
| `src/components/canvas/TransformHandler.tsx` | 187 | Delete | TransformerManager.ts |
| `src/components/canvas/SelectionLayer.tsx` | 66 | Delete | OverlayManager.showMarquee() |
| `src/components/canvas/ConnectionNodesLayer.tsx` | 72 | Delete | OverlayManager.updateConnectionNodes() |
| `src/components/canvas/CursorLayer.tsx` | 74 | Delete | OverlayManager.updateCursors() |
| `src/components/canvas/AlignmentGuidesLayer.tsx` | 67 | Delete | OverlayManager.updateGuides() |

### Hooks (10 files, ~1,533 LOC)

| File | LOC | Action | Why It Dies |
|------|-----|--------|------------|
| `src/hooks/useObjectDragHandlers.ts` | 761 | Delete | Replaced by DragCoordinator + drag sub-modules |
| `src/hooks/useShapeDrawing.tsx` | 250 | Delete | Replaced by DrawingController |
| `src/hooks/useMarqueeSelection.ts` | 127 | Delete | Replaced by MarqueeController |
| `src/hooks/useConnectorCreation.ts` | 98 | Delete | Replaced by ConnectorController |
| `src/hooks/useShapeTransformHandler.ts` | 94 | Delete | Absorbed by TransformerManager |
| `src/hooks/useKonvaCache.ts` | 83 | Delete | Absorbed by KonvaNodeManager cache lifecycle |
| `src/hooks/useAlignmentGuideCache.ts` | 58 | Delete | Absorbed by alignmentEngine.ts |
| `src/hooks/useLineLikeShape.ts` | 53 | Delete | Absorbed by createLine.ts / createConnector.ts |
| `src/hooks/useBatchDraw.ts` | 41 | Delete | Replaced by LayerManager.scheduleBatchDraw() |
| `src/hooks/useShapeDragHandler.ts` | 26 | Delete | Absorbed by ShapeEventWiring |
| `src/hooks/useObjectDragHandlersRefSync.ts` | 21 | Delete | Unnecessary — imperative code reads store directly |
| `src/hooks/useBoardCanvasRefSync.ts` | 22 | Delete | Unnecessary — useCanvasSetup manages refs |

**Note:** `src/hooks/useFrameContainment.ts` (139 LOC) and `src/hooks/useViewportActions.ts` (133 LOC) are borderline. Both contain logic usable outside the canvas. Keep them but verify no canvas-specific code remains after migration. If purely canvas-coupled, add to deletion manifest.

### Other

| File | Action |
|------|--------|
| `src/components/canvas/shapes/index.ts` | Modify: keep only `STICKY_COLORS`, `StickyColor` exports |
| `react-konva` in `package.json` | Remove from dependencies |

### Total

| Category | LOC |
|----------|-----|
| Components | ~3,165 |
| Hooks | ~1,534 |
| shapes/index.ts (partial) | ~25 |
| **Grand total dying code** | **~4,907** |

---

## Appendix C: Zustand v5 Subscription Contract

Do not use the two-argument `subscribe(selector, listener)` pattern; `subscribeWithSelector` is not used in this project.

### Verified API

From `node_modules/zustand/esm/vanilla.d.mts` (Zustand v5.0.11):

```typescript
type StoreApi<T> = {
  getState: () => T;
  getInitialState: () => T;
  setState: (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => void;
  subscribe: (listener: (state: T, prevState: T) => void) => () => void;
};
```

### Key facts

1. **`subscribe(listener)` calls `listener(state, prevState)`** where both are the **full store state** — not a selector projection.

2. **No `subscribeWithSelector` middleware** is used anywhere in this project. Zero grep results for `subscribeWithSelector` across the codebase.

3. The full store state includes `objects`, `frameChildrenIndex`, `connectorsByEndpoint`, and all action functions. The subscription callback must check `state.objects !== prevState.objects` to determine if objects actually changed.

4. Reference equality on the `objects` Record works because Zustand's `updateObject` creates a new Record spread: `{ ...state.objects, [id]: { ...state.objects[id], ...updates } }`. Only the changed entry gets a new reference.

5. If upgrading Zustand, re-verify the subscription signature `subscribe(listener)` with `(state, prevState)` before relying on this contract.

### Correct subscription pattern

```typescript
const unsub = useObjectsStore.subscribe((state, prevState) => {
  // Full store state — check relevant slice changed
  if (state.objects === prevState.objects) return;

  // Now diff individual objects by reference
  const nextObjects = state.objects;
  const prevObjects = prevState.objects;

  for (const id of Object.keys(nextObjects)) {
    if (nextObjects[id] === prevObjects[id]) continue; // O(1) skip
    // Process changed object...
  }

  for (const id of Object.keys(prevObjects)) {
    if (!(id in nextObjects)) {
      // Object was deleted...
    }
  }
});
```

---

## Appendix D: Drag Behavior Checklist

Derived from `src/hooks/useObjectDragHandlers.ts` and `src/hooks/useFrameContainment.ts`. Epic 3 DoD requires every row below to be verified (unit test, integration test, or explicit manual check in PR). Source line references are to the current hook for traceability.

### Selection (click / tap)

| ID | Behavior | Source | Verified by |
|----|----------|--------|-------------|
| D1 | Click on shape without meta key → selection becomes that single shape (`setSelectedIds([objectId])`). | 165–176 | |
| D2 | Click on shape with Shift/Ctrl/Cmd → toggle that shape in selection (`toggleSelectedId(objectId)`). | 168–170 | |

### Single-shape drag end

| ID | Behavior | Source | Verified by |
|----|----------|--------|-------------|
| D3 | On drag end, alignment guides are cleared. | 180 | |
| D4 | Single shape: final position is snapped to grid (20px) when `snapToGridEnabled`. | 269–273 | |
| D5 | Single shape: `onObjectUpdate(objectId, { x, y })` (and optionally `parentFrameId`) is called; then `clearDragState`; spatial index dragging cleared. | 365–368 | |
| D6 | Single frame drag: frame + all its children move by (dx, dy); children snapped to grid if enabled; single batch `onObjectsUpdate`. | 278–306 | |
| D7 | Single non-frame, non-connector: `parentFrameId` resolved via center-point containment; if drop position center is inside a frame, `parentFrameId` set to that frame (smallest containing frame by area). | 308–318, useFrameContainment | |
| D8 | Connectors and frames are never reparented (no `parentFrameId` update). | 235, 311, useFrameContainment | |
| D9 | Auto-expand frame: if dropped child would extend outside current parent frame (padding 20, title height 32), frame bounds are expanded to include child and both object + frame updates sent in one `onObjectsUpdate`. | 320–363 | |
| D10 | A frame cannot be the parent of itself (`excludeId` in containment check). | useFrameContainment | |

### Multi-shape drag end (one of selected shapes dragged)

| ID | Behavior | Source | Verified by |
|----|----------|--------|-------------|
| D11 | All selected shapes move by same (dx, dy); positions snapped to grid when `snapToGridEnabled`. | 191–252 | |
| D12 | For each selected frame, its children (not already in selection) also move by (dx, dy) and get batch updates; each child updated only once. | 213–232 | |
| D13 | For each selected non-frame, non-connector, `parentFrameId` resolved from final bounds; batch includes `parentFrameId` when changed. | 348–357 | |
| D14 | Single `onObjectsUpdate(batch)`; then drag state and spatial index cleared. | 255–264 | |

### Selection-box (selection handle) drag

| ID | Behavior | Source | Verified by |
|----|----------|--------|-------------|
| D15 | Selection drag start: bounds stored; drag set = selected IDs plus all children of any selected frame; `spatialIndex.setDragging(dragIds)`; alignment guides cleared. | 374–391 | |
| D16 | Selection drag move: `groupDragOffset` = (e.target.x - bounds.x1, e.target.y - bounds.y1); store updated via `setGroupDragOffset(offset)`. | 393–405 | |
| D17 | Selection drag end: all selected (and frame children not in selection) get new position from bounds + groupDragOffset; snap applied to group origin when `snapToGridEnabled`; reparenting per shape via center-point; single `onObjectsUpdate(batch)`; bounds ref and groupDragOffset cleared; spatial index cleared. | 374–417 | |

### Drag bound func (during drag)

| ID | Behavior | Source | Verified by |
|----|----------|--------|-------------|
| D18 | When `snapToGridEnabled`, dragBoundFunc returns `snapPositionToGrid(pos, 20)`; alignment guides set to empty during drag. | 442–446 | |
| D19 | When snap-to-grid off: alignment guides computed from dragged bounds and nearby candidates (spatial query with expand 4px, or all candidates); `computeSnappedPositionFromGuides` applied; returned position is snapped; guides updated (RAF-throttled). | 448–458 | |
| D20 | dragBoundFunc is keyed by (objectId, width, height); cache invalidated when visible set or snap setting changes (imperative port: build candidates per drag or when store slice changes). | 509–561, useAlignmentGuideCache | |

### Drag move (during one-shape or multi-shape drag)

| ID | Behavior | Source | Verified by |
|----|----------|--------|-------------|
| D21 | When `snapToGridEnabled`, node position is applied with `applySnapPositionToNode` during dragmove. | 434–436 | |
| D22 | Drag exemption set once per drag: either single object or (if multi-selected) selected IDs plus all children of any selected frame; `spatialIndex.setDragging(dragIds)`. | 439–456 | |
| D23 | Dragging a frame: `setFrameDragOffset({ frameId, dx, dy })` where dx/dy are node position minus stored frame position. | 459–464 | |
| D24 | Dragging a non-connector: drop target frame ID updated (throttled 100ms) via `findContainingFrame(dragBounds, frames, obj.id)`; `setDropTargetFrameId(targetFrame ?? null)`. | 465–477 | |

### Frame containment rules (shared)

| ID | Behavior | Source | Verified by |
|----|----------|--------|-------------|
| D25 | Containment uses **center point** of object bounds inside frame bounds. | useFrameContainment `isInsideFrame` | |
| D26 | When multiple frames overlap, **smallest by area** is chosen as parent. | useFrameContainment `findContainingFrame` | |

### Other handlers (must behave the same)

| ID | Behavior | Source | Verified by |
|----|----------|--------|-------------|
| D27 | Enter frame (e.g. double-click frame): selection becomes that frame's children (`setSelectedIds([...childIds])`). | 451–458 | |
| D28 | Transform end: resize/position snapped to grid when `snapToGridEnabled`; line-like shapes get width/height from points; `onObjectUpdate(objectId, attrs)`. | 441–462 | |
| D29 | Text change: `queueObjectUpdate(objectId, { text })`. | 432–434 | |
| D30 | After drag end handler runs, `clearDragState()` is called (clears groupDragOffset, dropTargetFrameId, frameDragOffset as per store). | 731–732 | |
