# CollabBoard Refactoring Audit Report (Phase A)

Generated from the Phase A execution plan. This document is the structured output of discovery, pattern analysis, and the implementation backlog.

---

## 1. Discovery Catalog — Hooks & Event Handlers

### 1.1 Hook census (useEffect / useMemo / useCallback)

| File | useEffect | useMemo | useCallback | Notes |
| :---: | :---: | :---: | :---: | :---: |
| `src/App.tsx` | 4 | 0 | 1 | Auth, theme, routing |
| `src/hooks/useVisibleShapes.ts` | 0 | 1 | 0 | Visible shapes filter |
| `src/hooks/usePresence.ts` | 2 | 2 | 0 | Presence subscription, derived lists |
| `src/hooks/useAI.ts` | 2 | 2 | 3 | Executor, processCommand, clear* |
| `src/hooks/useBoardSettings.ts` | 2 | 0 | 6 | Persist, setViewport, setShowGrid, etc. |
| `src/hooks/useObjects.ts` | 1 | 0 | 6 | Subscribe, applySnapshot, handleCreate/Update/Delete |
| `src/contexts/SelectionProvider.tsx` | 0 | 1 | 0 | selectionContextValue |
| `src/components/canvas/shapes/TextElement.tsx` | 0 | 1 | 4 | selectionColor, handleDblClick, handleDragEnd, handleTransformEnd, setRefs |
| `src/components/canvas/shapes/LineShape.tsx` | 0 | 0 | 2 | handleDragEnd, handleTransformEnd |
| `src/components/canvas/shapes/StickyNote.tsx` | 1 | 2 | 1 | selectionColor, textFillColor, handleDblClick, handleDragEnd |
| `src/components/canvas/shapes/RectangleShape.tsx` | 0 | 0 | 2 | handleDragEnd, handleTransformEnd |
| `src/components/canvas/shapes/Frame.tsx` | 1 | 2 | 1 | selectionColor, titleTextFill, handleTitleDblClick, handleDragEnd |
| `src/components/canvas/shapes/CircleShape.tsx` | 0 | 0 | 2 | handleDragEnd (center→topLeft), handleTransformEnd |
| `src/components/canvas/shapes/Connector.tsx` | 0 | 0 | 2 | handleDragEnd, handleTransformEnd |
| `src/components/canvas/BoardCanvas.tsx` | 9 | 8 | 25+ | Grid, viewport, ref sync, handler maps, stage handlers, renderShape, zoom/export |
| `src/components/canvas/PropertyInspector.tsx` | 0 | 8 | 0 | selectedIdSet, objectsById, selectedObjects, fill/stroke/fontSize/opacity values |
| `src/hooks/useTheme.ts` | 1 | 0 | 2 | setTheme, toggleTheme |
| `src/hooks/useExportAsImage.ts` | 0 | 0 | 2 | exportViewport, exportFullBoard |
| `src/hooks/useCanvasViewport.ts` | 4 | 0 | 7 | onViewportChange sync, initialViewport, handleWheel/DragEnd/Touch*, zoomTo, panTo, etc. |
| `src/components/canvas/TransformHandler.tsx` | 1 | 0 | 0 | Attach transformer nodes (handleTransformEnd is plain fn) |
| `src/components/canvas/SelectionLayer.tsx` | 0 | 2 | 0 | selectionColor, fillColor |
| `src/components/canvas/AlignToolbar.tsx` | 0 | 2 | 2 | selectedObjects, rects, handleAlign, handleDistribute |
| `src/components/canvas/AlignmentGuidesLayer.tsx` | 0 | 1 | 0 | guideColor |
| `src/components/board/BoardListSidebar.tsx` | 2 | 4 | 6 | Load boards, create/rename handlers, boardsById, *BoardItems |
| `src/modules/auth/useCanEdit.ts` | 1 | 0 | 0 | Can-edit subscription |
| `src/modules/auth/useAuth.ts` | 1 | 0 | 5 | Auth state, handleSignUp/In/Out, clearError |
| `src/hooks/useSelection.ts` | 0 | 0 | 7 | selectOne, selectMultiple, toggleSelection, add/remove, clear, isSelected |
| `src/hooks/useCursors.ts` | 2 | 0 | 1 | handleMouseMove |
| `src/hooks/useConnectionStatus.ts` | 1 | 0 | 1 | clearOfflineFlag |
| `src/hooks/useCanvasOperations.ts` | 1 | 0 | 6 | getSelectedObjects, handleDelete/Duplicate/Copy/Paste/SelectAll |
| `src/hooks/useBatchDraw.ts` | 0 | 0 | 2 | processBatchDraws, requestBatchDraw |
| `src/components/ui/ConnectionStatus.tsx` | 1 | 0 | 0 | Offline flag |
| `src/components/canvas/ConnectionNodesLayer.tsx` | 0 | 0 | 1 | handleNodeClick |
| `src/components/ai/AIChatPanel.tsx` | 1 | 0 | 0 | Scroll/init |

### 1.2 Handler census — Duplicate clusters (evidence)

#### Cluster A: handleDragEnd (shape-level)

| File | Signature / behavior |
| ------ | ---------------------- |
| `RectangleShape.tsx` | `onDragEnd?.(e.target.x(), e.target.y())` |
| `TextElement.tsx` | Same |
| `LineShape.tsx` | Same |
| `Connector.tsx` | Same |
| `StickyNote.tsx` | Same |
| `Frame.tsx` | Same |
| `CircleShape.tsx` | `onDragEnd?.(e.target.x() - radiusX, e.target.y() - radiusY)` (center→topLeft) |

**Common logic (6/7):** Map Konva drag event to `(x, y)` and call `onDragEnd?.(x, y)`.

**Varying:** CircleShape reports top-left from center; others report node position directly.

#### Cluster B: handleTransformEnd (shape-level)

| File | Attrs produced |
| ------ | ----------------- |
| `RectangleShape.tsx` | `{ x, y, width, height, rotation }` — reset scale, apply to width/height, min 10 |
| `CircleShape.tsx` | Same shape; ellipse radiusX/radiusY → width/height, center→topLeft |
| `LineShape.tsx` | `{ x, y, points, rotation }` — scale points array, reset scale |
| `Connector.tsx` | Same as LineShape |
| `TextElement.tsx` | `{ x, y, width, fontSize, rotation }` — scale fontSize and width |

**Common:** Read scaleX/scaleY, reset scale to 1, compute new attrs, call `onTransformEnd?.(attrs)`.

**Varying:** Rect vs ellipse vs points vs text attrs; min size and center/topLeft for ellipse.

#### Cluster C: onClick/onTap selection

All 7 shape components use the same JSX: `onClick={onSelect}`, `onTap={onSelect}`. No local handler; pass-through only.

#### Cluster D: Shadow props

All rect-like and line-like shapes repeat the same pattern from `@/lib/canvasShadows`:

- `shadowColor={SHADOW_COLOR}`
- `shadowBlur={isSelected ? SHADOW_BLUR_SELECTED : SHADOW_BLUR_DEFAULT}`
- `shadowOpacity={SHADOW_OPACITY}`
- `shadowOffsetX={SHADOW_OFFSET_X}`, `shadowOffsetY={SHADOW_OFFSET_Y}`

StickyNote uses its own constants (STICKY_NOTE_*). Others share the common set.

#### Cluster E: TransformHandler vs shape-level transform

- **TransformHandler.tsx** (lines 71–158): Single `handleTransformEnd` that iterates transformer nodes and, by className (Group, Ellipse, Line/Arrow, else Rect), computes `ITransformEndAttrs` and calls `onTransformEnd(node.id(), attrs)`.
- **BoardCanvas.tsx**: Passes `onTransformEnd={handleTransformEnd}` to `<TransformHandler>`. Does not pass `onTransformEnd` into individual shape props for rect/circle/line/connector/text; TransformHandler is the single source of transform-end for selected nodes.
- **Shape components**: Each still defines its own `handleTransformEnd` and passes it to the Konva node (`onTransformEnd={handleTransformEnd}`). So both paths exist: Konva node fires transform end → shape handler runs; Transformer also runs on transform end and calls BoardCanvas’s `handleTransformEnd`. Duplicate logic: TransformHandler duplicates shape-specific attr computation that already exists in RectangleShape, CircleShape, LineShape, Connector, TextElement.

#### Cluster F: BoardCanvas handler getters and cache

- `getSelectHandler(objectId)`, `getDragEndHandler(objectId)`, `getTextChangeHandler(objectId)` — each memoized per id via ref-backed Maps.
- `useEffect` prunes stale handler entries when `objects` changes.
- Used in `renderShape` for every shape type (onSelect, onDragEnd, onTextChange where applicable).

### 1.3 Duplicate-cluster summary (for refactor decisions)

| Pattern | Found in | Common % | Proposed abstraction | Est. LOC reduction |
| --------- | ---------- | ---------- | ---------------------- | --------------------- |
| handleDragEnd | 7 shapes | ~85% | `useShapeDragHandler(onDragEnd, options?: { centerToTopLeft })` | ~50 |
| handleTransformEnd | 5 shapes + TransformHandler | ~80% | `useShapeTransformHandler(shapeKind, onTransformEnd)` or rely on TransformHandler only | ~100+ |
| onClick/onTap | 7 shapes | 100% | No hook; keep pass-through or centralize in a wrapper | 0 |
| Shadow props | 7 shapes | 100% (except Sticky) | `getShapeShadowProps(isSelected)` | ~35 |
| Handler getters + prune | BoardCanvas | N/A | Keep or replace with stable callbacks + objectId in closure | TBD |

---

## 2. Type & Interface Catalog

### 2.1 Key type definition locations

| Location | Types / interfaces |
| ---------- | -------------------- |
| `src/types/index.ts` | Re-exports only |
| `src/types/board.ts` | `ShapeType`, `ConnectorAnchor`, `IBoardObject`, `IBoard` |
| `src/types/utils.ts` | `IPosition`, `IDimensions`, `ISize`, `ITransform`, `IScaleTransform` |
| `src/types/user.ts` | `UserRole`, `IUser`, `IBoardMember`, `IUserPreferences` |
| `src/hooks/useCanvasViewport.ts` | `IViewportPosition`, `IViewportScale`, `IViewportState`, `IViewportPersistState` |
| `src/hooks/useBoardSettings.ts` | `IViewportPosition`, `IViewportScale`, `IPersistedViewport`, `IBoardSettings`, etc. |
| `src/components/canvas/TransformHandler.tsx` | `ITransformEndRectAttrs`, `ITransformEndLineAttrs`, `ITransformEndAttrs` |
| `src/lib/canvasOverlayPosition.ts` | `IPoint` (x, y) — duplicate of IPosition |
| `src/lib/canvasBounds.ts` | `IBounds` (x1, y1, x2, y2) |
| `src/lib/alignDistribute.ts` | `ILayoutRect` (id, x, y, width, height) |
| `src/components/canvas/SelectionLayer.tsx` | `ISelectionRect` (visible, x1, y1, x2, y2) |

### 2.2 Overlap matrix — viewport

| Type | useCanvasViewport | useBoardSettings | Same shape? |
| ------ | ------------------- | ------------------ | ------------- |
| Position | `IViewportPosition` { x, y } | `IViewportPosition` { x, y } | Yes |
| Scale | `IViewportScale` { x, y } | `IViewportScale` { x, y } | Yes |
| Persisted | `IViewportPersistState` { position, scale } | `IPersistedViewport` { position, scale } | Yes, different name |

**Proposal:** Single source in `src/types/viewport.ts`: `IViewportPosition`, `IViewportScale`, `IPersistedViewport`. Both hooks import from there; alias old names during migration.

### 2.3 Overlap matrix — transform attrs

- `ITransformEndRectAttrs` (TransformHandler) = `{ x, y, width, height, rotation }`.
- `ITransformEndLineAttrs` (TransformHandler) = `{ x, y, points, rotation }`.
- `ITransform` (utils) = `ISize` + rotation = `{ x, y, width, height, rotation }` — same as rect attrs.

**Proposal:** Keep transform-end types in one place (e.g. `src/types/transform.ts` or TransformHandler and re-export). Use discriminated union `ITransformEndAttrs = ITransformEndRectAttrs | ITransformEndLineAttrs` (and text variant if needed).

### 2.4 Shape props interfaces (per-component)

All shape components declare their own props interface with overlapping fields:

- **Common:** id, x, y, opacity?, rotation?, isSelected?, draggable?, onSelect?, onDragStart?, onDragEnd?, dragBoundFunc?
- **Rect-like:** width, height, fill, stroke?, strokeWidth?, onTransformEnd?(rect attrs)
- **Line-like:** points, stroke, strokeWidth?, onTransformEnd?(line attrs)
- **Text-like:** text, fontSize?, fill?, width?, onTextChange?, onTransformEnd?(text attrs)

**Proposal:** `IBaseShapeProps` (common), `IRectLikeShapeProps`, `ILineLikeShapeProps`, `ITextShapeProps` in `src/types/shapes.ts`; components extend and add only specific props.

### 2.5 Type safety debt

- `any`: Found in aiService, alignmentGuides, TextElement, StickyNote, BoardCanvas, TransformHandler (and a few UI/lib files).
- `as` assertions: Heavy in `toolExecutor.ts`; Firestore `data() as IBoard*` in objectService, boardService; StickyNote, Connector, etc.
- `Record<string, unknown>` for tool arguments in `tools.ts`.

---

## 3. Dead Code & Export-Surface Analysis

### 3.1 Unused / internal-only exports

| Symbol | Location | Consumer check | Recommendation |
| -------- | ---------- | ---------------- | ---------------- |
| `subscribeToObjects` | `objectService.ts`, re-exported in `sync/index.ts` | No imports in codebase; only `subscribeToObjectsWithChanges` used (e.g. useObjects) | **Remove** from objectService and sync/index.ts (safe delete). |
| `mergeObjectUpdates` | `objectService.ts`, re-exported in `sync/index.ts` | Used only in `useObjects.ts` (internal to sync feature) | **Keep implementation**; **remove from public API** (sync/index.ts). useObjects can import from objectService directly. |

### 3.2 Type exports (internal use only)

- `IObjectChange`, `IObjectsSnapshotUpdate` — used only in useObjects and objectService. Not re-exported from `types/index.ts`. **Action:** Leave as-is or do not re-export from sync barrel if we narrow barrel exports.

### 3.3 useEffect consolidation (BoardCanvas)

- Three separate effects (lines 242–252) syncing refs: `activeToolRef`, `drawingActiveRef`, `selectingActiveRef`. **Proposal:** Single effect that sets all three from current state. **Risk:** Low. **Classification:** Safe refactor.

### 3.4 Handler map pruning (BoardCanvas)

- Effect (lines 900–913) prunes handler Maps and dragBoundFunc cache when `objects` changes. **Action:** Keep; required for correctness. Optional: document or extract prune helper. **Classification:** Keep.

### 3.5 Safety classification summary

| Item | Classification | Notes |
| ------ | ---------------- | -------- |
| Remove `subscribeToObjects` export | Safe delete | Zero consumers |
| Remove `mergeObjectUpdates` from sync/index only | Safe delete | useObjects imports from objectService |
| Consolidate ref-sync useEffects | Safe refactor | Same behavior, fewer effects |
| Other dead-code candidates | Guarded / keep | No further high-confidence removals without broader usage scan |

---

## 4. Minimal Hook Architecture (2+ consumers, net LOC reduction)

### 4.1 Approved candidates

| Hook | Replaces | Consumers | Est. LOC Δ | Risk |
| ------ | ---------- | ----------- | ------------ | ------ |
| `useShapeDragHandler` | In-component handleDragEnd in 7 shapes | RectangleShape, CircleShape, LineShape, Connector, TextElement, StickyNote, Frame | −50 / +15 | Low (CircleShape center→topLeft option) |
| `getShapeShadowProps(isSelected)` | Repeated shadow prop blocks in 6 shapes (non-Sticky) | Rect, Circle, Line, Connector, Text, Frame | −35 / +10 | Low |
| (Optional) `useShapeTransformHandler` | In-component handleTransformEnd in 5 shapes | Rect, Circle, Line, Connector, Text | −80 / +40 | Medium (shape-specific branches) |

### 4.2 Rejected / deferred

- **useSelectable:** Selection is already a single callback (`onSelect`) passed from BoardCanvas; no duplicated selection logic in shapes. **No hook.** Pass-through stays.
- **useCanvasObject:** Would need to wrap CRUD + socket sync; current usage is BoardCanvas + useObjects. Only one real consumer. **Reject** per “no single-consumer abstractions.”
- **useCollaboration:** No 2+ consumer cluster identified for a single “collaboration” hook. **Reject** for now.

### 4.3 Transform strategy (dual path)

- **Option A:** Remove shape-level `onTransformEnd` from Konva nodes; rely solely on TransformHandler’s `handleTransformEnd` to compute attrs and call BoardCanvas. **Risk:** High (timing, multi-select, node attachment). **Recommendation:** Defer; keep both paths unless proven redundant.
- **Option B:** Keep shape-level handlers; introduce `useShapeTransformHandler` to deduplicate only the shape-side logic. **Risk:** Medium. **Recommendation:** Acceptable after type consolidation.

---

## 5. Prioritized Refactor Backlog (dependency-ordered)

| Priority | Refactor | Impact | Risk | Files (approx) | Dependency |
| ---------- | ---------- | -------- | ------ | ---------------- | ------------ |
| 1 | Type hierarchy: viewport + transform + base shape props | HIGH | LOW | ~8 | None |
| 2 | Unify viewport types in `src/types/viewport.ts`; migrate useCanvasViewport + useBoardSettings | HIGH | LOW | 3 | After 1 |
| 3 | Consolidate transform types; single export (e.g. from TransformHandler or types/transform) | MED | LOW | ~5 | After 1 |
| 4 | `useShapeDragHandler` + `getShapeShadowProps` | HIGH | LOW | 8 | After types if props use new types |
| 5 | Dead code: remove `subscribeToObjects`; remove `mergeObjectUpdates` from sync barrel | MED | NONE | 2 | None |
| 6 | BoardCanvas: consolidate ref-sync useEffects (3 → 1) | MED | LOW | 1 | None |
| 7 | `useShapeTransformHandler` (optional) | MED | MED | 6 | After 4 |
| 8 | Base shape props interfaces; migrate shape components incrementally | MED | LOW | 8 | After 1–3 |
| 9 | BoardCanvas decomposition (extract renderShape helpers / layers) | HIGH | MED | 2–5 | After 4, 7, 8 |
| 10 | Revisit memoization / handler cache (profile-driven) | LOW | MED | 1 | Optional |

**Dependency order:** 1 → 2, 3 → 4, 8. 5, 6 can run in parallel. 7 after 4. 9 after 4, 7, 8.

---

## 6. Phase B Report Template (per refactor item)

Use this template when implementing each refactor in Phase B.

```markdown
### Refactor: [Short name]

- **Why:** [Duplication / risk / cognitive load]
- **Before:** 
  - File: `path/to/file.ts`
  - Symbol / lines: [e.g. handleDragEnd, lines 69–74]
  - Snippet (optional): [1–3 line quote]
- **After:**
  - New abstraction: [e.g. useShapeDragHandler in hooks/useShapeDragHandler.ts]
  - Contract: [function signature or type]
- **Migration steps:**
  1. [Step that keeps behavior stable]
  2. [Next step]
  3. [Final step]
- **LOC delta:** +X / −Y (net −Z)
- **Risk & rollback:** [e.g. Low; revert hook and restore in-component handlers]
- **Validation:** `bun run tsc --noEmit`, [test command], manual: [e.g. drag each shape type, transform, select]
```

---

## 7. Quality Gates Checklist

- [ ] Every proposed hook has ≥2 identified consumers (useShapeDragHandler: 7; getShapeShadowProps: 6).
- [ ] Type changes are backward-compatible or use migration shims (viewport/transform/base props).
- [ ] No public API or socket protocol changes.
- [ ] Net LOC decreases per refactor tranche (estimated in backlog).
- [ ] Risk is explicit (transform dual path and useShapeTransformHandler marked MED).

---

*End of Phase A Audit Report.*
