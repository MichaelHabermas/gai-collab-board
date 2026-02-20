# Wave 5 — Deep Performance Analysis & Plan

**Date:** 2026-02-20
**Baseline:** Wave 4 complete (763/763 tests, index.js = 538.75 KB)

---

## Methodology

Five parallel deep-analysis passes across the entire codebase:

1. **Bundle composition** — Vite build output, chunk splitting, deferred loading opportunities
2. **Algorithmic complexity** — O(n²) patterns, hot loops, data structure choices
3. **Firestore & network** — Read/write efficiency, subscription patterns, memory leaks
4. **React render cascades** — useEffect audit, callback stability, memo coverage, derived state
5. **Canvas/Konva internals** — Layer strategy, spatial indexing, caching, render scheduling

---

## Scoring Model

Same formula as prior waves:

`Score = (Improvement × 0.40) + (Risk × 0.30) + (Ease × 0.20) + (Wow × 0.10)`
`Priority % = (Score / 5) × 100`

Scale: 1 (worst) → 5 (best). Risk = safety (5 = very safe, 1 = dangerous).

---

## Priority Table

| # | Task | Priority % | Improvement | Risk | Ease | Wow | Category | Status |
|---|------|-----------|-------------|------|------|-----|----------|--------|
| 1 | Spatial indexing (grid hash) for viewport culling + frame containment | **82%** | 5 | 4 | 3 | 4 | Canvas | Planned |
| 2 | Selection data structure: Array → Set | **78%** | 4 | 5 | 4 | 3 | Algorithm | Planned |
| 3 | Alignment guide computation: spatial hash + lazy candidates | **76%** | 4 | 4 | 3 | 4 | Canvas | Planned |
| 4 | Lazy-load OpenAI client (102 KB) | **74%** | 3 | 5 | 5 | 2 | Bundle | Planned |
| 5 | Grid caching: off-screen canvas instead of Rect nodes | **72%** | 3 | 5 | 4 | 3 | Canvas | Planned |
| 6 | Konva shape caching for idle sticky notes | **70%** | 4 | 3 | 3 | 4 | Canvas | Planned |
| 7 | Lazy-load Firebase RTDB (~80-120 KB) | **68%** | 3 | 4 | 4 | 2 | Bundle | Planned |
| 8 | Linked connector IDs: precomputed index | **66%** | 3 | 4 | 4 | 2 | Algorithm | Planned |
| 9 | Fix missing useEffect dependency (BoardCanvas:1111) | **66%** | 2 | 5 | 5 | 1 | Correctness | Planned |
| 10 | Batch drag-move canvas updates via RAF | **64%** | 3 | 4 | 3 | 3 | Canvas | Planned |
| 11 | Firestore: eliminate redundant getBoard() reads | **62%** | 2 | 4 | 4 | 2 | Network | Planned |
| 12 | Frame children lookup: cached index | **60%** | 2 | 5 | 4 | 1 | Algorithm | Planned |
| 13 | Pending updates memory leak: timeout cleanup | **58%** | 2 | 4 | 4 | 1 | Network | Planned |
| 14 | CanvasShapeRenderer dragBoundFunc: useCallback wrap | **56%** | 1 | 5 | 5 | 1 | React | Planned |
| 15 | AIChatPanel scroll: useLayoutEffect | **52%** | 1 | 5 | 5 | 1 | React | Planned |

---

## Detailed Task Descriptions

### 1. Spatial Indexing — Grid Hash (82%)

**Goal:** Replace O(n) linear scan for viewport culling and O(n×m) frame containment with O(1) cell lookups.

**Why it matters:** Every viewport change (pan/zoom) iterates ALL objects in `useVisibleShapeIds.ts:23-27`. During drag, `findContainingFrame()` in `useFrameContainment.ts:34-44` iterates all frames for EVERY dragged object per mousemove tick. At 500+ objects this dominates frame time.

**Current:**
```
Viewport change → O(n) filter all objects against bounds
Frame drag → O(n × frames) containment check per 100ms tick
Alignment guides → O(n²) nested loop comparing every visible object
```

**Target:**
```
Viewport change → O(cells_in_viewport) hash lookup
Frame drag → O(1) cell query for containing frame
Alignment guides → O(nearby_cells) spatial query
```

**Implementation:**
- Create `src/lib/spatialIndex.ts` with grid-based spatial hash (cell size ~500px)
- Maintain object→cell mapping, invalidate on object move/resize only
- Replace `useVisibleShapeIds` filter with cell range query
- Replace `findContainingFrame` linear scan with cell lookup
- Feed alignment guide candidates from spatial neighbors only

**Estimated impact:** 30-50% improvement on boards with 100+ objects. Negligible overhead on small boards.

**Files to touch:**
- `src/lib/spatialIndex.ts` — **new**
- `src/hooks/useVisibleShapeIds.ts` — replace filter with spatial query
- `src/hooks/useFrameContainment.ts` — replace linear scan
- `src/hooks/useAlignmentGuideCache.ts` — narrow candidate set

---

### 2. Selection Data Structure: Array → Set (78%)

**Goal:** Eliminate O(n) `Array.includes()` and `Array.filter()` on selection hot paths.

**Why it matters:** `selectionStore.ts` stores `selectedIds: string[]`. Every `includes()` check during drag/click is O(n). Selection toggle uses `.filter()` (O(n)) followed by spread (another O(n)). Multi-select of 50+ objects makes these visible.

**Current:**
```
selectedIds.includes(id)     → O(n) per check
selectedIds.filter(...)      → O(n) per toggle
```

**Target:**
```
selectedIds.has(id)          → O(1) per check
selectedIds.delete(id)       → O(1) per toggle
```

**Implementation:**
- Change `selectedIds: string[]` to `selectedIds: Set<string>` in selectionStore
- Update all consumers (spread to array where needed for React iteration)
- Keep `setSelectedIds` API accepting both `string[]` and `Set<string>`
- Expose `selectIsSelected(id): boolean` selector for per-shape checks

**Files to touch:**
- `src/stores/selectionStore.ts` — Set-based store
- `src/components/canvas/BoardCanvas.tsx` — selection logic
- `src/components/canvas/StoreShapeRenderer.tsx` — isSelected check
- `src/components/canvas/PropertyInspector.tsx` — selectedIds iteration
- Tests referencing `selectedIds`

**Risk note:** Zustand's default equality check uses `Object.is()`. Sets are reference types, so every `set(new Set(...))` triggers subscribers. Use `subscribeWithSelector` + shallow compare on `.size` where appropriate.

---

### 3. Alignment Guide Computation: Spatial + Lazy (76%)

**Goal:** Reduce alignment guide computation from O(n²) to O(nearby objects) during drag.

**Why it matters:** `useAlignmentGuideCache.ts:38` builds candidate bounds from ALL visible objects. `computeAlignmentGuidesWithCandidates()` compares dragged object edges against every candidate. At 200 visible objects this is 200² = 40,000 comparisons per drag tick.

**Current:**
```
Drag tick → get ALL visible object bounds → compare each to dragged object → O(n²)
```

**Target:**
```
Drag tick → query spatial index for nearby objects (±snap threshold) → compare only neighbors → O(k) where k << n
```

**Implementation:**
- Reuse spatial index from Task 1
- Query cells within snap distance of dragged object bounds
- Feed only nearby candidates to `computeAlignmentGuidesWithCandidates()`
- Cache candidate bounds between drag ticks (invalidate on viewport change only)

**Files to touch:**
- `src/hooks/useAlignmentGuideCache.ts` — spatial query for candidates
- `src/lib/spatialIndex.ts` — range query API

**Depends on:** Task 1 (spatial index)

---

### 4. Lazy-load OpenAI Client (74%)

**Goal:** Defer 102 KB OpenAI client SDK from initial bundle to first AI interaction.

**Why it matters:** OpenAI client is instantiated at module level in `src/lib/openai.ts`. It's pulled into the main chunk even though AI features are optional and lazy-loaded behind the AI chat panel. 102 KB is 19% of the current index.js.

**Current:** `import OpenAI from 'openai'` at module top level → always in main bundle.

**Target:** Dynamic `import('openai')` on first AI call → 102 KB deferred.

**Implementation:**
- Wrap OpenAI instantiation in a lazy singleton: `let client: OpenAI | null = null; async function getClient() { ... }`
- All callers already go through `useAI` hook which can await initialization
- No user-facing latency impact (AI panel already lazy-loaded)

**Files to touch:**
- `src/lib/openai.ts` — lazy instantiation
- `src/hooks/useAI.ts` — await client initialization

**Estimated bundle impact:** index.js 538.75 KB → ~436 KB (−102 KB, −19%)

---

### 5. Grid Caching: Off-screen Canvas (72%)

**Goal:** Stop re-rendering hundreds of Konva `<Rect>` nodes for the grid on every viewport change.

**Why it matters:** `BoardCanvas.tsx:1347-1396` creates a memoized array of `<Rect>` elements for the grid. On every pan/zoom, the entire grid is recalculated and re-rendered as individual Konva nodes. For a typical viewport, this can be 50-200 Rect elements.

**Current:**
```
Viewport change → useMemo recalculates grid Rects → Konva renders 50-200 Rect nodes
```

**Target:**
```
Viewport change → render grid to off-screen canvas once → drawImage() to grid layer
Invalidate only on: zoom level change or grid toggle
Pan → just translate the cached image (no re-render)
```

**Implementation:**
- Create `src/lib/gridRenderer.ts` with off-screen canvas grid rendering
- Use `layer.cache()` or manual canvas for grid pattern
- On pan: translate cached grid (CSS transform or Konva layer offset)
- On zoom: invalidate and re-render grid image
- Remove Rect-based grid entirely

**Files to touch:**
- `src/lib/gridRenderer.ts` — **new**
- `src/components/canvas/BoardCanvas.tsx` — replace grid Rects with cached layer

---

### 6. Konva Shape Caching for Idle Sticky Notes (70%)

**Goal:** Use Konva's `cache()` API to rasterize idle sticky notes, avoiding per-frame text layout recalculation.

**Why it matters:** Sticky notes are the most visually complex shapes: text rendering (font, wrap, ellipsis), background, fold effect, shadow. Each re-render triggers full canvas text layout. Zero use of Konva's `cache()` API exists in the codebase.

**When to cache:** Shape is not selected, not being edited, text hasn't changed.
**When to invalidate:** Selection change, text edit start, resize, fill change.

**Implementation:**
- Add `cache()` call to StickyNote Group ref after render when idle
- Track cache validity via key: `(fill, text, fontSize, width, height)`
- Call `clearCache()` on selection or edit start
- Extend pattern to Frame body (background + title bar) later

**Files to touch:**
- `src/components/canvas/shapes/StickyNote.tsx` — add cache lifecycle
- `src/components/canvas/shapes/Frame.tsx` — optional, phase 2

**Risk:** Cached shapes look pixelated when zooming. Invalidate cache on zoom level change (round to nearest 0.25x step).

---

### 7. Lazy-load Firebase RTDB (68%)

**Goal:** Defer Firebase Realtime Database SDK (~80-120 KB) until presence features are needed.

**Why it matters:** RTDB is only used for cursor presence (`usePresence.ts`, `useCursorSync.ts`). It's imported eagerly but not needed until a user joins a board with other collaborators.

**Implementation:**
- Dynamic `import('firebase/database')` in usePresence/useCursorSync hooks
- Initialize RTDB connection lazily on first board join
- Solo users never load RTDB at all

**Files to touch:**
- `src/hooks/usePresence.ts` — lazy RTDB import
- `src/hooks/useCursorSync.ts` — lazy RTDB import
- `src/lib/firebase.ts` — conditional RTDB initialization

**Estimated bundle impact:** index.js ~436 KB → ~316-356 KB (−80-120 KB)

---

### 8. Linked Connector IDs: Precomputed Index (66%)

**Goal:** Replace O(n) `filter().map()` for finding connectors linked to a shape with O(1) index lookup.

**Why it matters:** `StoreShapeRenderer.tsx` computes linked connector IDs via filter+map on every render for shapes that have connectors. When dragging a shape connected to many others, this runs every frame.

**Current:**
```
Object.values(objects).filter(o => o.type === 'connector' && (o.fromId === id || o.toId === id)).map(o => o.id)
```

**Target:**
```
connectorIndex.get(shapeId) → Set<string> of connector IDs  // O(1)
```

**Implementation:**
- Add `connectorIndex: Map<string, Set<string>>` to objectsStore
- Update index on setObject/updateObject/deleteObject for connector types
- Expose `selectLinkedConnectorIds(shapeId)` selector
- StoreShapeRenderer subscribes to this selector instead of computing inline

**Files to touch:**
- `src/stores/objectsStore.ts` — add connector index + selector
- `src/components/canvas/StoreShapeRenderer.tsx` — use new selector

---

### 9. Fix Missing useEffect Dependency (66%)

**Goal:** Fix correctness bug — `useEffect` at `BoardCanvas.tsx:1111-1113` has NO dependency array, running on every render.

**Current:**
```typescript
useEffect(() => {
  setGuidesThrottledRef.current = setGuidesThrottled;
});  // ← missing dependency array!
```

**Fix:**
```typescript
useEffect(() => {
  setGuidesThrottledRef.current = setGuidesThrottled;
}, [setGuidesThrottled]);
```

**Files to touch:**
- `src/components/canvas/BoardCanvas.tsx:1111-1113`

---

### 10. Batch Drag-move Canvas Updates via RAF (64%)

**Goal:** Consolidate multiple store updates during a single drag tick into one requestAnimationFrame callback.

**Why it matters:** `handleDragMove` in `BoardCanvas.tsx:1220-1255` calls `setFrameDragOffset()` and `setDropTargetFrameId()` separately, triggering two store updates → two subscriber notifications → two potential re-renders per mouse event at 60Hz.

**Implementation:**
- Use existing `useBatchDraw` pattern to collect drag-move updates
- Coalesce `setFrameDragOffset` + `setDropTargetFrameId` into single RAF tick
- Apply snap position to node in same batch

**Files to touch:**
- `src/components/canvas/BoardCanvas.tsx` — batch drag handlers
- `src/hooks/useBatchDraw.ts` — extend batch API if needed

---

### 11. Firestore: Eliminate Redundant getBoard() Reads (62%)

**Goal:** Remove double-read pattern in board mutation functions.

**Why it matters:** `boardService.ts` functions (`updateBoardName`, `addBoardMember`, `removeBoardMember`, `updateMemberRole`, `deleteBoard`) all call `getBoard(boardId)` before every write to check authorization. That's 2 Firestore operations per action (100-200ms overhead per mutation).

**Fix:** Use Firestore transactions that read + write atomically, or move authorization to security rules.

**Files to touch:**
- `src/services/boardService.ts` — transaction-based mutations

---

### 12. Frame Children Lookup: Cached Index (60%)

**Goal:** Replace repeated `Object.values(objects).filter(o => o.parentFrameId === frameId)` with a precomputed index.

**Why it matters:** During multi-select drag with frames, `getFrameChildren()` is called per frame per drag tick. Each call is O(n) over all objects.

**Implementation:**
- Add `frameChildrenIndex: Map<string, Set<string>>` to objectsStore
- Update on parentFrameId changes
- Expose `selectFrameChildren(frameId)` selector

**Files to touch:**
- `src/stores/objectsStore.ts` — add frame children index
- `src/hooks/useFrameContainment.ts` — use index

---

### 13. Pending Updates Memory Leak: Timeout Cleanup (58%)

**Goal:** Add timeout-based cleanup for pending Firestore updates that never resolve.

**Why it matters:** If a Firestore write hangs or the user goes offline, pending update entries accumulate without cleanup. Over a long session this leaks memory.

**Implementation:**
- Add 30-second timeout per pending update entry
- On timeout: remove entry, log warning
- Consider periodic sweep every 60 seconds

**Files to touch:**
- `src/hooks/useObjects.ts` — pending update cleanup

---

### 14. CanvasShapeRenderer dragBoundFunc: useCallback (56%)

**Goal:** Wrap inline arrow function in `CanvasShapeRenderer.tsx:117-127` with `useCallback`.

**Why it matters:** The `dragBoundFunc` prop receives a new function reference every render, causing Konva to detect a prop change and potentially re-bindthe event.

**Files to touch:**
- `src/components/canvas/CanvasShapeRenderer.tsx`

---

### 15. AIChatPanel Scroll: useLayoutEffect (52%)

**Goal:** Replace `useEffect` with `useLayoutEffect` for scroll-to-bottom in `AIChatPanel.tsx:64-66`.

**Why it matters:** `useEffect` fires after paint, causing a visible flash where new messages appear without scroll. `useLayoutEffect` fires before paint, ensuring smooth scroll.

**Files to touch:**
- `src/components/ai/AIChatPanel.tsx`

---

## Execution Strategy

### Phase A — Quick Wins (Tasks 4, 5, 7, 9, 14, 15)

Low-risk, high-confidence changes. Can be done in parallel. No architectural changes.

**Expected outcome:**
- Bundle: 538 KB → ~316-356 KB (−35-40%)
- Fix correctness bug (missing dep array)
- Minor render quality improvements

### Phase B — Data Structure Upgrades (Tasks 2, 8, 12)

Change internal data representations. Moderate risk, high impact on algorithmic complexity.

**Expected outcome:**
- Selection operations: O(n) → O(1)
- Connector lookups: O(n) → O(1)
- Frame children: O(n) → O(1)
- Cumulative: 20-30% improvement on interaction-heavy workflows

### Phase C — Canvas Architecture (Tasks 1, 3, 5, 6, 10)

Deeper canvas rendering changes. Higher effort, highest impact on large boards.

**Expected outcome:**
- Viewport culling: O(n) → O(cells)
- Alignment guides: O(n²) → O(nearby)
- Grid rendering: 50-200 Rect nodes → 1 cached image
- Shape rendering: per-frame text layout → cached raster
- Cumulative: 30-50% improvement on 100+ object boards

### Phase D — Network (Tasks 11, 13)

Backend efficiency. Independent of other phases.

**Expected outcome:**
- Board mutations: −100-200ms per operation
- Memory leak eliminated

---

## Parallel Safety Matrix

| Task | Safe to parallel with | Cannot parallel with |
|------|----------------------|---------------------|
| 1 (Spatial index) | 2, 4, 7, 9, 11, 13, 14, 15 | 3 (depends on 1), 5 (shared canvas), 6 (shared canvas) |
| 2 (Selection Set) | 1, 4, 5, 6, 7, 9, 11, 13, 15 | 8 (shared store), 14 (shared renderer) |
| 3 (Alignment spatial) | 4, 7, 9, 11, 13, 14, 15 | 1 (depends on 1), 5 (shared canvas) |
| 4 (Lazy OpenAI) | All except 7 | 7 (both touch bundle/imports) |
| 5 (Grid cache) | 2, 4, 7, 8, 9, 11, 12, 13, 14, 15 | 1, 3, 6, 10 (shared canvas layers) |
| 6 (Shape cache) | 2, 4, 7, 8, 9, 11, 12, 13, 15 | 1, 5, 10, 14 (shared canvas/shapes) |
| 7 (Lazy RTDB) | All except 4 | 4 (both touch bundle/imports) |
| 8 (Connector index) | 1, 3, 4, 5, 6, 7, 9, 11, 12, 13, 15 | 2, 14 (shared store/renderer) |
| 9 (Fix dep array) | All | — (isolated line fix) |
| 10 (RAF batch drag) | 2, 4, 7, 8, 9, 11, 12, 13, 14, 15 | 1, 3, 5, 6 (shared drag/canvas) |
| 11 (Firestore txn) | All except 13 | 13 (shared service layer) |
| 12 (Frame index) | All except 8 | 8 (shared objectsStore index) |
| 13 (Pending leak) | All except 11 | 11 (shared service layer) |
| 14 (dragBoundFunc) | 1, 3, 4, 5, 7, 9, 11, 12, 13, 15 | 2, 6, 8 (shared renderer/store) |
| 15 (useLayoutEffect) | All | — (isolated file) |

---

## Cumulative Impact Estimate

| Metric | Current (Post-Wave 4) | After Phase A | After Phase B | After Phase C |
|--------|-----------------------|---------------|---------------|---------------|
| index.js bundle | 538.75 KB | ~316-356 KB | ~316-356 KB | ~316-356 KB |
| Viewport cull (500 obj) | O(n) ~1.2ms | ~1.2ms | ~1.2ms | **O(cells) ~0.1ms** |
| Selection includes (50 sel) | O(n) ~0.05ms | ~0.05ms | **O(1) ~0.001ms** | ~0.001ms |
| Alignment guides (200 vis) | O(n²) ~2-5ms | ~2-5ms | ~2-5ms | **O(k) ~0.2ms** |
| Frame containment (drag) | O(frames) ~0.04ms | ~0.04ms | **O(1) ~0.002ms** | ~0.002ms |
| Connector lookup | O(n) ~0.1ms | ~0.1ms | **O(1) ~0.001ms** | ~0.001ms |
| Grid render (pan) | 50-200 Rects | 50-200 Rects | 50-200 Rects | **1 cached image** |
| Board mutation latency | +100-200ms overhead | +100-200ms | +100-200ms | — (Phase D) |

---

## Findings That Were Ruled Out

### Already Optimized (No Action Needed)
- **Per-shape Zustand subscriptions** — StoreShapeRenderer pattern is excellent, each shape subscribes independently
- **Handler caching** — selectHandlerMapRef, dragEndHandlerMapRef prevent handler recreation
- **React Context** — Zero usage, Zustand-only architecture is correct
- **React.memo coverage** — All major components wrapped (BoardCanvas, BoardView, StoreShapeRenderer, CanvasShapeRenderer, Frame, StickyNote, RightSidebar, etc.)
- **Grid `listening={false}`** — Already applied to non-interactive layers
- **Cursor write throttling** — 16ms normal, 200ms during pan
- **Batch Firestore writes** — `writeBatch` used for multi-object CRUD
- **CursorLayer conditional render** — Only mounts when remote cursors exist

### Considered But Deferred
- **Web Workers for alignment/containment** — Latency of postMessage exceeds computation time. Spatial indexing (Task 1) is better ROI.
- **WASM for spatial queries** — Overkill for current object counts. Revisit at 5000+ objects.
- **Virtual scrolling for sidebar lists** — Board lists are small (typically <50). Not worth the complexity.
- **Service Worker caching** — Firebase SDK already handles offline. Additional caching adds complexity for minimal gain.
- **Konva layer separation (static vs dynamic)** — The per-shape subscription pattern already limits redraws to affected shapes. Full layer separation would require significant refactoring for 10-20% gain.

---

## Appendix: React Render Audit Summary

### useEffect Census (Wave 5 additions to existing USE-EFFECT-CENSUS.md)

| Location | Deps | Verdict |
|----------|------|---------|
| BoardCanvas:1111-1113 | **NONE** (runs every render) | **BUG** — add `[setGuidesThrottled]` |
| BoardCanvas:208-210 | `[objects]` | OK — ref sync |
| BoardCanvas:279-281 | `[activeTool, isMiddlePanning]` | OK — ref sync |
| BoardCanvas:296-300 | `[activeTool, ...]` | OK — ref sync |
| BoardCanvas:1286-1299 | `[objects, dragBoundFuncCacheRef]` | OK — stale handler cleanup |
| AIChatPanel:64-66 | `[messages]` | Should be `useLayoutEffect` (Task 15) |
| App.tsx:114-123 | `[boardId]` | OK — subscription |
| App.tsx:126-140 | `[board, user, boardId, skipAutoJoinBoardIdRef]` | Minor: remove ref from deps |

### Callback Stability Issues

| Location | Issue | Severity |
|----------|-------|----------|
| CanvasShapeRenderer:117-127 | Inline `dragBoundFunc` arrow fn | Medium — new ref every render |
| BoardCanvas:1762 | Inline `onDragStart` arrow fn | Low — only renders with 2+ selected |
| BoardCanvas:1932-1943 | Inline zoom preset onClick in loop | Low — UI buttons, not hot path |
