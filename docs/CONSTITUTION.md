# CollabBoard State Improvement Constitution

This document is the **inviolable** rule set for the state improvement plan. Violations block merge. All agents and developers must read it before starting any task under this plan.

- **Articles I–VIII** govern Epics 1–3 (original state improvement work).
- **Articles IX–XIX** govern STATE-MANAGEMENT-PLAN-2.md tasks S1–S7 (state management unification).

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

1. **Real-time sync:** Changes propagate to all clients in **&lt; 500 ms** (from the plan success metrics).
2. **Scale:** Handle **1,000+ elements** without perceptible lag on standard hardware.
3. **Write queue:** Coalescing window stays at **500 ms** unless a measured benchmark justifies change.
4. **Rendering:** No O(n) work on every frame. **Spatial index for viewport culling is mandatory.**

---

## Article VII — Testing Gate

1. Every new module introduced by Epics 1–3 must have **unit tests** before merge.
2. **Integration tests** against Firebase emulators are required for any persistence changes.
3. **`bun run validate`** must pass. No exceptions, no `--skip` flags.

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

## Article XVI — Ref Mirroring Policy

1. A `useRef` mirroring React or Zustand state is permitted only when **all** of the following hold:
   - (a) The consumer is a stable `useCallback` with an empty or minimal dependency array that needs fresh values without re-creating the closure.
   - (b) The ref is updated synchronously in the same render/effect that produces the new value.
   - (c) There is a code comment citing **Article XVI** and naming the specific callback that reads the ref.
2. After S5, `objectsRef` patterns in `useHistory` and `useAI` must be replaced with direct `useObjectsStore.getState()` reads. Ref mirroring for objects is no longer justified once there is a single source.

**Verification:** After S5, `useHistory.ts` has zero `useRef<IBoardObject[]>` declarations. `useAI.ts` reads objects via `useObjectsStore.getState()`, not `objectsRef.current`. Remaining refs cite Article XVI in a comment.

---

## Article XVII — Wave Dependency Enforcement

1. Hard merge order: **S2 before S5**, **S5 before S7**.
2. Tasks within the same wave may merge in any order relative to each other.
3. No task may be merged out of wave order.
4. The task board (`.claude/tasks.md`) must encode these dependencies, and the reviewer must verify the dependency chain before approving merge.

**Verification:** PR for S5 may not be opened until S2 is merged. PR for S7 may not be opened until S5 is merged. Reviewer checks `git log --oneline main..HEAD` to confirm prerequisites.

---

## Article XVIII — Backward Compatibility of Update API Surface

1. `IUseObjectsReturn` is a public API surface. No existing return field may be removed in a single PR — deprecation requires one release cycle.
2. The `objects: IBoardObject[]` return field may be retained as a derived value (from Zustand store) even after S5, until all direct consumers are migrated.
3. `queueObjectUpdate` must remain on the return interface with the signature `(objectId: string, updates: IUpdateObjectParams) => void`.
4. New fields (e.g., `objectsRecord`) may be added but must not change existing field semantics.

**Verification:** TypeScript compilation passes. `IUseObjectsReturn` interface changes reviewed for backward compatibility. Removed fields have a deprecation commit in a prior release.

---

## Article XIX — E2E-First Mandate

1. Tasks **S2**, **S3**, and **S5** must have Playwright E2E tests written and merged **before** the implementation PR is opened.
2. E2E tests must pass against the current codebase to establish the baseline.
3. The implementation PR must not alter E2E test assertions; if behavior changes are needed, the E2E test update requires reviewer approval with justification.

**Verification:** Git log shows E2E test commits for S2, S3, S5 merged before their respective implementation PRs. E2E tests pass on the target branch before the implementation branch diverges.

---

## Invariants — Must Survive All Tasks (S1–S7)

The following are immutable across the entire state management unification. No task may violate these regardless of wave or article.

1. **`IBoardObject` field schema** — No existing field removed or renamed. New fields optional only.
2. **Firestore document schema** — `boards/{boardId}/objects/{objectId}` structure unchanged. No field removals.
3. **`IBoardRepository` interface** — Method signatures frozen. New methods additive only.
4. **Write queue API** — `queueWrite`, `flush`, `setWriteQueueBoard`, `initWriteQueue` signatures unchanged.
5. **Spatial index singleton** — `spatialIndex` remains module-level (outside Zustand state) to avoid subscriber churn.
6. **Zustand store existence** — `objectsStore`, `selectionStore`, `viewportActionsStore`, `historyStore`, `dragOffsetStore` persist. None deleted or merged.
7. **AI command interface** — `AIService.processCommand`, tool executor, and `getObjects()` callback shape preserved.
8. **Subscription callback shape** — `IObjectsSnapshotUpdate` interface (`objects`, `changes`, `isInitialSnapshot`) unchanged.
9. **Optimistic update + rollback** — `useObjects` continues to support optimistic create/update/delete with rollback on failure. Mechanism may change, behavior must not regress.
10. **History command shape** — `IHistoryCommand` and `IHistoryEntry` types unchanged. `executeUndo`/`executeRedo` signatures unchanged.
