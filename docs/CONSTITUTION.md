# CollabBoard State Improvement Constitution

This document is the **inviolable** rule set for the state improvement plan. Violations block merge. All agents and developers must read it before starting any task under this plan.

- **Articles I–VIII** govern Epics 1–3 (original state improvement work).
- **Articles IX–XIX** govern [STATE-MANAGEMENT-PLAN-2.md](plans/state/STATE-MANAGEMENT-PLAN-2.md) tasks S1–S7 (state management unification).
- **Articles XX–XXV and XXVII** govern the Imperative Konva Migration (Epics 1–4).

**Precedence:** This constitution overrides any conflicting rule in CLAUDE.md or `.cursor/rules/`. When in conflict, the constitution wins.

---

## Article I — State Sovereignty

1. All board element state lives in a **single canonical JSON-serializable store**: `IBoardObject` records keyed by `id`.
2. The Konva layer is a **pure rendering projection** of this state. Konva nodes must never be the source of truth.
3. No Konva-specific types (`Konva.Node`, `Konva.Rect`, etc.) may appear in state interfaces, store definitions, or repository contracts.

---

## Article II — World Coordinate Invariant

1. All persisted and stored positions (`x`, `y`, `points`) are in **world coordinates**.
2. Screen-to-world and world-to-screen conversions happen exclusively at the **boundary** (input handlers and rendering), never inside state mutations or persistence.
3. Any new coordinate conversion logic must go through a **single utility module** (currently inline in BoardCanvas; to be extracted in Epic 1).

---

## Article III — Repository Abstraction Contract

1. All persistence operations (create, read, update, delete, subscribe) must go through an interface (`IBoardRepository` or equivalent).
2. No component, hook, or AI module may import Firebase SDK functions directly for board object CRUD. They use the repository.
3. The repository interface must remain **provider-agnostic** (no Firestore/RTDB types in the interface signature).
4. Existing direct imports (`objectService`, `boardService`) are **grandfathered** until Epic 2 migrates them behind the interface.

---

## Article IV — AI Interface Stability

1. The AI-facing JSON schema for board state is a **public contract**. Breaking changes require a version bump and migration path.
2. AI commands use a typed discriminated union: `{ action: 'CREATE' | 'UPDATE' | 'DELETE', payload: ... }`. Payloads are validated before execution.
3. AI must never receive or return Konva-specific, Firebase-specific, or internal implementation details.

---

## Article V — Migration Safety

1. No epic may break existing functionality. All changes are additive or behind feature flags until stable.
2. The existing **write queue pattern** (`queueWrite` for high-frequency, direct `onObjectUpdate` for structural) remains the persistence strategy unless explicitly replaced.
3. Existing Zustand stores (`objectsStore`, `selectionStore`, `viewportActionsStore`, `historyStore`, `dragOffsetStore`) may be extended but **not deleted or merged** without a documented ADR.

---

## Article VI — Performance Budgets

1. **Real-time sync:** Changes propagate to all clients in **< 500 ms** (from the plan success metrics).
2. **Scale:** Handle **1,000+ elements** without perceptible lag on standard hardware.
3. **Write queue:** Coalescing window stays at **500 ms** unless a measured benchmark justifies change.
4. **Rendering:** No O(n) work on every frame. **Spatial index for viewport culling is mandatory.**

---

## Article VII — Testing Gate

1. Every new module introduced by Epics 1–3 must have **unit tests** before merge.
2. **Integration tests** against Firebase emulators are required for any persistence changes.
3. `**bun run validate`** must pass. No exceptions, no `--skip` flags.

---

## Article VIII — Backward Compatibility

1. **IBoardObject:** Existing fields are frozen. New fields are additive and optional.
2. **Firestore:** Existing document schema (`boards/{boardId}/objects`) is **append-only**. Field removals require a migration script.
3. **AI tools:** Existing tool names and parameter shapes in `src/modules/ai/tools.ts` must not have breaking signature changes.

---

## Amendment — State Management Unification (S1–S7)

The following articles govern all work in `STATE-MANAGEMENT-PLAN-2.md`. They are additive to Articles I–VIII and do not supersede them. Where existing articles already cover a concern, these add specificity for the state management refactoring.

---

## Article IX — Single Source of Truth Enforcement

1. After task S5 merges, no module outside `useObjects.ts` may hold `useState<IBoardObject[]>` as a source of truth for board objects.
2. `useHistory`, `useAI`, and all other consumers must read board objects exclusively from `useObjectsStore` (via selector, `getState()`, or a thin wrapper that delegates to the store).
3. The `objects` array returned by `useObjects` may exist as a derived convenience but must not be the authoritative copy read by other hooks.

**Verification:** `grep -r "useState<IBoardObject" src/` returns only `useObjects.ts`. `useHistory` and `useAI` resolve object reads to `useObjectsStore.getState()`.

---

## Article X — Update Path Standardization

1. Every high-frequency property mutation (color, text, opacity, position during drag, font size) must flow through a single `queueObjectUpdate(objectId, updates)` function.
2. `queueObjectUpdate` must atomically perform: (a) optimistic Zustand store update via `useObjectsStore.getState().updateObject(id, updates)`, and (b) write queue enqueue via `queueWrite(id, updates)`.
3. No module may call `updateObject()` and `queueWrite()` independently as a pair for the same logical update.
4. Structural mutations (create, delete, batch position commit) continue to use their dedicated paths.

**Verification:** `grep -r "queueWrite(" src/` returns only `writeQueue.ts` and the single `queueObjectUpdate` implementation. `PropertyInspector.tsx` has zero direct `useObjectsStore.getState().updateObject` calls.

---

## Article XI — Index Preservation During High-Frequency Mutations

1. Store mutations that do not change relationship fields (`parentFrameId`, `fromObjectId`, `toObjectId`) must skip full index rebuilds.
2. `frameChildrenIndex` and `connectorsByEndpoint` must remain unchanged when only non-relational fields are mutated.
3. Any new store action (including `applyChanges` from S6) must honor this fast path.
4. Non-relational mutations must be O(1) for index work; full O(n) rebuilds only when relationships actually change.

**Verification:** Unit test: call `applyChanges` with 100 position-only updates on a 1000-object store; assert `frameChildrenIndex` reference identity is unchanged.

---

## Article XII — Incremental Delivery Guarantee

1. Each task S1–S7 must be independently mergeable to the target branch with `bun run validate` passing.
2. No task may introduce dead code, `// TODO: S<N>` comments, or feature flags that depend on a future task for cleanup.
3. If a task introduces a new API (e.g., `queueObjectUpdate` in S2), all callers reachable at merge time must be migrated in the same PR.

**Verification:** `bun run validate` passes on the PR branch. Zero `// TODO: S<N>` comments referencing unmerged tasks. No `@deprecated` annotations pointing to a future task as removal timeline.

---

## Article XIII — Performance Non-Regression Gate

1. Every task PR must include a before/after measurement for any operation it modifies.
2. A task must not merge if it regresses any existing benchmark by more than **10%** or violates Article VI budgets.
3. New store actions (S4 optimization, S6 `applyChanges`, S7 selector changes) must include unit benchmarks in the PR that become permanent tests.

**Verification:** PR description contains a "Performance" section with before/after numbers. `bun run release:gate` passes.

---

## Article XIV — Pagination and Subscription Contract

1. `fetchObjectsPaginated` must yield objects in `createdAt` ascending order matching `subscribeToObjectsWithChanges` ordering.
2. After paginated load completes, the delta subscription (`subscribeToDeltaUpdates`) must use the latest `updatedAt` timestamp from the paginated result as its cursor. No gap or overlap is permissible.
3. The small-board fallback (below threshold) must use `subscribeToObjectsWithChanges` identically to current behavior.
4. The threshold value must be a named constant (`PAGINATION_THRESHOLD`), not a magic number.
5. During paginated load, the UI must show a loading state; partial object sets must never render without indication.

**Verification:** Integration test: create 600 objects, paginated-load them, create 10 more from a second client, assert delta subscription delivers exactly those 10 without duplicates. Threshold is a named export constant, not an inline literal.

---

## Article XV — Store Mutation Batching Rules

1. `applyChanges(changes)` must accept a typed changeset: `{ add: IBoardObject[], update: Array<{id: string, updates: Partial<IBoardObject>}>, delete: string[] }`.
2. All operations must apply in a **single `set()` call** producing one Zustand state notification.
3. Callers must not sequence separate `setObjects()` + `deleteObjects()` calls for operations that logically constitute one change.
4. Spatial index and relationship indexes must be rebuilt at most once per `applyChanges` call.

**Verification:** Unit test: subscribe to `useObjectsStore` with a counter; call `applyChanges` with 5 adds, 3 updates, 2 deletes; assert the subscriber fires exactly once.

---

## Amendment — Imperative Konva Migration (Epics 1–4)

The following articles govern the Imperative Konva Migration. They are additive to Articles I–XIX and do not supersede them.

---

## Article XX — Imperative Canvas Rendering Contract

1. `KonvaNodeManager` is a **derived rendering projection** of `useObjectsStore`. Konva nodes are never the source of truth (reinforces Article I).
2. `KonvaNodeManager` must not hold stale snapshots of `IBoardObject` data. Its internal `lastObj` field is a **diff optimization cache**, not authoritative state. Any detected divergence must be resolved by re-reading the store, not by trusting the cache.
3. No imperative canvas module may call `useObjectsStore.getState().updateObject()` directly during the render/update cycle. Store mutations happen only in event handlers (drag end, text change, transform end) — never in the subscription callback that processes store changes.

---

## Article XXI — Connector Endpoint Reactivity

1. When a shape moves, `KonvaNodeManager.handleStoreChange()` must update all connectors referencing that shape as an endpoint, using the `connectorsByEndpoint` index.
2. Connector updates must be **deduplicated** within a single `handleStoreChange` call. If both endpoints of a connector move in the same store change (e.g., multi-select drag), the connector must be updated exactly once, after both endpoint positions are resolved.
3. Connector endpoint updates must complete within the same `batchDraw()` call as the endpoint shape updates. No visual frame may show a connector lagging behind its endpoint.

---

## Article XXII — Subscription Efficiency

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

---

## Article XXIII — Bitmap Caching Preservation

1. Complex shapes (StickyNote, Frame) must be bitmap-cached when idle; cache cleared when selected, editing, or dragging; re-applied when returning to idle after visual changes.
2. Cache pixel ratio ≥ device pixel ratio (minimum 2x). Factory `update()` must invalidate cache when any visual property changes.

---

## Article XXIV — Layer Partitioning Invariant

1. Shapes exist on exactly one of two layers: **static** (idle shapes) or **active** (selected/dragging shapes).
2. When selection changes, shapes must move between layers atomically. No shape may exist on both layers simultaneously.
3. The active layer redraws at 60Hz during drag. The static layer redraws only when its contents change (shape added/removed/updated while idle).
4. The overlay layer (marquee, guides, cursors, drawing preview, connection anchors) is independent of both shape layers.
5. The selection layer (Konva.Transformer) is independent of both shape layers.

---

## Article XXV — Event System Isolation

1. Stage-level events (mousedown/mousemove/mouseup on empty canvas) are handled by `StageEventRouter` and dispatched based on `activeTool`.
2. Per-shape events (click, drag, dblclick) are wired by `ShapeEventWiring` when a shape node is created.
3. No event handler may directly create or destroy Konva nodes. Event handlers mutate Zustand stores or call imperative overlay updates. Node creation/destruction is exclusively `KonvaNodeManager`'s responsibility in response to store changes.
4. Exception: `OverlayManager` may create/destroy transient overlay nodes (marquee rect, guide lines, drawing preview) in response to direct method calls from event handlers. These are not store-backed.

---

## Article XXVII — Migration Safety (extends Article V)

1. Epics 1–4 are purely additive. They create new files alongside the existing system. No existing file is modified or deleted until Epic 5.
2. Epic 5 is the cut-over. It is a single atomic PR that replaces `<BoardCanvas>` with `<CanvasHost>`. This PR must pass all E2E tests.
3. Epic 6 deletes dead files. It is a separate PR from Epic 5. If Epic 5 introduces regressions discovered post-merge, Epic 6 is blocked and Epic 5 is reverted.
4. At no point during the migration may both `BoardCanvas` and `CanvasHost` be active simultaneously in production. Feature flags are acceptable for local testing only.
5. **Rollback:** Revert the Epic 5 merge (or the BoardCanvas → CanvasHost swap in a follow-up PR); do not merge Epic 6 until Epic 5 is stable.

---

## Invariants — Must Survive All Tasks (S1–S7)

The following are immutable across the entire state management unification. No task may violate these regardless of wave or article.

1. `**IBoardObject` field schema** — No existing field removed or renamed. New fields optional only.
2. **Firestore document schema** — `boards/{boardId}/objects/{objectId}` structure unchanged. No field removals.
3. `**IBoardRepository` interface** — Method signatures frozen. New methods additive only.
4. **Write queue API** — `queueWrite`, `flush`, `setWriteQueueBoard`, `initWriteQueue` signatures unchanged.
5. **Spatial index singleton** — `spatialIndex` remains module-level (outside Zustand state) to avoid subscriber churn.
6. **Zustand store existence** — `objectsStore`, `selectionStore`, `viewportActionsStore`, `historyStore`, `dragOffsetStore` persist. None deleted or merged.
7. **AI command interface** — `AIService.processCommand`, tool executor, and `getObjects()` callback shape preserved.
8. **Subscription callback shape** — `IObjectsSnapshotUpdate` interface (`objects`, `changes`, `isInitialSnapshot`) unchanged.
9. **Optimistic update + rollback** — `useObjects` continues to support optimistic create/update/delete with rollback on failure. Mechanism may change, behavior must not regress.
10. **History command shape** — `IHistoryCommand` and `IHistoryEntry` types unchanged. `executeUndo`/`executeRedo` signatures unchanged.

