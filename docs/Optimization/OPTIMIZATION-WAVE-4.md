# Wave 4 — Outsized Quick Wins

Two high-ROI optimizations that follow established Zustand patterns in the codebase. ~2 hours total.

---

## 1. Kill ViewportActionsContext → Zustand Store

**Goal:** Eliminate the last React Context provider so viewport action consumers use Zustand selectors instead of context re-renders.

**Why it matters:** `ViewportActionsContext` wraps `<BoardView>` in `App.tsx`. Any update to the context value forces every consumer (including `useAI`) to re-render, even if only one method changed. Zustand selectors limit re-renders to components that actually read the changed slice.

**Current flow:**
```
App.tsx creates viewportActions object (new ref every render or dep change)
  → ViewportActionsContext.Provider value={viewportActions}
    → useAI.ts reads all 5 methods via useContext
    → Any context value change → all consumers re-render
```

**Target flow:**
```
viewportActionsStore (Zustand)
  → useAI reads only what it needs via selector
  → BoardCanvas pushes actions into store via useEffect (no Provider needed)
  → No context re-renders
```

### Files touched
- `src/contexts/ViewportActionsContext.tsx` — **deleted**
- `src/contexts/` — **directory removed** (empty)
- `src/stores/viewportActionsStore.ts` — **created**
- `src/App.tsx` — removed Provider wrapper, removed `viewportActions` state, removed `onViewportActionsReady` prop
- `src/hooks/useAI.ts` — reads from store via per-field selectors
- `src/components/canvas/BoardCanvas.tsx` — pushes actions into store via `useViewportActionsStore`
- `tests/unit/useAI.test.ts` — updated to use store instead of Context wrapper
- `src/types/canvas.ts` — updated comments

### Checklist
- [x] Audit all consumers of `ViewportActionsContext` / `useViewportActions`
- [x] Create `src/stores/viewportActionsStore.ts` with same shape as context value
- [x] Update `BoardCanvas.tsx`: push actions into store via `setViewportStoreActions`
- [x] Update `App.tsx`: remove Provider, remove `viewportActions` state, remove `onViewportActionsReady` prop
- [x] Update `useAI.ts`: read from store instead of context (per-field selectors)
- [x] Update all other consumers (only `useAI` was a consumer)
- [x] Delete `ViewportActionsContext.tsx` and `src/contexts/` directory
- [x] Verify: `bun run typecheck` passes
- [x] Verify: `bun run lint` passes (no new warnings)
- [x] Verify: `bun run test:run` passes — 711/711 tests pass
- [ ] Verify: app works — viewport zoom/export actions still function

---

## 2. Eliminate React-State Middleman in useObjects

**Goal:** Update Zustand `objectsStore` in the same call as React `setObjects`, removing the `useEffect` that caused an extra render cycle per sync event.

**Why it matters:** Previously the flow was:
```
Firestore onSnapshot
  → setObjects(React useState)     ← render cycle 1
  → useEffect detects objects change
  → storeSetAll(Zustand store)     ← render cycle 2 (async, after paint)
  → store subscribers render
```

**New flow:**
```
Firestore onSnapshot
  → setObjects wrapper
    → React state update          ← render cycle 1
    → store.setAll() synchronous  ← same batch, no extra cycle
  → both React and store subscribers render together
```

### Files touched
- `src/hooks/useObjects.ts` — replaced `setObjects` with wrapper that syncs both React state and Zustand store; removed sync `useEffect`; simplified clear `useEffect`

### Checklist
- [x] Read current `useObjects.ts` and `objectsStore.ts` to understand the dual-write pattern
- [x] Identify all places React `objects` state is read (vs. store)
- [x] Create `setObjects` wrapper that calls `useObjectsStore.getState().setAll()` inside React updater
- [x] Remove `useEffect(() => { storeSetAll(objects) })` — no longer needed
- [x] Simplify clear `useEffect` to use `useObjectsStore.getState().clear()` directly
- [x] Fix exhaustive-deps lint warnings (add `setObjects` to callback dependency arrays)
- [x] Verify: `bun run typecheck` passes
- [x] Verify: `bun run lint` passes (no new warnings from our changes)
- [x] Verify: `bun run test:run` passes — 711/711 tests pass
- [ ] Verify: CRUD operations work (create, update, delete objects on canvas)
- [ ] Verify: real-time sync works (changes from other users appear)

---

## Verification (after both tasks)

- [x] `bun run typecheck` clean
- [x] `bun run lint` clean (pre-existing warnings only: dragOffsetStore padding, BoardCanvas memoization, max-use-effect-count)
- [x] `bun run test:run` — 711/711 tests pass (75 test files)
- [ ] Manual smoke test: open board, select objects, use AI panel, pan/zoom, create/delete objects
