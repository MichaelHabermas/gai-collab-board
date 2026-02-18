# CollabBoard Performance Plan (Agent-Executable)

Two sections, two subsections each. Order: **most gains for least effort**.

---

## Section 1: Quick Wins (Highest Gain / Least Effort)

### 1.1 Viewport Off React Hot Path

**Goal:** Eliminate full BoardCanvas re-renders on every pan/zoom so FPS reaches ≥58.

**Steps:**

1. In `useCanvasViewport`, keep viewport in a **ref** (e.g. `viewportRef.current`) and update it inside `handleWheel`, `handleDragEnd`, and touch handlers. Do **not** call `setViewport` during active pan/zoom.
2. Drive the Konva **Stage** from that ref: either by passing the ref into the component that renders `<Stage>` and setting `stage.x()`, `stage.y()`, `scaleX()`, `scaleY()` in the same handler (or in a single rAF), or by keeping one throttled `setViewport` (e.g. every 200–300 ms) only for persistence/UI and ensuring Stage reads from the ref for the current frame.
3. Keep `useVisibleShapes` and any hit-testing using the same viewport source (ref for “current”, or the throttled state if you prefer).
4. Call `setViewport` (or sync ref → state) only when: interaction ends (e.g. drag end, wheel end) and/or on a throttle (e.g. 200 ms) for persistence in `handleViewportPersist`.

**Files:** `src/hooks/useCanvasViewport.ts`, `src/components/canvas/BoardCanvas.tsx` (Stage props / ref usage).

**Done when:** FPS benchmark (pan + zoom for 2 s) reports ≥58 on Chromium; no `setViewport` (or equivalent) on every wheel/drag frame.

---

### 1.2 useBatchDraw + Zustand for Selection

**Goal:** Fewer redundant Konva redraws and fewer re-renders when selection changes.

**Steps (useBatchDraw):**

1. In `BoardCanvas`, call `useBatchDraw()` and get `requestBatchDraw`.
2. Whenever a Konva layer must redraw after an object or selection change, call `requestBatchDraw(layerRef)` instead of calling `layer.batchDraw()` directly (or in addition, if needed). Ensure the objects layer (and any other dynamic layers) use this batching.

**Steps (Zustand selection):**

1. Add Zustand (e.g. `bun add zustand`).
2. Create a store (e.g. `src/stores/selectionStore.ts`) with state `{ selectedIds: string[] }` and actions `setSelectedIds`, `clearSelection`, etc.
3. Replace `SelectionProvider` / `SelectionContext` / `useSelection` with the store. In `BoardCanvas`, `PropertyInspector`, and any other selection consumers, use the store (e.g. `useSelectionStore((s) => s.selectedIds)` and `(s) => s.setSelectedIds`) instead of `useSelection()`.
4. Remove or bypass `SelectionProvider` and `selectionContext.ts` from the tree; keep the same selection behavior (single/multi-select, clear on empty click).

**Files:** `src/components/canvas/BoardCanvas.tsx`, `src/contexts/SelectionProvider.tsx`, `src/contexts/selectionContext.ts`, `src/components/canvas/PropertyInspector.tsx`, new `src/stores/selectionStore.ts` (or equivalent).

**Done when:** useBatchDraw is used for layer redraws; selection is in Zustand; all selection UI works; no `SelectionContext` in the app; unit/e2e for selection still pass.

---

## Section 2: Scale & Robustness (Medium Effort, High Impact)

### 2.1 Zustand Objects Store + Per-Shape Subscription

**Goal:** One remote object update re-renders only the affected shape(s); 500+ objects and 5-user propagation stay smooth.

**Steps:**

1. Create an objects store (e.g. `src/stores/objectsStore.ts`) with: `objects: Record<string, IBoardObject>`, `setObjects` / `setObject` / `updateObject` / `deleteObject` (and any needed for create). Keep the same shape as current `IBoardObject` and IDs.
2. Keep Firestore as source of truth: in `useObjects` (or a dedicated sync hook), subscribe to `subscribeToObjectsWithChanges` and on each update call the store's setters (merge/apply changes into the store). Keep optimistic updates and rollback logic; perform them against the store.
3. In `BoardView` / `App`, stop passing `objects` as a prop to `BoardCanvas`. Instead, have `BoardCanvas` (or a wrapper) get visible object IDs from the store (e.g. derive from `objects` + viewport, or keep `useVisibleShapes` but feed it from the store). For each visible id, render a shape component that subscribes to that id only, e.g. `useObjectsStore((s) => s.objects[id])`. Pass stable callbacks (e.g. from store actions) for update/delete/create so handlers don't change every render.
4. Ensure `objectsById`, `visibleObjects`, and any code that currently reads `objects` from props instead read from the store (or from a selector that derives from the store). Remove the `objects` prop from `BoardCanvas` once everything reads from the store.

**Files:** New `src/stores/objectsStore.ts` (or equivalent), `src/hooks/useObjects.ts`, `src/App.tsx`, `src/components/canvas/BoardCanvas.tsx`, `CanvasShapeRenderer` and shape components (or their parent that maps over visible IDs).

**Done when:** Object CRUD and real-time sync behave as before; only shapes whose object changed re-render; 500-object and 5-user propagation benchmarks pass or improve.

---

### 2.2 Cursor Throttle During Pan + (Optional) WebSocket Sync

**Goal:** Slightly less work during pan; optionally much better sync latency and 5-user reliability.

**Steps (cursor during pan):**

1. In the cursor update path (e.g. `handleMouseMove` in `useCursors` or where it's called from the Stage), if the Stage is in "pan" mode and the user is dragging the stage, skip or heavily throttle cursor writes (e.g. check `stage.isDragging()` or a "isPanning" flag). Ensure cursor still updates when pan ends.

**Steps (optional — WebSocket/Y.js):**
2. Only if you want to invest in sync infra: add a WebSocket server (or use a managed service) and a client that subscribes to board/room. Optionally use Y.js for CRDT merge. Sync object ops (and optionally cursors/awareness) over the WebSocket; keep or add Firestore persistence (e.g. flush Y state or ops to Firestore). Migrate `subscribeToObjects` and cursor/presence to this channel. This is a larger change; treat as a separate project with its own tasks.

**Files:** `src/hooks/useCursors.ts`, `src/components/canvas/BoardCanvas.tsx` (pan mode / stage drag); optional: new sync/websocket modules.

**Done when:** Cursor writes are skipped or throttled during pan; optional WebSocket path is scoped and tested separately.

---

**Execution order:** 1.1 → 1.2 → 2.1 → 2.2 (do 2.2 cursor part only unless you explicitly add WebSocket work).
