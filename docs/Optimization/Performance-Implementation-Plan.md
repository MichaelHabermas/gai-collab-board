# Performance Implementation Plan

**Date:** 2026-02-20
**Based on:** Performance-Analysis-Report.md
**Approach:** Incremental phases. Each phase is independently shippable and measurable. No phase depends on a later phase.

---

## Phase 0: Measurement Baseline (1-2 hours)

**Goal:** Know where we are before we optimize. Every subsequent phase must show measurable improvement.

### 0.1 Wire perfTimer into hot paths

**Files:** `src/components/canvas/BoardCanvas.tsx`, `src/hooks/useVisibleShapeIds.ts`

Add timing around:
- `useVisibleShapeIds` — full computation (spatial query + AABB filter + sort)
- `handleDragMove` — per-frame drag processing
- `handleObjectDragEnd` — multi-select resolution
- `handleSelectionDragEnd` — selection box resolution

**How:** Wrap the `useMemo` body in `useVisibleShapeIds` with `perfTime()`. Add `perfTime()` calls to drag handlers in BoardCanvas.

### 0.2 Add Konva layer draw counter

**File:** New utility or inline in `BoardCanvas.tsx`

```typescript
// In dev mode, log how many times each layer redraws per second
if (IS_DEV) {
  objectsLayerRef.current?.on('draw', () => drawCounter.tick('objects'));
}
```

This tells us whether caching (Phase 1) actually reduces draw frequency.

### 0.3 Create a stress-test board

Load or generate a board with:
- 200 shapes (mix of rects, sticky notes, text, lines)
- 10 frames with 10-20 children each
- 5 connectors

Record baseline FPS during: pan, zoom, single drag, multi-select drag (20 objects), frame drag.

**Deliverable:** `docs/Optimization/baseline-metrics.md` with FPS numbers for each operation.

---

## Phase 1: Konva Shape Caching (2-3 hours)

**Impact:** 🔴 High | **Ease:** 🟢 Easy | **Risk:** 🟢 Low

### Problem
Every visible shape re-executes its full Canvas 2D draw commands (paths, fills, strokes, shadows, text) on every Konva layer redraw — even when nothing about that shape changed.

### Solution
Use Konva's built-in `node.cache()` to rasterize each shape to an offscreen bitmap. Subsequent redraws become a single `drawImage()` call.

### Implementation

#### 1.1 Add caching to CanvasShapeRenderer

**File:** `src/components/canvas/CanvasShapeRenderer.tsx`

After the Konva node mounts, call `.cache()`. Clear cache when object properties change.

```typescript
// Inside the shape component (e.g., RectangleShape, StickyNote, Frame)
const shapeRef = useRef<Konva.Rect>(null);

// Cache on mount and when visual properties change
useEffect(() => {
  const node = shapeRef.current;
  if (!node) return;
  node.cache();
  return () => node.clearCache();
}, [object.fill, object.stroke, object.strokeWidth, object.text, object.fontSize]);
// Note: position/size changes are handled by Konva transforms, not redraw
```

**Important:** Do NOT include `x`, `y` in cache dependencies. Position changes don't require re-caching — Konva applies transforms to the cached bitmap.

#### 1.2 Cache invalidation strategy

| Property Change | Action |
|----------------|--------|
| x, y (position) | No action — transform applied to cached bitmap |
| width, height (resize) | Clear cache + re-cache |
| fill, stroke, opacity | Clear cache + re-cache |
| text, fontSize | Clear cache + re-cache |
| isSelected (visual highlight) | Clear cache + re-cache |
| isDropTarget | Clear cache + re-cache |

#### 1.3 Exclude from caching

- **Shapes being actively resized** (via Transformer) — cache would be invalidated every frame anyway.
- **Connectors** — their geometry changes whenever connected shapes move. Caching would thrash.
- **The grid** — already uses a custom `sceneFunc`, caching a huge sparse grid wastes memory.

#### 1.4 Memory budget

At 200 visible shapes averaging 200×200px at 4 bytes/pixel:
`200 × 200 × 200 × 4 = 32MB` — acceptable. Add a pixel ratio multiplier if `window.devicePixelRatio > 1`.

For shapes larger than 2000×2000px (large frames), skip caching — the bitmap would exceed 16MB alone.

### Verification
- Measure layer draw time (from Phase 0 counter). Expect 50-70% reduction.
- Visual regression: shapes should look identical (no blurriness, correct shadows).
- Test at 2x device pixel ratio.

---

## Phase 2: Static/Active Layer Splitting (3-4 hours)

**Impact:** 🔴 High | **Ease:** 🟡 Medium | **Risk:** 🟡 Medium

### Problem
During drag, Konva redraws the entire objects layer — every visible shape — even though only the selected/dragged shapes have changed position.

### Solution
Split rendering into two Konva `<Layer>` components:
- **Static Layer:** All visible shapes NOT currently being dragged/selected.
- **Active Layer:** Selected/dragged shapes only. Redraws at 60Hz.

During drag, the static layer doesn't redraw at all. Only the active layer updates.

### Implementation

#### 2.1 Partition visible shapes by state

**File:** `src/components/canvas/BoardCanvas.tsx`

```typescript
const { staticIds, activeIds } = useMemo(() => {
  const selectedSet = selectionStore.getState().selectedIds;
  const static_: string[] = [];
  const active_: string[] = [];

  for (const id of visibleShapeIds) {
    if (selectedSet.has(id)) {
      active_.push(id);
    } else {
      static_.push(id);
    }
  }

  return { staticIds: static_, activeIds: active_ };
}, [visibleShapeIds, selectedIds]);
```

#### 2.2 Render into separate layers

```tsx
{/* Static shapes — only redraws on add/delete/property changes */}
<Layer ref={staticLayerRef}>
  {staticIds.map((id) => (
    <StoreShapeRenderer key={id} id={id} {...handlers} />
  ))}
</Layer>

{/* Active shapes — redraws at 60Hz during drag */}
<Layer ref={activeLayerRef}>
  {activeIds.map((id) => (
    <StoreShapeRenderer key={id} id={id} {...handlers} />
  ))}
</Layer>
```

#### 2.3 Handle z-order

**Problem:** Active shapes must render above static shapes, but their original z-order relative to other active shapes must be preserved.

**Solution:** Active layer always renders above static layer. Within each layer, order is preserved by the `visibleShapeIds` array order (frames first, then non-frames).

**Edge case:** A non-selected shape that's visually between two selected shapes will appear below both selected shapes during drag. This is acceptable — it's temporary and resolves on drop.

#### 2.4 Layer transition on select/deselect

When selection changes:
1. Shape removed from static layer, added to active layer (or vice versa).
2. Both layers redraw once.
3. No flicker — React reconciliation handles the move atomically within a single commit.

**Concern:** During the single frame of transition, could the shape be missing from both layers? No — React batches state updates. The shape moves between layers in the same render cycle.

#### 2.5 Frame children during frame drag

When a frame is dragged, its children (via `frameDragOffset`) also move visually. These children may not be in `selectedIds`.

**Fix:** During frame drag, union frame children IDs with active IDs:
```typescript
const frameDragOffset = useDragOffsetStore((s) => s.frameDragOffset);
// If a frame is being dragged, its children should also be in the active layer
if (frameDragOffset) {
  const childIds = frameChildrenIndex.get(frameDragOffset.frameId);
  if (childIds) {
    for (const cid of childIds) activeSet.add(cid);
  }
}
```

### Verification
- During 20-object drag, static layer draw count should be 0.
- FPS during drag should improve measurably (compare to Phase 0 baseline).
- Visual: no shapes disappearing or flickering during select/deselect transitions.

---

## Phase 3: Spatial Index Drag Exemption (1 hour)

**Impact:** 🟡 Medium | **Ease:** 🟢 Easy | **Risk:** 🟢 Low

### Problem
During drag, spatial index positions are stale. If a viewport query runs while dragging, the dragged objects might be culled (position in index doesn't match their visual position).

### Solution
Add a `draggingIds` set to `SpatialIndex`. Query results always include dragging IDs regardless of spatial position.

### Implementation

**File:** `src/lib/spatialIndex.ts`

```typescript
export class SpatialIndex {
  private cells = new Map<string, Set<string>>();
  private objectCells = new Map<string, Set<string>>();
  private draggingIds = new Set<string>();

  /** Mark objects as being dragged — always included in query results. */
  setDragging(ids: Set<string>): void {
    this.draggingIds = ids;
  }

  /** Clear dragging state (call on drag end). */
  clearDragging(): void {
    this.draggingIds.clear();
  }

  query(bounds: IBounds): Set<string> {
    // ... existing cell-based query ...
    const result = new Set<string>();

    // Always include dragging objects
    for (const id of this.draggingIds) {
      result.add(id);
    }

    // Cell-based query for non-dragging objects
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(cellKey(cx, cy));
        if (cell) {
          for (const id of cell) result.add(id);
        }
      }
    }

    return result;
  }
}
```

**Integration in BoardCanvas:**
- `handleDragStart` → `spatialIndex.setDragging(selectedIds)`
- `handleDragEnd` → `spatialIndex.clearDragging()` + update positions in index

### Verification
- Drag an object to the edge of the viewport → should remain visible.
- Spatial index query count during drag should show no insert/remove operations.

---

## Phase 4: Conditional `listening` per Tool Mode (30 min)

**Impact:** 🟡 Medium | **Ease:** 🟢 Easy | **Risk:** 🟢 Low

### Problem
Konva performs hit-testing (O(visible) pixel checks) on every mouse event to determine which shape is under the cursor. When the active tool is `draw`, `text`, or `line`, shapes are not interactive — hit testing is wasted work.

### Solution
Disable `listening` on the shapes layer when the active tool doesn't require shape interaction.

### Implementation

**File:** `src/components/canvas/BoardCanvas.tsx`

```typescript
const shapesListening = tool === 'select' || tool === 'connector';

// On the objects layer(s):
<Layer ref={staticLayerRef} listening={shapesListening}>
<Layer ref={activeLayerRef} listening={shapesListening}>
```

**Note:** `listening={false}` on a Layer disables hit-testing for all children. No per-shape changes needed.

### Verification
- Switch to draw tool → move mouse rapidly over shapes → no shape hover/cursor changes (expected).
- Switch back to select tool → shapes respond to clicks normally.
- Measure mouse event handler time in draw mode vs select mode.

---

## Phase 5: Firestore Write Batching (1-2 hours)

**Impact:** 🟡 Medium | **Ease:** 🟢 Easy | **Risk:** 🟢 Low

### Problem
Individual property changes (color picker, text edits) may trigger separate Firestore writes. Rapid edits (typing, color scrubbing) generate write storms.

### Solution
Write queue with coalescing debounce. Multiple updates to the same object within the debounce window merge into a single Firestore write.

### Implementation

**File:** New `src/lib/writeQueue.ts`

```typescript
const DEBOUNCE_MS = 500;
const pendingWrites = new Map<string, Partial<IBoardObject>>();
let timer: ReturnType<typeof setTimeout> | null = null;

export function queueWrite(id: string, changes: Partial<IBoardObject>): void {
  const existing = pendingWrites.get(id) ?? {};
  pendingWrites.set(id, { ...existing, ...changes });

  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, DEBOUNCE_MS);
}

async function flush(): Promise<void> {
  const batch = new Map(pendingWrites);
  pendingWrites.clear();
  timer = null;

  // Use Firestore batch write for atomicity
  const writeBatch = writeBatch(db);
  for (const [id, changes] of batch) {
    writeBatch.update(doc(db, 'boards', boardId, 'objects', id), changes);
  }
  await writeBatch.commit();
}

// Flush on page unload
window.addEventListener('beforeunload', () => {
  if (pendingWrites.size > 0) {
    // navigator.sendBeacon or synchronous flush
    flush();
  }
});
```

**Integration:** Replace direct Firestore `updateDoc` calls with `queueWrite` for non-critical updates (property changes). Keep direct writes for structural operations (create, delete, reparent).

### Verification
- Type rapidly in a sticky note → Firestore writes should batch (check Network tab).
- Scrub color picker → single write on stop, not per-frame writes.
- Close tab mid-edit → pending writes flush via `beforeunload`.

---

## Phase 6: Future Considerations (Not Yet)

These are documented for future reference. Do NOT implement until Phases 0-5 are complete and measured.

### 6.1 Web Worker for Spatial Queries
Move `spatialIndex.query()` and `resolveParentFrameId` to a Web Worker. Main thread sends viewport bounds, worker posts back visible IDs. Frees main thread during complex containment resolution.

**Prerequisite:** Phase 0 measurements show spatial query or containment is a measurable bottleneck (>2ms per frame).

### 6.2 RBush for Large Boards
Replace grid spatial hash with RBush if boards regularly exceed 5K objects. RBush handles non-uniform clustering better and supports bulk loading.

**Prerequisite:** Real user boards hitting 5K+ objects.

### 6.3 Level-of-Detail Rendering
At extreme zoom-out, replace distant shapes with simplified representations (colored rectangles, dots). Reduce React component count for objects smaller than ~10px on screen.

**Prerequisite:** Users report zoom-out performance issues on dense boards.

### 6.4 OffscreenCanvas Rendering
Transfer the Konva stage to an OffscreenCanvas in a Web Worker. Main thread only handles input events.

**Prerequisite:** Main thread is saturated AND caching + layer splitting haven't solved it. This is a fundamental architecture change — Konva's OffscreenCanvas support is experimental.

---

## Execution Order & Dependencies

```
Phase 0 (Measurement)  ←── Must be first. All other phases reference baseline.
    │
    ├──→ Phase 1 (Shape Caching)      ←── Independent. Do first for biggest win.
    │        │
    │        └──→ Phase 2 (Layer Split) ←── Builds on caching. Caching makes static
    │                                        layer redraws near-free.
    │
    ├──→ Phase 3 (Spatial Detach)      ←── Independent. Small, safe.
    │
    ├──→ Phase 4 (listening:false)     ←── Independent. Trivial.
    │
    └──→ Phase 5 (Write Batching)      ←── Independent. Affects persistence, not rendering.
```

**Phases 1, 3, 4, 5 can proceed in parallel** after Phase 0.
**Phase 2 should follow Phase 1** (layer splitting + caching is the real combo).

---

## Risk Register

| Phase | Risk | Mitigation |
|-------|------|------------|
| 1 - Caching | Blurry shapes at high DPI | Use `pixelRatio` param in `cache()`. Test on 2x displays. |
| 1 - Caching | Memory pressure on large boards | Skip caching for shapes >2000×2000px. Add memory budget logging. |
| 2 - Layer Split | Z-order visual glitch during drag | Accept that active shapes float above static. Document as intended. |
| 2 - Layer Split | Flicker on select/deselect | React batches updates — test thoroughly. Add RAF guard if needed. |
| 2 - Layer Split | Frame children not in active layer | Union frame children IDs when frame is dragged. |
| 5 - Write Batch | Data loss on crash | `beforeunload` flush + navigator.sendBeacon fallback. |
| 5 - Write Batch | Stale data for collaborators | 500ms delay is acceptable. Critical ops (delete, create) bypass queue. |

---

## Success Criteria

| Metric | Baseline (Phase 0) | Target | Phase |
|--------|-------------------|--------|-------|
| FPS during 20-object drag | TBD | >55 FPS | 1 + 2 |
| Layer draw time (objects layer) | TBD | 50% reduction | 1 |
| Static layer draws during drag | TBD | 0 | 2 |
| Firestore writes per 10s color scrub | TBD | ≤3 | 5 |
| Mouse event handler time (draw tool) | TBD | 50% reduction | 4 |

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|-------------|
| 0 - Measurement | 1-2 hours | None |
| 1 - Shape Caching | 2-3 hours | Phase 0 |
| 2 - Layer Split | 3-4 hours | Phase 0, ideally Phase 1 |
| 3 - Spatial Detach | 1 hour | Phase 0 |
| 4 - listening:false | 30 min | None |
| 5 - Write Batching | 1-2 hours | None |
| **Total** | **~10-12 hours** | |

All phases fit within 2-3 focused sessions. Each phase produces a measurable, demo-able improvement.
