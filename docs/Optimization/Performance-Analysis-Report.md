# Performance Analysis Report: Deep Dive Research vs. CollabBoard Reality

**Date:** 2026-02-20
**Scope:** Evaluating techniques from "Engineering High-Performance Spatial Canvas Engines" against our current React-Konva + Zustand + Firestore architecture.

---

## Executive Summary

The research paper proposes a "zero-trust redesign" — WASM/Rust core, WebGL renderer, Signia signals, Yjs CRDTs, OffscreenCanvas workers. That's Figma-scale engineering for a Figma-scale team. We're not Figma. But buried in the academic ambition are **5-6 concrete, high-ROI techniques** we can adopt within our existing stack, and 2-3 medium-term upgrades that would meaningfully change our performance ceiling.

**Bottom line:** We've already done the hard React-level work (per-shape subscriptions, extracted drag state, spatial hash culling). The next gains come from **Konva-level caching, smarter spatial indexing during drags, and offloading computation to workers** — not from rewriting the renderer.

---

## 1. What The Research Gets Right (And We Already Do)

These are areas where our architecture already implements the core insight, even if the mechanism differs from the paper's proposal.

### 1.1 Viewport Culling via Spatial Index

**Paper:** R*-tree with RBush for sub-millisecond viewport queries.
**Us:** Grid-based spatial hash (500px cells) in `src/lib/spatialIndex.ts`.
**Assessment:** Our approach is correct and likely *faster* for our scale. Grid hashes are O(1) per cell vs R-tree's O(log n). For boards under 50K objects, grid hash wins. R-tree's advantage only appears with wildly non-uniform distributions or when objects span huge size ranges. **No change needed.**

### 1.2 Decoupled Drag State

**Paper:** "Sync a single Transformation Delta applied to the group container" instead of updating every child.
**Us:** `dragOffsetStore.ts` holds `frameDragOffset` and `groupDragOffset`. Children apply offset at render time. Only selected shapes subscribe to the 60Hz updates.
**Assessment:** This is exactly the paper's recommendation, implemented in Zustand instead of CRDTs. We already fixed the `groupDragOffset`-in-useMemo bug (LESSONS.md, 2026-02-20). **No change needed.**

### 1.3 O(1) Relationship Lookups

**Paper:** Recommends hierarchical indexes for group/child relationships.
**Us:** `frameChildrenIndex: Map<frameId, Set<childIds>>` and `connectorsByEndpoint` index in objects store. `selectFrameChildCount` is a numeric selector, not an array filter.
**Assessment:** **Already solid.** Dual-index rebuild is O(n) but only triggers on structural changes, not position updates.

### 1.4 Batch Drawing

**Paper:** GPU draw call batching.
**Us:** `useBatchDraw` hook consolidates multiple Konva layer.batchDraw() calls into single RAF frame.
**Assessment:** Different mechanism (canvas vs GPU), same principle. **Adequate for Canvas 2D.**

---

## 2. What We Can Adopt — High Impact, Low Risk

These techniques from the research paper map directly onto improvements we can make within our existing React-Konva stack.

### 2.1 Konva Shape Caching (Bitmap Caching)

**Paper Reference:** "Flatten the group into a cached bitmap (Bitmap Caching) and draw it as a single image."
**Current State:** We don't use Konva's `.cache()` at all.
**Opportunity:** Konva's `node.cache()` rasterizes a shape to an offscreen canvas. Subsequent redraws blit the bitmap instead of re-executing all draw commands. This is massive for complex shapes (sticky notes with text, frames with borders/shadows/labels).

| Metric | Before Cache | After Cache |
|--------|-------------|-------------|
| Draw cost per frame | Full path + fill + stroke + shadow | Single `drawImage()` |
| Memory | None | ~width×height×4 bytes per shape |
| Invalidation | Automatic | Manual `.clearCache()` on property change |

**Impact:** 🔴 High — every visible shape's per-frame draw cost drops to a single blit.
**Ease:** 🟢 Easy — call `.cache()` after mount and `.clearCache()` on property change.
**Risk:** 🟢 Low — Konva has first-class support. Memory overhead is manageable (<10MB for 200 visible shapes at 200×200 avg).

### 2.2 Spatial Index Detach During Group Drag

**Paper Reference:** "Remove the group's MBR from the global R-tree. Move the group. Re-index only after drop."
**Current State:** Our spatial index is a module-level singleton, incrementally updated. During drag, we update `dragOffsetStore` but the spatial index still reflects pre-drag positions. This means `useVisibleShapeIds` queries against stale positions during drag.
**Opportunity:** This is actually *almost* what we do — we don't re-index during drag. But we should formalize it:

1. Mark dragging objects as "exempt" from spatial queries during drag (they're always visible while dragged).
2. Skip spatial index updates entirely during drag.
3. Rebuild affected entries on drop.

**Impact:** 🟡 Medium — prevents any accidental spatial index churn during drag.
**Ease:** 🟢 Easy — add a `draggingIds: Set<string>` to the spatial index, union them into query results.
**Risk:** 🟢 Low — purely additive change.

### 2.3 Dirty Flag System for Layers

**Paper Reference:** "Dirty flag percolates up. Engine only traverses branches marked dirty."
**Current State:** Konva redraws the entire objects layer on any change. Our `useBatchDraw` consolidates draws but doesn't skip unchanged regions.
**Opportunity:** Konva supports multiple layers natively. We can split into:

- **Static layer:** Objects not being interacted with (majority). Redraws only on object add/delete/property change.
- **Active layer:** Currently selected/dragged objects. Redraws at 60Hz.

During drag, only the active layer redraws. Static shapes are untouched.

**Impact:** 🔴 High — reduces per-frame draw count from O(visible) to O(selected) during drag.
**Ease:** 🟡 Medium — requires splitting shape rendering across two Konva `<Layer>` components and managing layer transitions on select/deselect.
**Risk:** 🟡 Medium — layer transitions could cause visual flicker if not handled carefully. Z-order across layers needs attention.

### 2.4 Throttled/Debounced Firestore Persistence

**Paper Reference:** "Incremental saves... storing only the binary update since the last snapshot."
**Current State:** `onObjectsUpdate` fires on drag end with batch updates. But individual property changes (color, text) likely trigger immediate writes.
**Opportunity:** Batch all Firestore writes through a write queue with a 500ms debounce. Coalesce multiple updates to the same object into a single write.

**Impact:** 🟡 Medium — reduces Firestore write costs and network congestion.
**Ease:** 🟢 Easy — write queue is a small utility.
**Risk:** 🟢 Low — worst case is 500ms data loss on tab close (mitigated by beforeunload flush).

### 2.5 Konva `listening: false` on Non-Interactive Shapes

**Paper Reference:** General hit-testing optimization.
**Current State:** We set `listening={false}` on the grid layer and some overlays, but individual shapes still have hit detection enabled even when not in select mode.
**Opportunity:** When the active tool is not `select` or `connector`, disable listening on all shapes. This eliminates Konva's hit-test traversal on every mouse event.

**Impact:** 🟡 Medium — eliminates O(visible) hit-test computation during draw/text modes.
**Ease:** 🟢 Easy — conditional `listening` prop based on active tool.
**Risk:** 🟢 Low — Konva handles this natively.

---

## 3. What We Could Adopt — Medium Impact, Medium Effort

### 3.1 Web Worker for Spatial Queries & Containment

**Paper Reference:** "OffscreenCanvas and Web Workers... decoupled from the main thread."
**Current State:** All computation runs on the main thread.
**Opportunity:** Move spatial index queries and frame containment detection to a Web Worker. During drag, the worker computes drop targets and alignment candidates asynchronously, posting results back to the main thread.

**Impact:** 🟡 Medium — frees main thread for rendering during drag.
**Ease:** 🟡 Medium — requires SharedArrayBuffer or structured cloning for position data. Worker communication adds latency (~1-2ms).
**Risk:** 🟡 Medium — worker setup complexity; debugging cross-thread issues.

### 3.2 R-tree Replacement (RBush) for Large Boards

**Paper Reference:** "RBush — a high-performance JavaScript R-tree implementation."
**Current State:** Grid spatial hash with 500px cells.
**Opportunity:** If boards consistently exceed 5K objects, RBush would provide better worst-case performance for non-uniform distributions (e.g., thousands of objects clustered in one area with empty space elsewhere). RBush also supports bulk loading which is faster than our cell-by-cell insertion during snapshot load.

**Impact:** 🟡 Medium — only matters at scale (5K+ objects).
**Ease:** 🟡 Medium — RBush is a drop-in library (~8KB), but API differs from our grid hash.
**Risk:** 🟢 Low — well-tested library, used by Mapbox/Leaflet.

### 3.3 Virtual/Hybrid Rendering for Extreme Object Counts

**Paper Reference:** "Instanced Drawing — reusing a single geometry for multiple positions."
**Current State:** Each visible shape is a full React component with Konva nodes.
**Opportunity:** For object counts >1000 visible, switch distant/small objects to a simplified "dot" or "outline" representation. Only objects within a detail threshold get full rendering.

**Impact:** 🟡 Medium — enables smooth zoom-out on dense boards.
**Ease:** 🟡 Medium — requires LOD (level-of-detail) logic in the culling pipeline.
**Risk:** 🟡 Medium — visual quality trade-off; users might notice the transition.

---

## 4. What We Should NOT Adopt

### 4.1 WASM/Rust Core Engine

**Paper's Big Idea:** Rewrite the scene graph in Rust, compile to WASM.
**Why Not:**

- **ROI is negative** at our scale. We're not hitting 10K+ objects.
- Eliminates React-Konva's developer experience (event handling, component model).
- 3-6 month rewrite for marginal gains we can achieve with caching + layer splitting.
- Debugging WASM is painful. Development velocity matters more than raw FPS for our stage.

### 4.2 WebGL Renderer

**Paper's Recommendation:** Replace Canvas 2D with WebGL for GPU-accelerated drawing.
**Why Not:**

- Konva uses Canvas 2D. Switching to WebGL means abandoning Konva entirely.
- Text rendering in WebGL is unsolved (requires SDF fonts or canvas-to-texture).
- Our bottleneck is React reconciliation and JS computation, not rasterization.
- Canvas 2D handles 1K-10K objects fine — that's our range.

### 4.3 Yjs/CRDT Replacement for Firestore

**Paper's Recommendation:** Replace the persistence layer with Yjs CRDTs + PartyKit/Hocuspocus.
**Why Not:**

- Firestore already handles our collaboration needs (real-time listeners, offline support).
- Yjs adds ~50KB to bundle and requires a separate sync server.
- Our collaboration model is simple (no concurrent text editing within shapes).
- The migration risk vastly outweighs the sync performance gain.

### 4.4 @tldraw/state (Signia) Signals

**Paper's Recommendation:** Replace React state with epoch-based lazy signals.
**Why Not:**

- We already achieve the same effect with Zustand's per-shape selectors.
- Signia is tightly coupled to tldraw's architecture.
- Zustand is 1KB, battle-tested, and we've built significant infrastructure on it.
- Switching reactive systems is a rewrite, not an upgrade.

---

## 5. Impact vs. Effort Matrix

```
              LOW EFFORT          MEDIUM EFFORT         HIGH EFFORT
            ┌─────────────────┬─────────────────────┬──────────────────┐
HIGH        │ Shape Caching   │ Layer Splitting      │                  │
IMPACT      │ (2.1)           │ (2.3)                │                  │
            ├─────────────────┼─────────────────────┼──────────────────┤
MEDIUM      │ Spatial Detach  │ Web Worker Offload   │ RBush Migration  │
IMPACT      │ (2.2)           │ (3.1)                │ (3.2)            │
            │ listening:false  │ LOD Rendering        │                  │
            │ (2.5)           │ (3.3)                │                  │
            │ Write Batching  │                      │                  │
            │ (2.4)           │                      │                  │
            ├─────────────────┼─────────────────────┼──────────────────┤
LOW         │                 │                      │ WASM Core (4.1)  │
IMPACT      │                 │                      │ WebGL (4.2)      │
(for us)    │                 │                      │ Yjs (4.3)        │
            │                 │                      │ Signia (4.4)     │
            └─────────────────┴─────────────────────┴──────────────────┘
```

---

## 6. Current Performance Profile

### What's Fast

- **Shape selection & property changes:** O(1) store lookup, single component re-render.
- **Viewport panning:** Spatial hash query + AABB filter is sub-millisecond for <5K objects.
- **Single object drag:** Only the dragged shape re-renders at 60Hz.
- **Frame child count:** Numeric selector from index, no array allocation.

### Where We're Slow (Probable)

- **Multi-select drag (50+ objects):** Each selected shape subscribes to `groupDragOffset`, all re-render every frame. Konva redraws entire objects layer.
- **Dense board initial load:** Full spatial index rebuild from snapshot is O(n) with n Firestore reads.
- **Complex shape rendering:** Sticky notes with text + shadows re-execute full draw commands every frame, even when nothing about them changed.
- **Frame auto-expand during drag:** Runs containment checks on every throttled drag move (100ms), but still iterates all frames.

### What We Haven't Measured

- Actual frame times during 50+ object drag (perfTimer exists but not wired to this path).
- Konva draw time vs React reconciliation time (we know React was the bottleneck before, but post-optimization the ratio may have shifted).
- Memory pressure from spatial index at scale.

---

## 7. Recommendations (Prioritized)

1. **Implement Konva shape caching** — Biggest single win. Every visible shape becomes a bitmap blit instead of a full redraw. Do this first.
2. **Split into static/active layers** — During drag, only selected shapes redraw. Combined with caching, this makes drag performance nearly constant-time regardless of visible shape count.
3. **Formalize spatial index drag exemption** — Small change, prevents edge-case bugs.
4. **Add `listening: false` per tool mode** — Free performance for non-select tools.
5. **Batch Firestore writes** — Reduces cost and network pressure.
6. **Measure before going further** — Wire perfTimer into the actual hot paths (multi-drag, layer redraw) before pursuing Web Workers or RBush.

---

## 8. Conclusion

The research paper is a useful survey of the performance landscape, but its recommendations are calibrated for 100K+ object enterprise whiteboard engines. Our board is in the 100-5000 object range where React-Konva is perfectly viable. The real wins are:

1. **Stop redrawing shapes that haven't changed** (caching + layer splitting).
2. **Stop computing things nobody asked for** (listening:false, spatial detach).
3. **Stop writing to Firestore more than necessary** (write batching).

These three principles, applied to our existing architecture, will likely 3-5x our effective frame budget during the heaviest operations (multi-drag, rapid edits). Only after exhausting these should we consider the heavier lifts (workers, RBush, LOD rendering).
