# Plan: Frame Object Grouping

**Goal:** Frames become real containers — objects dropped inside a frame belong to it, move with it when dragged, and detach when dragged out. Delete frame → children stay. Resize frame → children stay fixed.

---

## Design Decisions (confirmed)

| Behavior | Choice |
|----------|--------|
| Frame drag | Children move with the frame |
| Frame delete | Children stay on canvas (unparented) |
| Frame resize | Children stay fixed (no scale/reposition) |
| Enter/leave | Spatial overlap on drag-end |

---

## Step 1: Data model — add `parentFrameId` to `IBoardObject`

**File:** `src/types/board.ts`

Add optional field:

```typescript
parentFrameId?: string;  // ID of containing frame, or undefined/absent if top-level
```

This is the single source of truth for containment. No `children[]` array on the frame — derive children via query/filter instead. One field, no denormalization, backward-compatible (undefined = top-level).

**Why not `children[]` on the frame?**
- Avoids dual-source-of-truth bugs (parent says X is child, but X says it has no parent)
- Firestore writes stay atomic per object — no need to update the frame doc when a child moves
- Filtering `objects.filter(o => o.parentFrameId === frameId)` is O(n) but n is small (board objects)

**Firestore:** `parentFrameId` written/read like any other optional field. Existing objects without it are top-level — zero migration needed.

**Update `ICreateObjectParams`** to include optional `parentFrameId?: string`.

---

## Step 2: Containment logic — `useFrameContainment` hook

**New file:** `src/hooks/useFrameContainment.ts`

Pure utility hook/functions:

```typescript
// Given an object's bounds after drag-end, find the frame it's inside (if any)
function findContainingFrame(
  objectBounds: IBounds,
  frames: IBoardObject[],
  excludeId?: string  // Don't parent a frame to itself
): string | undefined

// Given a frame ID, return all direct children
function getFrameChildren(
  frameId: string,
  objects: IBoardObject[]
): IBoardObject[]

// Check if an object's center point is inside a frame's bounds
function isInsideFrame(
  objectBounds: IBounds,
  frame: IBoardObject
): boolean
```

**Containment rule:** Object's **center point** falls within frame bounds → it's a child. Center-point (not full overlap) is the standard — matches Figma behavior and feels natural when dragging small objects near edges.

**Edge cases:**
- Frame inside frame: **Not supported in this iteration.** A frame's `parentFrameId` stays undefined. Only non-frame objects get parented. This avoids recursive containment complexity.
- Object overlaps multiple frames: Pick the **smallest** frame that contains the center. This gives intuitive "most specific container" behavior.
- Connectors: **Excluded** from frame parenting. Connectors have their own `fromObjectId`/`toObjectId` relationship; parenting them to frames would conflict. Filter them out in `findContainingFrame`.

---

## Step 3: Frame drag moves children

**File:** `src/components/canvas/BoardCanvas.tsx` — modify `handleObjectDragEnd` and drag move logic

When a frame is dragged:

1. **On drag move (real-time visual):** Compute delta (dx, dy) from frame's position change. Apply same delta to all children's rendered positions. This is visual-only during drag — no Firestore writes.

2. **On drag end:**
   - Compute final delta from frame's start position to end position
   - Get all children via `getFrameChildren(frameId, objects)`
   - Batch update: frame's new position + each child's new position (old + delta)
   - Single `updateObjectsBatch()` call to Firestore

**Implementation detail:** The existing multi-select drag already computes a delta and applies it to all selected objects. Frame-child drag reuses that same pattern, but triggered by dragging the frame alone (children aren't in `selectedIds`, they move implicitly).

**Performance:** `getFrameChildren` filters the object store — fast for typical board sizes (< 500 objects).

---

## Step 4: Drag-end reparenting — objects enter/leave frames

**File:** `src/components/canvas/BoardCanvas.tsx` — modify `handleObjectDragEnd`

After any non-frame object finishes dragging:

1. Compute the object's final bounds
2. Call `findContainingFrame(bounds, allFrames, objectId)`
3. If result differs from current `parentFrameId` → update the object with new `parentFrameId` (or remove it if no longer in any frame)

This runs for **every** object drag-end, which is the natural moment to resolve containment. It's a lightweight check (iterate frames, test center-point).

**Batch with position update:** The reparenting update (`parentFrameId`) can be included in the same `updateObject` call that persists the new position — no extra Firestore write.

---

## Step 5: Frame delete — unparent children

**File:** `src/hooks/useObjects.ts` or `src/hooks/useCanvasOperations.ts`

When deleting a frame:

1. Get all children via `getFrameChildren(frameId, objects)`
2. Batch update children: set `parentFrameId` to `undefined` (or delete the field)
3. Delete the frame

Wrap in a single batch write: children unparent + frame delete → atomic.

**Multi-select delete with frame:** If user selects a frame + some of its children + deletes all, the children that were selected get deleted (user intent). Children that were NOT selected get unparented. Order: unparent non-selected children first, then delete selected objects.

---

## Step 6: Copy / Paste / Duplicate

**File:** `src/hooks/useCanvasOperations.ts`

**Duplicate a frame:**
1. Duplicate the frame itself (with offset)
2. Get all children of the original frame
3. Duplicate each child (with same offset)
4. Set each child copy's `parentFrameId` to the new frame's ID

**Copy/paste a frame:**
Same logic — when pasting, create frame first to get its new ID, then create children pointing to that ID.

**Duplicate/copy a child object only (not the frame):**
The `parentFrameId` carries over from the spread (`...rest`). But the duplicate is offset by 20px — if it's still inside the frame, it stays parented. If not, the drag-end reparenting logic will handle it (or we clear `parentFrameId` on paste and let spatial reparenting resolve it on next drag).

**Simplest approach:** On duplicate/paste, strip `parentFrameId` from non-frame objects and let spatial containment resolve on next interaction. This avoids stale parent references.

---

## Step 7: Rendering order — children above frame

**File:** `src/hooks/useVisibleShapeIds.ts`

Current sort: frames first, everything else after. This already works — frames render as background, objects render on top. No change needed for basic rendering.

**Optional enhancement:** Sort children of the same frame together for visual grouping. Not required for correctness since Konva z-order is already frame-first.

---

## Step 8: Selection behavior

**Marquee selection:** No change needed. Marquee already selects by spatial bounds — objects inside a frame will be selected if the marquee intersects them, which is correct.

**Click on frame:** Selects the frame only (current behavior). Children are independent click targets.

**Select all children of a frame:** Not in this iteration. Could be a future "select frame contents" action.

---

## Step 9: Zustand store — derived selectors

**File:** `src/stores/objectsStore.ts`

Add selectors:

```typescript
// Get all children of a frame
export const selectFrameChildren = (frameId: string) =>
  (state: IObjectsStore): IBoardObject[] =>
    Object.values(state.objects).filter(o => o.parentFrameId === frameId);

// Get all frames
export const selectFrames = (state: IObjectsStore): IBoardObject[] =>
  Object.values(state.objects).filter(o => o.type === 'frame');
```

These are used by drag logic and containment checks without hitting Firestore.

---

## Step 10: Tests

### Unit tests for containment logic (`useFrameContainment.test.ts`)

- `findContainingFrame` returns correct frame when object center is inside
- `findContainingFrame` returns undefined when object is outside all frames
- `findContainingFrame` picks smallest frame when overlapping multiple
- `findContainingFrame` excludes the object itself (frame can't parent itself)
- `findContainingFrame` excludes connectors
- `isInsideFrame` boundary conditions (center exactly on edge, just inside, just outside)
- `getFrameChildren` returns correct children for a given frame
- `getFrameChildren` returns empty array when frame has no children

### Integration tests for frame drag (`BoardCanvas` / drag handling)

- Dragging a frame moves all its children by the same delta
- Dragging a frame with snap-to-grid: frame snaps, children move by same delta
- Children positions update in Firestore batch after frame drag-end
- Dragging a frame with no children: frame moves normally (no regression)

### Integration tests for reparenting on drag-end

- Drag object into frame → `parentFrameId` set to frame ID
- Drag object out of frame → `parentFrameId` cleared
- Drag object from one frame to another → `parentFrameId` updated
- Object already inside frame, drag within frame → `parentFrameId` unchanged
- Frame drag doesn't trigger reparenting of its own children (they move with it, not relative to it)

### Tests for frame delete

- Delete frame → children get `parentFrameId` cleared, children remain on canvas
- Delete frame with no children → frame deleted, no side effects
- Multi-select delete (frame + some children) → selected children deleted, unselected children unparented

### Tests for copy/paste/duplicate

- Duplicate frame → new frame created + children duplicated with new parentFrameId
- Copy/paste frame → same behavior as duplicate
- Duplicate single child → `parentFrameId` stripped (or resolved spatially)

### Tests for Zustand selectors

- `selectFrameChildren` returns correct filtered list
- `selectFrames` returns only frame-type objects
- Store updates propagate correctly when `parentFrameId` changes

**Test implementation status:**

- **useFrameContainment:** Implemented in `tests/unit/useFrameContainment.test.ts`.
- **Frame delete / duplicate / paste:** Implemented in `tests/unit/frameGrouping.test.ts`.
- **BoardCanvas frame drag and reparenting:** Implemented in `tests/unit/BoardCanvas.interactions.test.tsx` (frame drag moves children; drag into/out of frame updates `parentFrameId`).
- **Zustand selectors:** Implemented in `tests/unit/objectsStore.test.ts` for `selectFrameChildren` and `selectFrames`.

Note: "Duplicate frame → new frame + children with new parentFrameId" is not implemented in code; current behavior is "strip parentFrameId on duplicate; spatial reparenting on next drag." Tests reflect current behavior.

---

## Execution Order

1. **Data model** (Step 1) — type change, zero runtime impact
2. **Containment logic** (Step 2) — pure functions, fully testable in isolation
3. **Store selectors** (Step 9) — derived state, no side effects
4. **Reparenting on drag-end** (Step 4) — objects enter/leave frames
5. **Frame drag moves children** (Step 3) — the core grouping behavior
6. **Frame delete unparents** (Step 5) — cleanup on delete
7. **Copy/paste/duplicate** (Step 6) — hierarchy-aware operations
8. **Tests** (Step 10) — written alongside each step, listed last for plan clarity

---

## Out of Scope (this iteration)

- Frame-in-frame nesting
- Select all children of a frame (future UX)
- Resize frame to fit children
- Visual indicator showing parent-child relationship during drag
- Undo/redo integration for reparenting (depends on Feature 20)
- AI tool updates for `createFrame` with children
