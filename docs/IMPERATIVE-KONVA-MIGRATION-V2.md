# Imperative Konva Migration Plan V2 — The Real One

> **V1 post-mortem:** V1 had the right architectural vision but lied about effort. "150-line CanvasHost" replacing a 973-line orchestrator. "Extract pure logic" from 761 lines of React hooks. Zero bitmap caching strategy. No E2E test task list. No performance baselines. This plan fixes every gap, inflates no estimate, and hides no complexity.

---

## Table of Contents

1. [Context & Rationale](#context--rationale)
2. [Architecture Overview](#architecture-overview)
3. [What Survives, Dies, Transforms](#what-survives-dies-transforms)
4. [New File Structure](#new-file-structure)
5. [Epic 0: Constitutional Amendments, Baselines, E2E Safety Net](#epic-0-constitutional-amendments-baselines-e2e-safety-net)
6. [Epic 1: Shape Factories & Core Types](#epic-1-shape-factories--core-types)
7. [Epic 2: KonvaNodeManager & LayerManager](#epic-2-konvanodemanager--layermanager)
8. [Epic 3: Event System & Drag Handlers (REWRITE)](#epic-3-event-system--drag-handlers-rewrite)
9. [Epic 4: Overlay & Transformer Managers](#epic-4-overlay--transformer-managers)
10. [Epic 5: CanvasHost & Integration](#epic-5-canvashost--integration)
11. [Epic 6: Cleanup & Performance Verification](#epic-6-cleanup--performance-verification)
12. [Migration Dependency Graph](#migration-dependency-graph)
13. [Risk Matrix](#risk-matrix)
14. [Decision Log](#decision-log)
15. [Appendix A: Honest LOC Estimates](#appendix-a-honest-loc-estimates)
16. [Appendix B: Current Architecture Inventory](#appendix-b-current-architecture-inventory)

---

## Context & Rationale

**Problem:** React-Konva puts React reconciliation in the canvas rendering hot path. Every shape is a React component. Every state change triggers diffing, bridge translation, then Konva redraw — three layers of overhead per frame.

**Evidence:** Zero fast whiteboard apps use React-Konva (Excalidraw: raw Canvas 2D, tldraw: custom Canvas 2D, Figma: WebGL+WASM, Miro: custom Canvas 2D). The pattern is universal — React for UI chrome, direct canvas for the board.

**Solution:** Replace the react-konva component tree with imperative Konva node management. The canvas becomes ONE React component (`CanvasHost`) holding a `Konva.Stage` ref. All shapes are Konva nodes created/updated/destroyed by a `KonvaNodeManager` that subscribes directly to the Zustand store. React never touches canvas internals.

**What V1 got right:** The architectural direction. Removing react-konva from the rendering hot path is the correct move.

**What V1 got wrong:**

1. Claimed 150-line CanvasHost replaces 973-line BoardCanvas (reality: ~400–500 lines)
2. Called useObjectDragHandlers (761 lines, 27 React hooks) an "extraction" (reality: full rewrite)
3. Ignored bitmap caching (StickyNote caches idle shapes as 2x bitmaps)
4. Ignored per-shape subscription model regression (current O(1) per change → plan's O(n) full-record diff)
5. Left marquee state in React (`useState`) despite removing all other React rendering — hot path still hits React reconciliation
6. No E2E test task list. No performance baselines. No connector double-update deduplication.
7. Introduced 6 classes without justifying OOP departure from functional preference

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│  React World (UI Chrome Only)                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  CanvasHost.tsx (~400-500 LOC)                       │   │
│  │  - Creates Konva.Stage                               │   │
│  │  - Instantiates all managers in useEffect            │   │
│  │  - Wires Zustand subscriptions (vanilla, not hooks)  │   │
│  │  - Renders: <div ref> + Toolbar + ControlPanel       │   │
│  │  - Re-renders ONLY on tool/color change              │   │
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
│  DragEngine           (REWRITTEN drag logic, not extracted)
│  TextEditController   (dblclick → DOM textarea, reuses canvasTextEditOverlay.ts)
│  Shape Factories      (create + update per type, with bitmap caching)
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

---

## What Survives, Dies, Transforms

### Survives Unchanged

| Module | Path | Reason |
| ------- | ----- | ------ |
| All Zustand stores | `src/stores/*` | Constitution Article V: stores may not be deleted or merged |
| Spatial index | `src/lib/spatialIndex.ts` | Module-level singleton, no React coupling |
| Write queue | `src/lib/writeQueue.ts` | Debounced Firestore writes, unchanged API |
| Object service | `src/modules/sync/objectService.ts` | Firestore CRUD |
| Realtime service | `src/modules/sync/realtimeService.ts` | Cursor/presence via RTDB |
| Alignment guides (logic) | `src/lib/alignmentGuides.ts` | Pure geometry functions |
| Canvas bounds | `src/lib/canvasBounds.ts` | AABB calculations |
| Snap to grid | `src/lib/snapToGrid.ts` | Pure geometry |
| Line transform | `src/lib/lineTransform.ts` | Connector math |
| Connector anchors | `src/lib/connectorAnchors.ts` | `getAnchorPosition()` |
| Text edit overlay | `src/lib/canvasTextEditOverlay.ts` | Verified: takes `Konva.Stage` + `Konva.Node`, zero React deps |
| Overlay positioning | `src/lib/canvasOverlayPosition.ts` | Pure geometry |
| Shadow props | `src/lib/shapeShadowProps.ts` | Konva shadow config |
| Stroke patterns | `src/lib/strokePatterns.ts` | Dash array config |
| Board canvas theme | `src/components/canvas/boardCanvasTheme.ts` | CSS var → color |
| Perf timer | `src/lib/perfTimer.ts` | Dev-only measurement |
| All UI components | `CanvasControlPanel`, `Toolbar`, `PropertyInspector`, etc. | React UI chrome |
| All types | `src/types/*` | IBoardObject, IViewportState, etc. |
| useCanvasViewport | `src/hooks/useCanvasViewport.ts` (384 LOC) | Uses `IStageRefLike` interface — works with plain Konva.Stage |
| useCanvasKeyboardShortcuts | `src/hooks/useCanvasKeyboardShortcuts.ts` | DOM keyboard, no canvas coupling |
| useCanvasOperations | `src/hooks/useCanvasOperations.ts` | Store operations, no canvas coupling |
| useBoardSubscription | `src/hooks/useBoardSubscription.ts` | Firestore subscription |
| useCursors | `src/hooks/useCursors.ts` | RTDB cursor subscription |
| useVisibleShapeIds | `src/hooks/useVisibleShapeIds.ts` (91 LOC) | Zustand selector + useMemo, zero react-konva |

### Dies (Replaced by Imperative Equivalents)

| File | Lines | Replacement | Why it can't be ported 1:1 |
| ----- | ----- | ----------- | --------------------------- |
| `BoardCanvas.tsx` | 973 | `CanvasHost.tsx` (~400-500) | 40+ React hooks, layer partitioning, dispatch pattern, RAF throttle |
| `StoreShapeRenderer.tsx` | 149 | `KonvaNodeManager.ts` | Per-shape Zustand subscriptions become manager subscription |
| `CanvasShapeRenderer.tsx` | 290 | Shape factories | Type-switch + offset calculation absorbed by factories/manager |
| `shapes/StickyNote.tsx` | 327 | `factories/createStickyNote.ts` | Bitmap caching, DOM overlay lifecycle, ref forwarding |
| `shapes/Frame.tsx` | 388 | `factories/createFrame.ts` | Store subscription for child count, DOM overlay lifecycle |
| `shapes/TextElement.tsx` | 224 | `factories/createTextElement.ts` | DOM overlay lifecycle |
| `shapes/Connector.tsx` | 191 | `factories/createConnector.ts` | 4 arrowhead mode branching |
| `shapes/RectangleShape.tsx` | 85 | `factories/createRectangle.ts` | Simplest factory |
| `shapes/CircleShape.tsx` | 93 | `factories/createCircle.ts` | Center-based positioning |
| `shapes/LineShape.tsx` | 84 | `factories/createLine.ts` | Points-based positioning |
| `TransformHandler.tsx` | 187 | `TransformerManager.ts` | React `<Transformer>` → imperative `new Konva.Transformer()` |
| `SelectionLayer.tsx` | 66 | `OverlayManager.updateMarquee()` | `<Rect>` → `new Konva.Rect()` |
| `ConnectionNodesLayer.tsx` | 72 | `OverlayManager.updateConnectionNodes()` | Zustand subscription for shape positions |
| `CursorLayer.tsx` | 74 | `OverlayManager.updateCursors()` | Group + Circle + Text per cursor |
| `AlignmentGuidesLayer.tsx` | 67 | `OverlayManager.updateGuides()` | Group + Lines |
| **react-konva** dependency | — | Removed from package.json | — |

### Transforms (Logic REWRITTEN, Not Extracted)

| Hook | Current (LOC) | New Location | Honest Assessment |
| ----- | ------------- | ------------- | ------------------- |
| `useObjectDragHandlers` | 761 | `DragEngine.ts` (~600) + `ShapeEventWiring.ts` (~150) | **Full rewrite.** 27 React hooks (9 refs, 14 useCallback, 2 useState, 1 useMemo, 1 useEffect). Handler factory maps solve a React-specific problem (callback identity for memo'd components) that doesn't exist in imperative Konva. Direct store reads in callbacks replace closure-based state access. Alignment guide cache, spatial index exemptions, frame reparenting logic preserved but restructured. |
| `useShapeDrawing` (.tsx, 250) | 250 | `DrawingController.ts` (~100) + `OverlayManager.updateDrawingPreview()` (~50) | **Rewrite.** Currently returns React-Konva JSX (`<Rect>`, `<Line>` elements). Drawing state machine (start/move/end) is simple, but JSX rendering must become imperative node creation. Ref mirror pattern for React 18 batching becomes unnecessary (no React state). |
| `useMarqueeSelection` | 127 | `MarqueeController.ts` (~80) | **Rewrite.** Currently stores `selectionRect` in React useState — every mousemove triggers React re-render. Must move to vanilla ref + direct `OverlayManager.updateMarquee()` call. AABB hit-testing logic portable as-is. |
| `useConnectorCreation` | 98 | `ConnectorController.ts` (~70) | **Moderate port.** Two-click state machine is simple. Must add explicit visual feedback for selected anchor (currently implicit via ConnectionNodesLayer re-render). |

---

## New File Structure

```text
src/canvas/                              # NEW top-level module
  CanvasHost.tsx                          # Single React component (~400-500 LOC)
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
    DragEngine.ts                        # REWRITTEN drag logic, alignment, frame reparenting (~600 LOC)
    DrawingController.ts                 # Drawing state machine (replaces useShapeDrawing) (~100 LOC)
    MarqueeController.ts                 # Marquee state machine (replaces useMarqueeSelection) (~80 LOC)
    ConnectorController.ts               # Two-click connector flow (~70 LOC)
    TextEditController.ts                # dblclick → DOM textarea (reuses canvasTextEditOverlay.ts) (~80 LOC)
```

**Estimated total new code: ~3,200 LOC** replacing ~3,500 LOC of existing code. This is a lateral rewrite in a different paradigm, not a simplification. The value is performance, not fewer lines.

---

## Epic 0: Constitutional Amendments, Baselines, E2E Safety Net

**Goal:** Establish inviolable rules for the migration, capture performance baselines before any code changes, and fill E2E test gaps that the migration will rely on as its safety net.

**Why this exists:** V1 had no Epic 0. It assumed "E2E tests written before Epic 5" without specifying which tests, left performance baselines to Epic 6 (too late — you can't measure improvement without a before), and created no rules to prevent the imperative system from diverging from the store.

### 0.1 — Constitutional Amendments

The following articles govern the imperative Konva migration. They are additive to Articles I–XIX and do not supersede them. Add these to `docs/CONSTITUTION.md` as a new amendment section.

#### Article XX — Imperative Canvas Rendering Contract

1. `KonvaNodeManager` is a **derived rendering projection** of `useObjectsStore`. Konva nodes are never the source of truth (reinforces Article I).
2. `KonvaNodeManager` must not hold stale snapshots of `IBoardObject` data. Its internal `lastObj` field is a **diff optimization cache**, not authoritative state. Any detected divergence must be resolved by re-reading the store, not by trusting the cache.
3. No imperative canvas module may call `useObjectsStore.getState().updateObject()` directly during the render/update cycle. Store mutations happen only in event handlers (drag end, text change, transform end) — never in the subscription callback that processes store changes.

#### Article XXI — Connector Endpoint Reactivity

1. When a shape moves, `KonvaNodeManager.handleStoreChange()` must update all connectors referencing that shape as an endpoint, using the `connectorsByEndpoint` index.
2. Connector updates must be **deduplicated** within a single `handleStoreChange` call. If both endpoints of a connector move in the same store change (e.g., multi-select drag), the connector must be updated exactly once, after both endpoint positions are resolved.
3. Connector endpoint updates must complete within the same `batchDraw()` call as the endpoint shape updates. No visual frame may show a connector lagging behind its endpoint.

#### Article XXII — Subscription Efficiency

1. The imperative canvas must not regress the subscription efficiency of the current per-shape model. Specifically:
   - Store change processing must be O(changed) not O(total). The `handleStoreChange` diff must short-circuit for objects whose reference identity has not changed.
   - During drag (high-frequency updates to 1–N shapes), only the dragged shapes and their connected connectors may have their Konva nodes updated. All other nodes must remain untouched.
2. `useObjectsStore.subscribe()` provides `(nextState, prevState)`. The diff must compare `nextState.objects` entries by reference identity (`prevObj === nextObj`), not deep equality. This is O(n) in the worst case but O(changed) in practice because Zustand's `updateObject` only replaces the changed entry.

#### Article XXIII — Bitmap Caching Preservation

1. Complex shapes (StickyNote: Group with bg + fold + text) must be bitmap-cached when idle (not selected, not being edited, not being dragged).
2. Cache must be cleared when a shape becomes selected, enters edit mode, or begins dragging.
3. Cache must be re-applied when a shape returns to idle state after any visual property change.
4. Cache pixel ratio must match device pixel ratio (minimum 2x) to avoid blurry rendering on HiDPI displays.
5. The factory `update()` function must invalidate cache when any visual property changes (fill, text, width, height, fontSize, opacity, textFillColor, stroke).

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

#### Article XXVI — OOP Justification

1. Imperative Konva node management requires mutable state (Konva nodes are inherently mutable objects with lifecycle methods). Classes are justified for modules that own Konva node lifecycles: `KonvaNodeManager`, `LayerManager`, `TransformerManager`, `OverlayManager`.
2. Stateless logic must remain as pure functions: `DragEngine` exports functions (not a class), `ShapeEventWiring` exports a `wireEvents()` function, shape factories export `create()`/`update()` functions.
3. Controllers with simple state machines (`DrawingController`, `MarqueeController`, `ConnectorController`) may use either closure-based modules or classes. Prefer closures unless the state management genuinely benefits from `this` context.

#### Article XXVII — Migration Safety (extends Article V)

1. Epics 1–4 are purely additive. They create new files alongside the existing system. No existing file is modified or deleted until Epic 5.
2. Epic 5 is the cut-over. It is a single atomic PR that replaces `<BoardCanvas>` with `<CanvasHost>`. This PR must pass all E2E tests.
3. Epic 6 deletes dead files. It is a separate PR from Epic 5. If Epic 5 introduces regressions discovered post-merge, Epic 6 is blocked and Epic 5 is reverted.
4. At no point during the migration may both `BoardCanvas` and `CanvasHost` be active simultaneously in production. Feature flags are acceptable for local testing only.

### 0.2 — Performance Baselines

Capture these BEFORE writing any factory code. Store results in `docs/perf-baselines/pre-migration.json`.

| Metric | How to Measure | Tool |
| ----- | --------------- | ------ |
| Frame time during 100-object drag | Chrome DevTools Performance tab, drag a selected shape for 3s, record p50/p95/p99 frame times | Chrome DevTools |
| Frame time during 500-object pan | Same, but pan across a board with 500 objects | Chrome DevTools |
| React component re-renders during drag | React DevTools Profiler, count StoreShapeRenderer re-renders during a single drag | React DevTools |
| Zustand selector evaluations per drag frame | Add `perfTime` counters inside `selectObject` and `selectGroupDragOffset` selectors, drag for 1s, log counts | Custom instrumentation |
| Bundle size (gzipped) | `bun run build && du -h dist/assets/*.js` | Build output |
| `bun run perf:check` output | Run existing perf benchmark | Existing script |
| Time-to-interactive for 1000-object board | Measure from `setAll()` to first `batchDraw()` complete | Custom `perfTime` |

**Sub-tasks:**

1. Create `docs/perf-baselines/` directory
2. Write `scripts/capture-perf-baseline.ts` that instruments the above metrics
3. Run baselines, save to `docs/perf-baselines/pre-migration.json`
4. Add baseline capture as a required step in the PR template for Epic 5 and Epic 6

### 0.3 — E2E Safety Net

Write Playwright E2E tests for every interaction the migration touches. These tests must pass against the CURRENT codebase before any migration code is written (Article XIX pattern).

| Test | File | What It Verifies |
| ----- | ----- | --------------- |
| Marquee selection | `e2e/marqueeSelection.spec.ts` | Drag empty canvas → selection rect appears → shapes inside selected → release → rect disappears |
| Single shape drag | `e2e/shapeDrag.spec.ts` | Click shape → drag → release → shape at new position → Firestore updated |
| Multi-select drag | `e2e/multiSelectDrag.spec.ts` | Select 3 shapes → drag → all 3 move together → release → all positions committed |
| Connector creation | `e2e/connectorCreation.spec.ts` | Activate connector tool → click anchor on shape A → click anchor on shape B → connector created linking A to B |
| Connector endpoint drag | `e2e/connectorEndpointDrag.spec.ts` | Create connector between A and B → drag A → connector follows A's anchor |
| Transform (resize) | `e2e/shapeResize.spec.ts` | Select shape → drag corner handle → shape resized → new dimensions committed |
| Transform (rotate) | `e2e/shapeRotate.spec.ts` | Select shape → drag rotation handle → shape rotated → rotation committed |
| Frame reparenting | `e2e/frameReparenting.spec.ts` | Drag shape into frame → shape becomes frame child → drag out → shape leaves frame |
| Frame enter (zoom) | `e2e/frameEnter.spec.ts` | Double-click frame body → viewport zooms to frame bounds |
| Text editing (sticky) | `e2e/stickyTextEdit.spec.ts` | Double-click sticky → textarea appears → type text → press Enter → text saved |
| Text editing (frame title) | `e2e/frameTitleEdit.spec.ts` | Double-click frame title → input appears → type → Enter → title saved |
| Alignment guides | `e2e/alignmentGuides.spec.ts` | Drag shape near another → guide lines appear → snap occurs |
| Snap to grid | Already exists: `e2e/snapToGridDrag.spec.ts` | Verify still passes |
| Text overlay stability | Already exists: `e2e/textOverlayStability.spec.ts` | Verify still passes |
| Undo/redo after drag | `e2e/undoRedoDrag.spec.ts` | Drag shape → undo → shape returns → redo → shape moves again |
| Keyboard shortcuts | `e2e/canvasKeyboardShortcuts.spec.ts` | Delete selected, Ctrl+Z undo, Ctrl+Y redo, Ctrl+A select all |
| Drawing tools | `e2e/drawingTools.spec.ts` | Select rectangle tool → drag on canvas → rectangle created at drag bounds |

**Sub-tasks:**

1. Write each test file listed above (12 new tests)
2. Verify all pass against current `BoardCanvas` implementation
3. Add `data-testid` selectors to any elements that need them (minimal — most exist already)
4. Document in each test file: "This test is part of the imperative Konva migration safety net. It must pass before and after the migration."

### 0.4 — Epic 0 Definition of Done

- [ ] Constitutional amendments (Articles XX–XXVII) added to `docs/CONSTITUTION.md`
- [ ] Performance baselines captured and saved to `docs/perf-baselines/pre-migration.json`
- [ ] All 12 new E2E tests written and passing against current codebase
- [ ] All existing E2E tests still pass
- [ ] `bun run validate` passes
- [ ] PR merged to `spike/state-management-cleanup-1` before any Epic 1 work begins

---

## Epic 1: Shape Factories & Core Types

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

Every factory's `create()` function sets the root node as cacheable. The `KonvaNodeManager` (Epic 2) manages the cache lifecycle:

```
Shape created → cache(pixelRatio: 2)  (Article XXIII.1)
Shape selected → clearCache()          (Article XXIII.2)
Shape deselected, no visual change → cache(pixelRatio: 2)  (Article XXIII.3)
Shape updated (visual prop changed) → clearCache() → update attrs → cache(pixelRatio: 2)  (Article XXIII.5)
Shape enters edit mode → clearCache()  (Article XXIII.2)
Shape exits edit mode → cache(pixelRatio: 2)  (Article XXIII.3)
```

Only compound shapes (StickyNote: Group, Frame: Group) benefit from bitmap caching. Simple shapes (Rect, Ellipse, Line, Arrow, Text) don't need it — they're single Konva nodes that already render in one draw call.

### Sub-Tasks

1. **Create `src/canvas/factories/types.ts`** (~40 LOC) — `IShapeNodes`, `ShapeFactory`, `ShapeUpdater`, `IShapeFactoryEntry`. Include `ICacheableShapeNodes extends IShapeNodes` with `cacheable: true` flag.

2. **Create `createRectangle.ts`** (~50 LOC) — Simplest factory.
   - `create()`: `new Konva.Rect({ id: obj.id, x, y, width, height, fill, stroke, strokeWidth, opacity, rotation, cornerRadius, dash })`.
   - `update()`: Diff each attr by reference. Only call `node.setAttr()` for changed fields. Return `true` if visual prop changed.
   - Port: `RectangleShape.tsx` (85 LOC) — straightforward, no complexity.

3. **Create `createCircle.ts`** (~50 LOC) — Center-based positioning.
   - `create()`: `new Konva.Ellipse({ id: obj.id, x: obj.x + obj.width/2, y: obj.y + obj.height/2, radiusX: obj.width/2, radiusY: obj.height/2, ... })`.
   - `update()`: Recalculate center and radii when x/y/width/height change.
   - Port: `CircleShape.tsx` (93 LOC).

4. **Create `createLine.ts`** (~50 LOC) — Points-based positioning.
   - `create()`: `new Konva.Line({ id: obj.id, x: obj.x, y: obj.y, points: obj.points, ... })`.
   - `update()`: Diff points by reference (arrays are immutable in the store).
   - Port: `LineShape.tsx` (84 LOC).

5. **Create `createConnector.ts`** (~100 LOC) — 4 arrowhead modes.
   - `create()`: Branch on `obj.arrowheads`:
     - `'end'` (default): `new Konva.Arrow(...)` — 15 LOC
     - `'start'`: `new Konva.Arrow(...)` with reversed points — 20 LOC (point reversal logic from Connector.tsx lines 110–120)
     - `'both'`: `new Konva.Group()` with 2 `Konva.Arrow` children — 30 LOC
     - `'none'`: `new Konva.Line(...)` — 10 LOC
   - `update()`: Recalculate points when linked endpoints move. If arrowhead mode changes, destroy and recreate.
   - Port: `Connector.tsx` (191 LOC) — factory is ~100 LOC, simpler without JSX conditionals.

6. **Create `createTextElement.ts`** (~60 LOC) — Text node.
   - `create()`: `new Konva.Text({ id: obj.id, x, y, width, text, fontSize, fontFamily, fill, wrap: 'word', ... })`.
   - Port: `TextElement.tsx` (224 LOC) — most of that is overlay lifecycle, handled by TextEditController.

7. **Create `createStickyNote.ts`** (~120 LOC) — Compound shape with caching.
   - `create()`: `new Konva.Group({ id: obj.id, x, y, name: 'sticky-' + obj.id })` with:
     - `Konva.Rect` (bg): fill, shadow props from `canvasShadows.ts`
     - `Konva.Rect` (fold): corner fold decoration
     - `Konva.Text` (text): wrapped text content
   - Parts map: `{ bg: bgRect, fold: foldRect, text: textNode }`
   - `update()`: Diff fill/text/width/height/fontSize/opacity/textFillColor. Update shadow props (selected vs. idle from `canvasShadows.ts`). Return `true` for visual changes.
   - Port: `StickyNote.tsx` (327 LOC) — factory handles node creation only. DOM overlay is TextEditController's job. Bitmap caching is KonvaNodeManager's job.

8. **Create `createFrame.ts`** (~130 LOC) — Compound shape with child count.
   - `create()`: `new Konva.Group({ id: obj.id, x, y, name: 'frame-' + obj.id })` with:
     - `Konva.Rect` (titleBar): gradient fill, title area
     - `Konva.Rect` (body): frame body, lighter fill
     - `Konva.Text` (title): frame title + chevron + child count badge
     - `Konva.Text` (dropHint): "Drop here" text, initially hidden
   - Parts map: `{ titleBar, body, title, dropHint }`
   - `update()`: Diff all visual props. Child count text updated by `KonvaNodeManager` (reads `frameChildrenIndex` after store change). Return `true` for visual changes.
   - **Note:** Frame's child count subscription is handled by `KonvaNodeManager`, not the factory. The factory just exposes the `title` part node for text updates.
   - Port: `Frame.tsx` (388 LOC) — factory handles node creation. Hover state, overlay, and count subscription are external.

9. **Create `src/canvas/factories/index.ts`** (~30 LOC) — Registry.

   ```typescript
   const FACTORY_REGISTRY = new Map<ShapeType, IShapeFactoryEntry>([
     ['rectangle', { create: createRectangle, update: updateRectangle }],
     ['circle', { create: createCircle, update: updateCircle }],
     // ... etc
   ]);
   export const getFactory = (type: ShapeType): IShapeFactoryEntry => { ... };
   ```

10. **Unit tests** (~200 LOC across test files) — Each factory:
    - `create()` returns correct Konva node class and structure
    - `update()` patches only changed attrs (spy on `node.setAttr`)
    - `update()` returns `true` for visual changes, `false` for position-only
    - Connector: test all 4 arrowhead modes
    - StickyNote: verify Group structure (bg + fold + text)
    - Frame: verify Group structure (titleBar + body + title + dropHint)

### Epic 1 Definition of Done

- [ ] All 7 factory files created and passing unit tests
- [ ] Registry returns correct factory for each shape type
- [ ] `bun run validate` passes
- [ ] No existing files modified
- [ ] PR merged before Epic 2 begins

---

## Epic 2: KonvaNodeManager & LayerManager

**Goal:** Build the central module that bridges Zustand stores to imperative Konva nodes, with efficient O(changed) subscription processing.

**Estimated LOC:** ~550 new lines across 3 files.

### KonvaNodeManager Design

```text
Store change detected
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

**Critical: O(changed) guarantee (Article XXII)**

The diff loop iterates all keys in `nextObjects` but immediately skips any entry where `nextObjects[id] === prevObjects[id]` (reference identity). In Zustand, `updateObject(id, updates)` creates a new `objects` record with only the updated entry replaced. So for a drag of 1 shape on a 500-shape board:

- 1 entry has a new reference → processed
- 499 entries have the same reference → skipped (1 comparison each)
- Total work: 499 reference checks + 1 factory.update + K connector updates

This matches the current per-shape subscription model's efficiency for the common case.

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
2. `handleStoreChange` processes B → queues connector C for update (already in set, deduplicated)
3. After all shapes processed, deferred connector pass runs once for C with both endpoints at final positions

Implementation: `Set<string>` for pending connector IDs, populated during shape update loop, drained after loop completes.

### LayerManager

```typescript
// ~80 LOC
interface ILayerRefs {
  static: Konva.Layer;
  active: Konva.Layer;
  overlay: Konva.Layer;
  selection: Konva.Layer;
}

// Closure-based module (Article XXVI.3: no class needed for simple state)
function createLayerManager(stage: Konva.Stage): {
  layers: ILayerRefs;
  scheduleBatchDraw: (layer: Konva.Layer) => void;
  destroy: () => void;
} {
  // Creates 4 layers, attaches to stage
  // scheduleBatchDraw coalesces to 1 RAF per frame per layer
  // destroy cancels pending RAFs
}
```

### SelectionSyncController

```typescript
// ~120 LOC
// Handles:
// 1. Moving nodes between static/active layers on selection change
// 2. Applying groupDragOffset to active layer nodes during drag
// 3. Updating bitmap cache state when selection changes (Article XXIII)
//
// Subscribes to: selectionStore, dragOffsetStore

function createSelectionSyncController(
  manager: KonvaNodeManager,
  layerManager: ILayerManagerReturn,
  transformerManager: TransformerManager
): {
  start: () => void;      // Begins subscriptions
  destroy: () => void;    // Cleans up subscriptions
}
```

### Sub-Tasks

1. **Create `LayerManager.ts`** (~80 LOC) — Creates 4 layers, attaches to stage, RAF-coalesced `scheduleBatchDraw()`.
   - Test: layer count on stage, `scheduleBatchDraw` coalesces multiple calls into 1 RAF.

2. **Create `KonvaNodeManager.ts`** (~350 LOC) — Core class.
   - `start()`: Subscribe to `useObjectsStore`, call `handleStoreChange` on every change.
   - `handleStoreChange(nextObjects, prevObjects)`: Diff loop with O(changed) skip, connector deduplication.
   - `getNode(id)`: Returns `IManagedNode` for a given object ID.
   - `getAllManagedIds()`: Returns all managed node IDs.
   - `setCacheState(id, cached)`: Enable/disable bitmap caching for a node (Article XXIII).
   - `setEditingState(id, editing)`: Track text editing for cache management.
   - `destroy()`: Unsubscribe, destroy all nodes, clear managed map.
   - **Tests:**
     - Add object to store → node created on static layer
     - Update object in store → node attrs patched, not recreated
     - Delete object from store → node destroyed, removed from layer
     - Move shape with connector → connector updated in same cycle
     - Multi-select drag of connected shapes → connector updated once (deduplication)
     - Reference-equal objects → skipped (spy on factory.update, assert not called)

3. **Create `SelectionSyncController.ts`** (~120 LOC) — Selection ↔ layer sync.
   - `onSelectionChange(nextSelectedIds, prevSelectedIds)`: Move newly selected to active, newly deselected to static. Clear cache on selected, re-cache on deselected (Article XXIII).
   - `onDragOffsetChange(offset)`: Apply offset to active layer nodes imperatively (position, not React state).
   - **Tests:**
     - Select shape → node moves to active layer
     - Deselect shape → node moves to static layer
     - Drag offset applied → active layer nodes at offset position

4. **Integration tests** — Use real Konva (headless via `konva/lib/index-node`) or jsdom. Full flow: create store → populate → verify nodes on layers → update store → verify patches → change selection → verify layer moves.

### Epic 2 Definition of Done

- [ ] KonvaNodeManager creates/updates/destroys nodes in response to store changes
- [ ] O(changed) diff verified by test (spy on factory.update for unchanged objects)
- [ ] Connector deduplication verified by test
- [ ] Selection sync moves nodes between layers
- [ ] Bitmap caching enabled/disabled on selection change
- [ ] `bun run validate` passes
- [ ] No existing files modified
- [ ] PR merged before Epic 3 begins

---

## Epic 3: Event System & Drag Handlers (REWRITE)

**Goal:** Rewrite (not extract) the event handling system. The current `useObjectDragHandlers` (761 LOC, 27 React hooks) cannot be extracted — it must be rebuilt as standalone functions that read from Zustand stores directly instead of React closures.

**Estimated LOC:** ~1,200 new lines across 7 files.

**Why "rewrite" not "extract":** The hook has 9 refs, 14 useCallbacks, handler factory maps, and ref-sync hooks. These are React-specific patterns:

- **Handler factory maps** (`getSelectHandler`, `getDragEndHandler`): Cache per-object callback identity so `memo`'d React components don't re-render. Imperative Konva nodes don't have `memo` — closures in `ShapeEventWiring.wireEvents()` naturally capture the object ID.
- **Ref-syncing** (`useObjectDragHandlersRefSync`): Keeps a ref in sync with Zustand state changes. Imperative code reads `useObjectsStore.getState()` directly.
- **useCallback dependency arrays**: Carefully tuned to avoid stale closures. Imperative code doesn't have stale closures — functions read live state from stores.

### DragEngine.ts (~600 LOC)

The largest new file. Ports the core logic from `useObjectDragHandlers` as standalone functions:

```typescript
// All functions read live state from stores — no closures, no stale state

/** Handle single click on a shape (toggle/set selection). */
function selectObject(objectId: string, metaKey: boolean): void {
  const { selectedIds, setSelectedIds, toggleSelectedId } = useSelectionStore.getState();
  if (metaKey) {
    toggleSelectedId(objectId);
  } else if (!selectedIds.has(objectId)) {
    setSelectedIds([objectId]);
  }
}

/** Called on per-node dragend. Commits position to store + Firestore. */
function commitDragEnd(
  objectId: string,
  x: number,
  y: number,
  snapToGridEnabled: boolean,
  onObjectUpdate: (id: string, updates: Partial<IBoardObject>) => void,
  onObjectsUpdate: (updates: Array<{objectId: string; updates: Partial<IBoardObject>}>) => void
): void {
  // Port of useObjectDragHandlers.handleObjectDragEnd (lines 162-360)
  // - Get selected IDs from store
  // - Compute dx/dy from original positions
  // - Snap to grid if enabled
  // - Handle frame reparenting (findContainingFrame)
  // - Call onObjectUpdate for single, onObjectsUpdate for multi
  // - Call queueObjectUpdate for each
}

/** Called on per-node dragmove (60Hz). Computes alignment guides. */
function onDragMove(
  e: Konva.KonvaEventObject<DragEvent>,
  guideCandidateBounds: IAlignmentCandidate[],
  overlayManager: OverlayManager
): void {
  // Port of useObjectDragHandlers.handleDragMove (lines 551-615)
  // - Compute alignment guides
  // - Call overlayManager.updateGuides()
  // - Drop target detection (throttled at 100ms)
}

// ... additional functions for:
// - handleTransformEnd (port of TransformHandler logic)
// - handleSelectionDragStart/Move/End (group selection box drag)
// - createDragBoundFunc (grid snap + alignment snap)
```

**Key difference from V1 plan:** V1 said "extract pure logic." Reality: every function signature changes because they read from stores directly instead of receiving values through React closures. This is a rewrite that preserves the algorithms but changes the data access pattern.

### StageEventRouter.ts (~120 LOC)

```typescript
function createStageEventRouter(
  stage: Konva.Stage,
  getActiveTool: () => ToolMode,
  controllers: {
    drawing: DrawingController;
    marquee: MarqueeController;
    connector: ConnectorController;
    viewport: { handleWheel: (e: any) => void; handleDragEnd: (e: any) => void };
    cursorBroadcast: (x: number, y: number) => void;
  }
): { destroy: () => void } {
  // Attaches mousedown/mousemove/mouseup/wheel/touchstart/touchmove/touchend to stage
  // Dispatches based on activeTool
  // RAF-throttles mousemove (drawing + marquee)
  // Returns cleanup function
}
```

### ShapeEventWiring.ts (~150 LOC)

```typescript
/** Wire all events on a newly created shape node. */
function wireEvents(
  node: Konva.Node,
  objectId: string,
  config: {
    snapToGridEnabled: () => boolean;
    canEdit: () => boolean;
    onObjectUpdate: (id: string, updates: Partial<IBoardObject>) => void;
    onObjectsUpdate: (updates: Array<{objectId: string; updates: Partial<IBoardObject>}>) => void;
    dragEngine: typeof DragEngine;
    textEditController: TextEditController;
    overlayManager: OverlayManager;
    getGuideCandidateBounds: () => IAlignmentCandidate[];
  }
): void {
  // node.on('click tap', () => DragEngine.selectObject(objectId, e.evt.metaKey))
  // node.on('dragstart', () => spatialIndex.setDragging(objectId))
  // node.on('dragmove', (e) => DragEngine.onDragMove(e, ...))
  // node.on('dragend', (e) => DragEngine.commitDragEnd(objectId, e.target.x(), e.target.y(), ...))
  // node.on('dblclick dbltap', () => textEditController.open(objectId))
  // node.draggable(config.canEdit())
  // node.dragBoundFunc(DragEngine.createDragBoundFunc(objectId, ...))
}

/** Remove all events from a node before destruction. */
function unwireEvents(node: Konva.Node): void {
  node.off('click tap dragstart dragmove dragend dblclick dbltap');
}
```

### DrawingController.ts (~100 LOC)

Replaces `useShapeDrawing` (250 LOC .tsx):

```typescript
// State stored in plain object (no React useState)
interface IDrawingState {
  isDrawing: boolean;
  startX: number; startY: number;
  currentX: number; currentY: number;
}

function createDrawingController(
  overlayManager: OverlayManager,
  onCreate: (params: ICreateObjectParams) => Promise<IBoardObject | null>
): {
  isActive: () => boolean;
  start: (coords: IPosition) => void;
  move: (coords: IPosition) => void;
  end: (tool: ToolMode, color: string) => Promise<void>;
  reset: () => void;
  destroy: () => void;
} {
  // start: set state, call overlayManager.showDrawingPreview()
  // move: update state, call overlayManager.updateDrawingPreview()
  // end: validate min size (5px), call onCreate, call overlayManager.hideDrawingPreview()
  // No React state, no JSX rendering, no ref mirror pattern
}
```

### MarqueeController.ts (~80 LOC)

Replaces `useMarqueeSelection` (127 LOC):

```typescript
// State stored in plain object (no React useState — Article XXII hot path)
function createMarqueeController(
  overlayManager: OverlayManager
): {
  isActive: () => boolean;
  start: (coords: IPosition) => void;
  move: (coords: IPosition) => void;
  end: (objects: IBoardObject[], setSelectedIds: (ids: string[]) => void) => void;
  reset: () => void;
} {
  // start: set start coords, call overlayManager.showMarquee()
  // move: update end coords, call overlayManager.updateMarquee() DIRECTLY (no React state)
  // end: AABB hit-test objects, call setSelectedIds, call overlayManager.hideMarquee()
}
```

### ConnectorController.ts (~70 LOC)

Replaces `useConnectorCreation` (98 LOC):

```typescript
function createConnectorController(
  overlayManager: OverlayManager,
  onObjectCreate: (params: ICreateObjectParams) => Promise<IBoardObject | null>,
  setActiveTool: (tool: ToolMode) => void
): {
  handleAnchorClick: (shapeId: string, anchor: ConnectorAnchor) => void;
  clear: () => void;
  getFrom: () => IConnectorFrom | null;
} {
  // First click: store from, call overlayManager.highlightAnchor(shapeId, anchor)
  // Second click: compute points, call onObjectCreate, clear state, setActiveTool('select')
  // Same click: clear (deselect)
}
```

### TextEditController.ts (~80 LOC)

```typescript
function createTextEditController(
  stage: Konva.Stage,
  nodeManager: KonvaNodeManager
): {
  open: (objectId: string) => void;
  destroy: () => void;
} {
  // open():
  //   1. Get managed node for objectId
  //   2. Determine which sub-node has the text (sticky: parts.text, frame: parts.title)
  //   3. Hide the Konva text node
  //   4. Create DOM textarea via getOverlayRectFromLocalCorners + attachOverlayRepositionLifecycle
  //   5. On blur/Enter: read textarea, call queueObjectUpdate(id, { text }), restore Konva text, destroy textarea
  //   6. Tell nodeManager: setEditingState(id, true/false) for cache management
  // Reuses canvasTextEditOverlay.ts and canvasOverlayPosition.ts UNCHANGED
}
```

### Sub-Tasks

1. **Create `DragEngine.ts`** (~600 LOC) — Rewrite drag logic as standalone functions. Port algorithms from `useObjectDragHandlers`, change all state access to direct store reads.
2. **Create `ShapeEventWiring.ts`** (~150 LOC) — `wireEvents(node, objectId, config)` and `unwireEvents(node)`.
3. **Create `StageEventRouter.ts`** (~120 LOC) — Stage-level event dispatch. RAF-throttled mousemove.
4. **Create `DrawingController.ts`** (~100 LOC) — Drawing state machine, no React state.
5. **Create `MarqueeController.ts`** (~80 LOC) — Marquee state machine, no React state, direct overlay updates.
6. **Create `ConnectorController.ts`** (~70 LOC) — Two-click connector flow with anchor highlight feedback.
7. **Create `TextEditController.ts`** (~80 LOC) — Port dblclick→textarea pattern. Reuses `canvasTextEditOverlay.ts`.
8. **Unit tests** (~300 LOC):
   - DragEngine: selectObject toggles selection, commitDragEnd calls queueObjectUpdate, multi-select drag computes correct offsets
   - ShapeEventWiring: wireEvents attaches correct listeners (spy on `node.on`)
   - DrawingController: state transitions (start → move → end), min size validation
   - MarqueeController: AABB hit-testing selects correct shapes
   - ConnectorController: two-click creates connector, same-shape click clears

### Epic 3 Definition of Done

- [ ] All 7 event system files created and passing unit tests
- [ ] DragEngine preserves all drag algorithms (grid snap, alignment, frame reparenting)
- [ ] MarqueeController uses no React state (plain object)
- [ ] TextEditController reuses canvasTextEditOverlay.ts unchanged
- [ ] `bun run validate` passes
- [ ] No existing files modified
- [ ] PR merged before Epic 5 begins (may merge in parallel with Epic 4)

---

## Epic 4: Overlay & Transformer Managers

**Goal:** Imperatively manage all non-shape canvas elements on the overlay and selection layers.

**Estimated LOC:** ~490 new lines across 4 files.

### OverlayManager (~250 LOC)

Replaces 4 React components (SelectionLayer 66 LOC, ConnectionNodesLayer 72 LOC, CursorLayer 74 LOC, AlignmentGuidesLayer 67 LOC) plus drawing preview from useShapeDrawing.

```typescript
class OverlayManager {
  private overlayLayer: Konva.Layer;

  // Marquee (replaces SelectionLayer.tsx)
  private marqueeRect: Konva.Rect | null = null;

  // Alignment guides (replaces AlignmentGuidesLayer.tsx)
  private guidesGroup: Konva.Group | null = null;

  // Drawing preview (replaces useShapeDrawing renderDrawingPreview)
  private drawingPreviewNode: Konva.Shape | null = null;

  // Remote cursors (replaces CursorLayer.tsx)
  private cursorNodes = new Map<string, Konva.Group>();

  // Connection anchors (replaces ConnectionNodesLayer.tsx)
  private anchorNodes: Konva.Circle[] = [];
  private highlightedAnchor: { shapeId: string; anchor: ConnectorAnchor } | null = null;

  // ── Marquee ──
  showMarquee(): void;
  updateMarquee(rect: ISelectionRect): void;
  hideMarquee(): void;

  // ── Alignment Guides ──
  updateGuides(guides: IAlignmentGuides | null): void;

  // ── Drawing Preview ──
  showDrawingPreview(tool: ToolMode, color: string): void;
  updateDrawingPreview(state: IDrawingState, tool: ToolMode, color: string): void;
  hideDrawingPreview(): void;

  // ── Remote Cursors ──
  updateCursors(cursors: Cursors, currentUid: string): void;

  // ── Connection Anchors ──
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

**Data passing for ConnectionNodes (gap identified in V1 review):** `CanvasHost` subscribes to `objectsStore.objects` specifically for when `activeTool === 'connector'`. When tool changes to `'connector'`, it calls `overlayManager.updateConnectionNodes(visibleShapeIds, objects, connectorController.handleAnchorClick)`. When tool changes away, it calls `overlayManager.clearConnectionNodes()`.

### TransformerManager (~120 LOC)

Ports `TransformHandler.tsx` (187 LOC) to imperative:

```typescript
class TransformerManager {
  private transformer: Konva.Transformer;
  private selectionLayer: Konva.Layer;

  constructor(selectionLayer: Konva.Layer) {
    this.transformer = new Konva.Transformer({
      // Exact same config as TransformHandler.tsx lines 148-181
      flipEnabled: false,
      rotateEnabled: true,
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
      rotationSnapTolerance: 5,
      enabledAnchors: ['top-left', 'top-center', 'top-right', 'middle-right',
                        'bottom-right', 'bottom-center', 'bottom-left', 'middle-left'],
      anchorSize: 8,
      anchorCornerRadius: 2,
      anchorStroke: '#3b82f6',
      anchorFill: '#ffffff',
      anchorStrokeWidth: 1,
      borderStroke: '#3b82f6',
      borderStrokeWidth: 1,
      borderDash: [3, 3],
      boundBoxFunc: (oldBox, newBox) =>
        Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10 ? oldBox : newBox,
    });
    selectionLayer.add(this.transformer);
  }

  /** Update which nodes the transformer attaches to. */
  syncNodes(selectedIds: string[], activeLayer: Konva.Layer, excludeIds?: string[]): void {
    // Port of TransformHandler useEffect (lines 40-49)
    const transformableIds = excludeIds?.length
      ? selectedIds.filter(id => !excludeIds.includes(id))
      : selectedIds;
    const nodes = transformableIds
      .map(id => activeLayer.findOne(`#${id}`))
      .filter((n): n is Konva.Node => n != null);
    this.transformer.nodes(nodes);
  }

  /** Port of TransformHandler.handleTransformEnd (lines 52-141). */
  handleTransformEnd(onTransformEnd: (id: string, attrs: ITransformEndAttrs) => void): void {
    // Exact port of shape-aware attr extraction:
    // Group (sticky/frame), Ellipse, Line/Arrow, Rect branches
  }

  destroy(): void {
    this.transformer.destroy();
  }
}
```

### GridRenderer (~40 LOC)

Port of the grid `sceneFunc` from BoardCanvas:

```typescript
function createGridRenderer(layer: Konva.Layer, viewport: IViewportState): {
  update: (viewport: IViewportState) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
}
```

### SelectionDragHandle (~40 LOC)

Imperative replacement for the `SelectionDragHandle` component in BoardCanvas:

```typescript
function createSelectionDragHandle(activeLayer: Konva.Layer): {
  update: (bounds: { x: number; y: number; width: number; height: number } | null) => void;
  destroy: () => void;
}
```

### Sub-Tasks

1. **Create `OverlayManager.ts`** (~250 LOC) — All overlay subsystems.
2. **Create `TransformerManager.ts`** (~120 LOC) — Port TransformHandler exactly.
3. **Create `GridRenderer.ts`** (~40 LOC) — Port grid sceneFunc.
4. **Create `SelectionDragHandle.ts`** (~40 LOC) — Port group drag selection rect.
5. **Unit tests** (~150 LOC):
   - OverlayManager: each subsystem creates/updates/hides correct nodes
   - TransformerManager: syncNodes attaches to correct nodes, handleTransformEnd extracts correct attrs per shape type
   - Connection anchor click wiring

### Epic 4 Definition of Done

- [ ] OverlayManager handles all 5 overlay subsystems
- [ ] TransformerManager config matches TransformHandler exactly
- [ ] Grid renders correctly at different zoom levels
- [ ] `bun run validate` passes
- [ ] No existing files modified
- [ ] PR merged before Epic 5 begins (may merge in parallel with Epic 3)

---

## Epic 5: CanvasHost & Integration

**Goal:** Build `CanvasHost.tsx` and swap it in for `BoardCanvas.tsx`. This is the cut-over epic — the first moment existing files change.

**Estimated LOC:** ~400–500 LOC for CanvasHost + ~50 LOC for import change.

**Why ~400-500 LOC, not 150:** CanvasHost must:

- Create Konva.Stage and attach to div ref (~15 LOC)
- Instantiate all managers with correct dependency injection (~40 LOC)
- Wire 5 Zustand subscriptions (objects, selection, dragOffset, viewport, cursors) (~80 LOC)
- Wire surviving React hooks (useCanvasViewport, useCanvasKeyboardShortcuts, useCanvasOperations, useBoardSubscription, useCursors, useVisibleShapeIds) (~60 LOC)
- Handle tool/color state and pass to StageEventRouter (~30 LOC)
- Handle window resize and stage resize (~20 LOC)
- Handle viewport persistence (debounced save) (~20 LOC)
- Wire connection anchor visibility based on activeTool (~15 LOC)
- Handle frame child count updates in KonvaNodeManager (~20 LOC)
- Cleanup on unmount (~15 LOC)
- Render UI chrome children (Toolbar, ControlPanel) (~20 LOC)
- Handle board-level operations (copy, paste, delete, select all) (~40 LOC)
- Error boundaries for imperative code (~20 LOC)
- Total: **~395 LOC minimum**

### CanvasHost Structure

```typescript
export function CanvasHost({ boardId }: { boardId: string }): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [activeColor, setActiveColor] = useState('#000000');
  const activeToolRef = useRef<ToolMode>('select');

  // Surviving hooks (no canvas rendering, just logic/state)
  const { viewport, handleWheel, handleDragEnd, ... } = useCanvasViewport({ stageRef });
  const visibleShapeIds = useVisibleShapeIds(viewport);
  useBoardSubscription(boardId);
  const { cursors } = useCursors(boardId);
  useCanvasKeyboardShortcuts(...);
  const { onObjectCreate, onObjectUpdate, onObjectsUpdate, ... } = useCanvasOperations(boardId);

  // Mount: create Stage + all managers
  useEffect(() => {
    if (!containerRef.current) return;

    const stage = new Konva.Stage({ container: containerRef.current, width, height });
    const layerManager = createLayerManager(stage);
    const nodeManager = new KonvaNodeManager(layerManager, getFactory);
    const transformerManager = new TransformerManager(layerManager.layers.selection);
    const overlayManager = new OverlayManager(layerManager.layers.overlay);
    const selectionSync = createSelectionSyncController(nodeManager, layerManager, transformerManager);
    // ... controllers (drawing, marquee, connector, textEdit)
    const stageRouter = createStageEventRouter(stage, () => activeToolRef.current, { ... });

    // Zustand subscriptions (vanilla, not hooks)
    const unsubObjects = useObjectsStore.subscribe(
      (state) => state.objects,
      (next, prev) => nodeManager.handleStoreChange(next, prev)
    );
    // ... more subscriptions

    nodeManager.start();
    selectionSync.start();

    return () => {
      // Destroy everything in reverse order
      stageRouter.destroy();
      selectionSync.destroy();
      nodeManager.destroy();
      overlayManager.destroy();
      transformerManager.destroy();
      layerManager.destroy();
      stage.destroy();
      unsubObjects();
      // ... more unsubs
    };
  }, [boardId]); // Re-mount on board change

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

Before merging Epic 5, every item must be verified:

| Feature | How to Verify | Pass? |
| ------- | -------------- | ----- |
| Shape rendering (all 7 types) | Visual inspection + E2E | |
| Shape selection (click) | Click shape → blue border | |
| Multi-select (Shift+click) | Shift+click → multiple selected | |
| Marquee selection | Drag empty area → selection rect → shapes selected | |
| Shape drag (single) | Drag selected → position updates → Firestore | |
| Shape drag (multi) | Drag one of many selected → all move together | |
| Snap to grid | Enable grid → drag → snaps to 20px grid | |
| Alignment guides | Drag near another shape → guide lines appear | |
| Frame reparenting | Drag into/out of frame → parent changes | |
| Connector creation | Connector tool → click anchors → connector appears | |
| Connector follows endpoints | Drag connected shape → connector repositions | |
| Text editing (sticky) | Double-click sticky → textarea → type → save | |
| Text editing (frame) | Double-click frame title → input → type → save | |
| Transform (resize) | Drag handle → shape resizes | |
| Transform (rotate) | Drag rotate handle → shape rotates | |
| Undo/redo | Ctrl+Z / Ctrl+Y after any operation | |
| Keyboard shortcuts | Delete, Ctrl+A, etc. | |
| Pan (drag mode) | Space+drag or middle mouse → canvas pans | |
| Zoom (scroll) | Scroll → zoom in/out | |
| Touch (pinch-to-zoom) | Mobile: pinch → zoom | |
| Remote cursors | Second client → cursor appears | |
| Grid rendering | Toggle grid → grid lines appear/disappear | |
| Viewport persistence | Pan/zoom → refresh → same viewport | |
| Drawing tools | Select tool → drag → shape created | |
| Frame child count | Add shape to frame → count badge updates | |
| Frame hover | Hover frame → highlight stroke | |
| Bitmap caching | Idle shapes cached → drag uncaches → release recaches | |

### Sub-Tasks

1. **Create `CanvasHost.tsx`** (~400-500 LOC) — Build the complete integration component.
2. **Wire all surviving hooks** — Verify `useCanvasViewport` works with plain Konva.Stage ref.
3. **Wire all Zustand subscriptions** — Objects, selection, dragOffset as vanilla subscriptions.
4. **Replace `<BoardCanvas>` import** — Single import swap in parent component.
5. **Run full E2E suite** — All 12+ Epic 0 tests must pass.
6. **Run performance comparison** — Capture post-migration baselines, compare to pre-migration.
7. **Manual test matrix** — Every row in the integration checklist above verified.

### Epic 5 Definition of Done

- [ ] `<CanvasHost>` renders and manages all shape types
- [ ] All E2E tests pass (including 12 new from Epic 0)
- [ ] All items in integration checklist verified
- [ ] Performance baselines captured (post-migration)
- [ ] `bun run validate` passes
- [ ] PR reviewed and merged

---

## Epic 6: Cleanup & Performance Verification

**Goal:** Delete dead code, remove react-konva dependency, verify performance improvements against baselines.

**This is a SEPARATE PR from Epic 5.** If Epic 5 introduces regressions discovered post-merge, Epic 6 is blocked and Epic 5 can be reverted without losing the deleted files (Article XXVII.3).

### Deletion Manifest

| File | Action |
| ----- | ------ |
| `src/components/canvas/BoardCanvas.tsx` | Delete |
| `src/components/canvas/StoreShapeRenderer.tsx` | Delete |
| `src/components/canvas/CanvasShapeRenderer.tsx` | Delete |
| `src/components/canvas/shapes/StickyNote.tsx` | Delete |
| `src/components/canvas/shapes/Frame.tsx` | Delete |
| `src/components/canvas/shapes/TextElement.tsx` | Delete |
| `src/components/canvas/shapes/Connector.tsx` | Delete |
| `src/components/canvas/shapes/RectangleShape.tsx` | Delete |
| `src/components/canvas/shapes/CircleShape.tsx` | Delete |
| `src/components/canvas/shapes/LineShape.tsx` | Delete |
| `src/components/canvas/TransformHandler.tsx` | Delete |
| `src/components/canvas/SelectionLayer.tsx` | Delete |
| `src/components/canvas/ConnectionNodesLayer.tsx` | Delete |
| `src/components/canvas/CursorLayer.tsx` | Delete |
| `src/components/canvas/AlignmentGuidesLayer.tsx` | Delete |
| `src/components/canvas/shapes/index.ts` | Keep only `STICKY_COLORS`, `StickyColor` exports |
| `src/hooks/useObjectDragHandlers.ts` | Delete |
| `src/hooks/useShapeDrawing.tsx` | Delete |
| `src/hooks/useMarqueeSelection.ts` | Delete |
| `src/hooks/useConnectorCreation.ts` | Delete |
| `src/hooks/useAlignmentGuideCache.ts` | Delete (absorbed by DragEngine) |
| `src/hooks/useObjectDragHandlersRefSync.ts` | Delete (unnecessary in imperative model) |
| `src/hooks/useShapeDragHandler.ts` | Delete (absorbed by ShapeEventWiring) |
| `react-konva` in `package.json` | Remove from dependencies |

### Performance Verification

Compare against Epic 0 baselines in `docs/perf-baselines/pre-migration.json`:

| Metric | Pre-Migration (baseline) | Post-Migration (target) | How to Measure |
| ------ | ----------------------- | ---------------------- | --------------- |
| React re-renders during drag | N (visible shapes) | 0 (only UI chrome) | React DevTools Profiler |
| Frame time: 100-object drag (p95) | Baseline | ≤ baseline × 0.5 | Chrome DevTools |
| Frame time: 500-object pan (p95) | Baseline | ≤ baseline × 0.5 | Chrome DevTools |
| Zustand selector evals per drag frame | N per shape | 1 (manager subscription) | Custom instrumentation |
| Bundle size (gzipped) | Baseline | Baseline - ~45KB (react-konva) | Build output |
| Time-to-interactive: 1000 objects | Baseline | ≤ baseline × 0.8 | Custom perfTime |
| `bun run perf:check` | Baseline | ≥ baseline | Existing script |

**Target: ≥50% reduction in drag frame times.** If we don't hit this, the migration wasn't worth the effort and we need to investigate why.

### Sub-Tasks

1. **Delete all files in the manifest above** — One commit.
2. **Remove `react-konva` from `package.json`** — `bun install`.
3. **Update `shapes/index.ts`** — Keep only `STICKY_COLORS` and `StickyColor`.
4. **Fix any orphaned imports** — `bun run validate` will catch these.
5. **Capture post-migration performance baselines** — Save to `docs/perf-baselines/post-migration.json`.
6. **Compare pre vs. post** — Write comparison report in PR description.
7. **Update `CLAUDE.md`** — Component chain documentation: `CanvasHost → KonvaNodeManager → Shape Factories`.
8. **Update `CONSTITUTION.md`** — Remove grandfathered react-konva references if any exist.
9. **Run `bun run release:gate`** — Full release validation.

### Epic 6 Definition of Done

- [ ] All dead files deleted
- [ ] `react-konva` removed from package.json
- [ ] `bun run validate` passes
- [ ] Performance comparison shows ≥50% reduction in drag frame times
- [ ] No regressions in any E2E test
- [ ] `bun run release:gate` passes
- [ ] CLAUDE.md updated
- [ ] PR merged

---

## Migration Dependency Graph

```text
Epic 0: Rules + Baselines + E2E
  │
  ▼
Epic 1: Shape Factories ──────────┐
  │                                │
  ▼                                ▼
Epic 2: KonvaNodeManager    Epic 3: Event System (can start after E1, parallel with E2)
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
- Epic 3 and Epic 4 can proceed in parallel

**Hard dependencies:**

- Epic 0 must complete before Epic 1 starts (baselines + rules + E2E)
- Epic 1 must complete before Epic 2 starts (factories are inputs to manager)
- Epics 2, 3, 4 must all complete before Epic 5 starts
- Epic 5 must be stable before Epic 6 starts

---

## Risk Matrix

| Risk | Severity | Likelihood | Impact | Mitigation |
| ----- | ---------- | ------------ | ------ | ------------ |
| Feature regression on cut-over | 🔴 Critical | Medium | Users lose functionality | 12 E2E tests from Epic 0 run on every PR. Manual test matrix in Epic 5. |
| Per-shape subscription regression | 🔴 Critical | Low | Drag perf worse than before | Article XXII mandates O(changed). Reference equality check in diff loop. Perf test verifies. |
| Connector endpoint visual lag | 🔴 Critical | Medium | Connectors visually detach during drag | Article XXI.3 mandates same-batchDraw update. Deduplication prevents double-update. Unit test verifies. |
| Bitmap caching not restored | 🟡 High | Medium | Complex shapes render slower when idle | Article XXIII mandates cache lifecycle. KonvaNodeManager tracks `isCached` per node. |
| Marquee causes React re-render | 🟡 High | Low (mitigated) | 60Hz React reconciliation on marquee drag | MarqueeController uses plain state, not useState. No React in the path. |
| `lastObj` diverges from store | 🟡 High | Low | Stale shape rendering | Article XX.2 mandates store re-read on divergence. Dev-mode assertion checks. |
| Text overlay positioning broken | 🟡 Medium | Low | Textarea appears in wrong place | `canvasTextEditOverlay.ts` verified to work with any Konva.Node. E2E tests cover this. |
| Z-order mismatch | 🟡 Medium | Medium | Frames render on top of shapes | Frames `moveToBottom()` on static layer. Unit test verifies. |
| Memory leaks (undestroyed nodes) | 🟡 Medium | Medium | Memory grows over session | `removeNode` calls `node.destroy()`. Dev-mode leak detection (node count vs managed map). |
| Bundle doesn't shrink | 🟢 Low | Low | No bundle size improvement | react-konva is ~45KB gzipped. Removal is guaranteed improvement. |
| Touch/mobile regression | 🟡 Medium | Medium | Pinch-to-zoom breaks | StageEventRouter wires touch events. Manual test on mobile. |
| Frame child count not updating | 🟡 Medium | Low | Frame badge shows wrong count | KonvaNodeManager reads `frameChildrenIndex` after store change. Unit test. |

---

## Decision Log

| Decision | Rationale | Alternatives Considered |
| ------- | --------- | ---------------------- |
| Rewrite useObjectDragHandlers, don't extract | 27 React hooks, handler factory maps, ref-sync hooks — all React-specific patterns. Extraction would produce Frankenstein code. | Extract as-is with React hooks removed (rejected: leaves dead patterns) |
| Classes for node lifecycle managers, functions for stateless logic | Konva nodes are inherently mutable objects with lifecycle. Classes are justified per Article XXVI. Stateless logic stays functional. | All classes (rejected: unnecessary OOP for pure functions), All closures (rejected: lifecycle management gets messy) |
| O(changed) diff via reference equality, not per-shape subscriptions | Per-shape subscriptions would require N `subscribe()` calls (one per managed node). Reference equality check is O(1) per object, O(changed) in practice. | Per-shape Zustand subscriptions (rejected: 500 subscribe/unsubscribe per board load), Full deep diff (rejected: O(n × fields) per change) |
| Separate PR for Epic 5 (cut-over) and Epic 6 (cleanup) | If Epic 5 has regressions, Epic 6 hasn't deleted the old code yet. Revert Epic 5 safely. | Single PR for cut-over + cleanup (rejected: can't revert without losing file deletions) |
| Epic 0 with constitutional amendments | V1 had no rules governing the imperative system. Constitution prevents divergence, mandates cache preservation, enforces O(changed). | Start coding immediately (rejected: learned from V1 review that missing rules = missing features) |
| MarqueeController uses plain object, not React state | useState in the marquee hot path causes React re-render on every mousemove. Plain state + direct overlay call keeps React out of the 60Hz path. | Keep useState (rejected: defeats purpose of removing React from rendering path) |
| Connector deduplication via Set in handleStoreChange | Multi-select drag of connected shapes would update the connector once per endpoint. Set ensures single update with final positions. | No deduplication (rejected: visual glitch where connector jumps), Post-processing pass (rejected: adds complexity for same result) |

---

## Appendix A: Honest LOC Estimates

| File | Estimated LOC | Confidence | Notes |
| ----- | ------------- | ------------ | ----- |
| `CanvasHost.tsx` | 400–500 | High | Counted responsibilities: 15 mount + 40 DI + 80 subscriptions + 60 hooks + 30 tool state + 20 resize + 20 persistence + 15 anchors + 20 frame counts + 15 cleanup + 20 render + 40 board ops + 20 errors |
| `KonvaNodeManager.ts` | 350 | High | Core class: diff loop ~100, create/update/destroy ~80, connector dedup ~60, cache management ~40, public API ~30, types ~40 |
| `DragEngine.ts` | 600 | Medium | Rewrite of 761 LOC hook minus React patterns. Algorithms preserved, access patterns changed. Some reduction from removing useCallback/useMemo wrappers. |
| `OverlayManager.ts` | 250 | High | 5 subsystems × ~50 LOC each |
| `ShapeEventWiring.ts` | 150 | High | wireEvents + unwireEvents + dragBoundFunc creation |
| `TransformerManager.ts` | 120 | High | Direct port of 187 LOC component minus JSX |
| `SelectionSyncController.ts` | 120 | Medium | Layer sync + drag offset + cache state |
| `StageEventRouter.ts` | 120 | High | Event dispatch + RAF throttle |
| `DrawingController.ts` | 100 | High | Simple state machine |
| `createConnector.ts` | 100 | High | 4 arrowhead branches |
| `createFrame.ts` | 130 | Medium | Compound shape + title/count text |
| `createStickyNote.ts` | 120 | High | Compound shape + fold + shadow |
| All other factories | 260 | High | 4 simple factories × 50 + registry 30 + types 40 |
| `MarqueeController.ts` | 80 | High | Simple state machine + AABB |
| `TextEditController.ts` | 80 | Medium | Reuses existing overlay lib |
| `ConnectorController.ts` | 70 | High | Two-click state machine |
| `GridRenderer.ts` | 40 | High | sceneFunc port |
| `SelectionDragHandle.ts` | 40 | High | Single rect management |
| **Total new code** | **~3,200** | — | Replacing ~3,500 LOC of existing code |
| **Total new tests** | **~800** | — | Unit + integration across all epics |

---

## Appendix B: Current Architecture Inventory

Grounded measurements of every file this migration touches:

| File | Lines | React Hooks | Key Complexity |
| ----- | ----- | ------------- | --------------- |
| `BoardCanvas.tsx` | 973 | 40+ (11 useState, 16 useCallback, 11 useMemo, 10 useRef, 2 useEffect) | Dispatch pattern, layer partitioning, RAF throttle, viewport persistence |
| `useObjectDragHandlers.ts` | 761 | 27 (2 useState, 14 useCallback, 1 useMemo, 9 useRef, 1 useEffect) | Handler factory maps, alignment guide cache, spatial index exemptions, frame reparenting |
| `Frame.tsx` | 388 | 14 (3 useState, 5 useCallback, 3 useMemo, 2 useRef, 1 useEffect) | Store subscription for child count, DOM overlay lifecycle, hover state |
| `StickyNote.tsx` | 327 | 12 (3 useState, 4 useCallback, 2 useMemo, 3 useRef, 2 useEffect) | Bitmap caching, DOM overlay lifecycle, ref forwarding |
| `CanvasShapeRenderer.tsx` | 290 | 1 (useMemo) | Type switch + offset calculation |
| `useShapeDrawing.tsx` | 250 | 6 (1 useState, 3 useCallback, 2 useRef) | JSX rendering, ref mirror for React 18 batching |
| `TextElement.tsx` | 224 | ~10 | DOM overlay lifecycle |
| `Connector.tsx` | 191 | 0 | 4 arrowhead mode branches |
| `TransformHandler.tsx` | 187 | 3 (2 useRef, 1 useEffect) | Shape-aware transform attrs |
| `StoreShapeRenderer.tsx` | 149 | 3 selectors | Per-shape Zustand subscription model |
| `useMarqueeSelection.ts` | 127 | 6 (2 useState, 2 useCallback, 2 useRef) | AABB hit-testing |
| `useConnectorCreation.ts` | 98 | 4 (1 useState, 1 useCallback, 1 useRef, 1 useEffect) | Two-click state machine |
| `CircleShape.tsx` | 93 | ~4 | Center-based positioning |
| `RectangleShape.tsx` | 85 | ~4 | Simplest shape |
| `LineShape.tsx` | 84 | ~4 | Points-based |
| `CursorLayer.tsx` | 74 | 0 | Group + Circle + Text per cursor |
| `ConnectionNodesLayer.tsx` | 72 | 3 (1 useCallback, 1 useMemo, 1 store selector) | Zustand read for shape positions |
| `AlignmentGuidesLayer.tsx` | 67 | 2 (2 useMemo) | Group + Lines |
| `SelectionLayer.tsx` | 66 | 2 (2 useMemo) | Single Rect |
| **Total dying code** | **~4,561** | **~139** | — |

This inventory is why V1's "150-line CanvasHost" claim was fantasy. You're replacing 4,561 lines containing 139 React hooks. The new system will be ~3,200 lines with zero React hooks in the canvas path — but it's a rewrite, not a magic simplification.
