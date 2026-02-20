# Wave 4 — Outsized Quick Wins

---

## Completed

### 1. Kill ViewportActionsContext → Zustand Store ✅

**Goal:** Eliminate the last React Context provider so viewport action consumers use Zustand selectors instead of context re-renders.

**Why it matters:** `ViewportActionsContext` wraps `<BoardView>` in `App.tsx`. Any update to the context value forces every consumer (including `useAI`) to re-render, even if only one method changed. Zustand selectors limit re-renders to components that actually read the changed slice.

**Files touched:**

- `src/contexts/ViewportActionsContext.tsx` — **deleted**
- `src/contexts/` — **directory removed** (empty)
- `src/stores/viewportActionsStore.ts` — **created**
- `src/App.tsx` — removed Provider wrapper, removed `viewportActions` state, removed `onViewportActionsReady` prop
- `src/hooks/useAI.ts` — reads from store via per-field selectors
- `src/components/canvas/BoardCanvas.tsx` — pushes actions into store via `useViewportActionsStore`
- `tests/unit/useAI.test.ts` — updated to use store instead of Context wrapper
- `src/types/canvas.ts` — updated comments

### Checklist

- [x] All items complete
- [x] Typecheck, lint (no new issues), 711/711 tests pass
- [ ] Manual smoke test: viewport zoom/export actions still function

---

### 2. Eliminate React-State Middleman in useObjects ✅

**Goal:** Update Zustand `objectsStore` in the same call as React `setObjects`, removing the `useEffect` that caused an extra render cycle per sync event.

**Files touched:**

- `src/hooks/useObjects.ts` — replaced `setObjects` with wrapper that syncs both React state and Zustand store; removed sync `useEffect`; simplified clear `useEffect`

### Checklist

- [x] All items complete
- [x] Typecheck, lint (no new issues), 711/711 tests pass
- [ ] Manual smoke test: CRUD and real-time sync

---

## Performance Metrics

Baseline captured before Wave 4 changes (tasks 1-2 only):

| Metric | Baseline | After 7+3+6 | After 4 | After 5 (final) |
|--------|----------|-------------|---------|-----------------|
| index.js | 552.28 KB | 552.13 KB (−0.15 KB) | 552.15 KB (+0.02 KB) | 538.75 KB (**−13.53 KB**) |
| AIChatPanel.js | 5.43 KB | 5.46 KB (+0.03 KB) | 5.46 KB | 5.46 KB |
| PropertyInspector.js | — (in index) | — (in index) | — (in index) | 13.83 KB (new chunk) |
| Tests | 711/711 | 711/711 | 711/711 | 711/711 |

**Key runtime improvements (not captured in bundle size):**
- Tasks 3+6: PropertyInspector + AIChatPanel no longer re-render on every object change — only when selected objects or empty↔non-empty state changes
- Task 4: BoardView + RightSidebar memo stops cascade re-renders from parent route changes
- Task 5: 13.83 KB deferred until Props tab is opened — faster initial paint
- Task 7: usePresence no longer writes to RTDB on Firebase token refresh (fewer network calls)

---

## Planned — Ranked by Priority

### Scoring Model

Same formula as OPTIMIZATION-PLAN.md:

`Score = (Improvement × 0.40) + (Risk × 0.30) + (Ease × 0.20) + (Wow × 0.10)`
`Priority % = (Score / 5) × 100`

| # | Task | Priority % | Improvement | Risk | Ease | Wow | Status |
|---|------|-----------|-------------|------|------|-----|--------|
| 3 | PropertyInspector → Zustand + memo | **74%** | 4 | 4 | 3 | 3 | ✅ |
| 4 | Memoize BoardView + RightSidebar | **70%** | 3 | 4 | 4 | 3 | ✅ |
| 5 | Lazy-load PropertyInspector | **70%** | 2 | 5 | 5 | 2 | ✅ |
| 6 | AIChatPanel: objects prop → store selector | **68%** | 2 | 5 | 5 | 1 | ✅ |
| 7 | usePresence: narrow `user` dependency | **60%** | 1 | 5 | 5 | 1 | ✅ |
| 8 | Board member ops: Firestore transactions | **36%** | 1 | 3 | 2 | 1 | Deferred |

---

### 3. PropertyInspector → Zustand Store + React.memo ✅ (74%)

**Goal:** Stop PropertyInspector (765 lines, 27.6 KB) from re-rendering on every object change. Only re-render when selected objects actually change.

**Why it matters:** PropertyInspector receives `objects: IBoardObject[]` as a prop from `App.tsx:329`. Any object mutation anywhere on the board replaces this array and triggers a full re-render of the 765-line component — even when the props tab is not active and the changed object is not selected. This is the single biggest re-render waste in the sidebar path.

**Current flow:**

```text
useObjects() returns objects array
  → BoardView passes objects={objects} to PropertyInspector
  → ANY object change → new array ref → PropertyInspector re-renders
  → PropertyInspector internally filters by selectedIds (useMemo)
  → Most of the work is wasted — selected objects didn't change
```

**Target flow:**

```text
PropertyInspector reads selectedIds from useSelectionStore
  → For each selectedId, reads useObjectsStore(s => s.objects[id])
  → Only re-renders when a SELECTED object changes
  → Wrap in React.memo to prevent parent-driven re-renders
```

#### Files to touch

- `src/components/canvas/PropertyInspector.tsx` — remove `objects` prop, subscribe to store directly, wrap in `React.memo`
- `src/App.tsx` — stop passing `objects` to `PropertyInspector`

#### Checklist

- [x] Remove `objects` prop from PropertyInspector interface
- [x] Subscribe to `useSelectionStore((s) => s.selectedIds)` (already done)
- [x] For each selectedId, derive object from `useObjectsStore`
- [x] Wrap component in `React.memo`
- [x] Remove `objects` prop from App.tsx usage site
- [x] Verify: typecheck, lint, test:run pass (711/711)
- [ ] Verify: property panel shows correct values for selected objects

---

### 4. Memoize BoardView + RightSidebar ✅ (70%)

**Goal:** Prevent cascade re-renders from `BoardViewRoute` through the entire board tree.

**Why it matters:** `BoardView` (318 lines, `App.tsx:61-379`) is NOT wrapped in `React.memo`. Any state change in the parent `BoardViewRoute` (e.g. navigation, auth state) re-renders BoardView and its entire subtree: BoardCanvas, RightSidebar, PropertyInspector, AIChatPanel, CommentPanel. Similarly, `RightSidebar` (181 lines) is not memoized and re-renders all tab content on any parent change.

**Current problem:**

```text
BoardViewRoute re-renders (any state change)
  → BoardView re-renders (not memoized)
    → BoardCanvas re-renders (memoized ✓ — stops here)
    → RightSidebar re-renders (NOT memoized)
      → PropertyInspector re-renders
      → AIChatPanel re-renders
      → CommentPanel re-renders
```

**Target:**

```text
BoardViewRoute re-renders
  → BoardView: React.memo — only re-renders if props actually change
    → RightSidebar: React.memo — only re-renders if tab/collapse state changes
```

#### Files to touch

- `src/App.tsx` — wrap `BoardView` in `React.memo`
- `src/components/board/RightSidebar.tsx` — wrap in `React.memo`
- Ensure all callback props are stable (`useCallback`)

#### Checklist

- [x] Wrap `BoardView` in `React.memo`
- [x] Verify all props passed to BoardView are stable (callbacks via `useCallback`, primitives)
- [x] Wrap `RightSidebar` in `React.memo`
- [x] Verify all props to RightSidebar are stable
- [x] Verify: typecheck, lint, test:run pass (711/711)
- [ ] Verify: no behavioral regressions in sidebar/tabs

---

### 5. Lazy-load PropertyInspector ✅ (70%)

**Goal:** Defer loading 765 lines / 27.6 KB of PropertyInspector until the user clicks the Props tab.

**Why it matters:** PropertyInspector is imported eagerly in `App.tsx:50` but only rendered when the "props" tab is active and `canEdit` is true. The existing pattern for `AIChatPanel` (already lazy-loaded at `App.tsx:28-30` with `React.lazy` + `Suspense`) can be followed exactly.

**Current state:**

```text
App.tsx line 50: import { PropertyInspector } from '@/components/canvas/PropertyInspector';
  → 27.6 KB loaded in main bundle regardless of tab state
```

**Target:**

```text
const PropertyInspector = lazy(() =>
  import('@/components/canvas/PropertyInspector').then((m) => ({ default: m.PropertyInspector }))
);
  → Loaded only when props tab is clicked
  → ~27 KB removed from initial bundle
```

#### Files to touch

- `src/App.tsx` — change static import to `React.lazy`, add `Suspense` wrapper

#### Checklist

- [x] Replace static import with `React.lazy` + dynamic import
- [x] Wrap PropertyInspector in `<Suspense fallback={null}>` (same pattern as AIChatPanel)
- [x] Verify: typecheck, lint, test:run pass (711/711)
- [ ] Verify: Props tab loads correctly on first click

---

### 6. AIChatPanel: objects prop → store selector ✅ (68%)

**Goal:** Stop AIChatPanel from re-rendering on every object change when it only needs the object count.

**Why it matters:** `AIChatPanel` receives `objects={objects}` at `App.tsx:343` but only uses it to check `objects.length > 0` for the "Explain Board" button state. Every object mutation triggers a re-render of the entire AI chat panel for no reason.

**Current:**

```text
<AIChatPanel objects={objects} ... />
  → ANY object change → AIChatPanel re-renders
  → Only reads objects.length
```

**Target:**

```text
// Inside AIChatPanel:
const hasObjects = useObjectsStore((s) => Object.keys(s.objects).length > 0);
  → Only re-renders when board goes from empty ↔ non-empty
  → Remove objects prop entirely
```

#### Files to touch

- `src/components/ai/AIChatPanel.tsx` — remove `objects` prop, add store selector
- `src/App.tsx` — stop passing `objects` to `AIChatPanel`

#### Checklist

- [x] Add `useObjectsStore` selector for `hasObjects` boolean
- [x] Remove `objects` prop from AIChatPanel interface
- [x] Remove `objects` prop at App.tsx call site
- [x] Verify: typecheck, lint, test:run pass (711/711)
- [ ] Verify: "Explain Board" / "Summarize Selection" buttons still work

---

### 7. usePresence: narrow `user` dependency ✅ (60%)

**Goal:** Prevent unnecessary presence updates when the Firebase `user` object reference changes but displayName/photoURL haven't.

**Why it matters:** `usePresence.ts:72` depends on `[boardId, user, currentUserColor]`. The `user` object is the full Firebase Auth User — its reference can change on token refresh or auth state updates even when name/photo are identical. Each change triggers an `updatePresence()` write to Realtime Database.

**Target:** Extract `user.displayName` and `user.photoURL` into the dependency array instead of the full object.

#### Files to touch

- `src/hooks/usePresence.ts` — narrow dependency array

#### Checklist

- [x] Replace `user` in useEffect dep array with `user?.displayName, user?.photoURL, user?.uid`
- [ ] Verify: presence still updates when user changes profile
- [ ] Verify: no unnecessary writes on auth token refresh

---

### 8. Board member operations: Firestore transactions (36%) — Deferred

**Goal:** Eliminate redundant `getBoard()` reads before every board mutation.

**Why it matters:** `boardService.ts` functions (`updateBoardName`, `addBoardMember`, `removeBoardMember`, `updateMemberRole`, `deleteBoard`) all call `getBoard(boardId)` first to check authorization, then write. That's 2 Firestore operations per action when 1 could suffice if authorization was in security rules or a transaction.

**Why deferred:** These are low-frequency user actions (board management, not canvas editing). The extra read adds ~50-100ms latency but doesn't affect real-time performance. Worth doing as cleanup but not an outsized win.

---

## Analysis Notes

### What was already well-optimized

- **Canvas hot path:** Per-shape subscriptions via `StoreShapeRenderer`, handler caching via ref maps, Zustand drag state — all prevent re-renders on the critical mousemove/render path
- **AIChatPanel:** Already lazy-loaded (`React.lazy` at `App.tsx:28-30`)
- **Firestore subscriptions:** All properly scoped per board/user, clean dependency arrays, no re-subscription storms
- **Cursor writes:** 16ms normal, 200ms during pan — well throttled
- **Batch operations:** `writeBatch` used for multi-object CRUD

### What the analysis ruled out

- **More Zustand stores for boards/preferences**: BoardListSidebar subscribes to Firestore directly with clean deps — adding a store would be over-engineering for components that render once on navigation
- **selectAllObjects optimization**: Already flagged "use sparingly" and callers correctly memoize via `useMemo`
- **BoardCanvas useEffect count (7)**: All necessary — ref syncs, cleanup, store propagation. No derived-state anti-patterns found
- **Lazy-load other components**: CommentPanel (211 lines, 7 KB), RightSidebar (181 lines, 6.3 KB), BoardListSidebar (526 lines, always needed on init) — too small or always needed

### Parallel-safety for tasks 3–7

| Task | Safe to parallel with | Cannot parallel with |
|------|----------------------|---------------------|
| 3 (PropertyInspector → store) | 5, 7 | 4 (shared App.tsx), 6 (shared objects prop removal) |
| 4 (Memoize BoardView + RightSidebar) | 5, 7 | 3 (shared App.tsx), 6 (shared App.tsx) |
| 5 (Lazy-load PropertyInspector) | 3, 4, 6, 7 | — (import-only change) |
| 6 (AIChatPanel objects → store) | 5, 7 | 3, 4 (shared App.tsx prop removal) |
| 7 (usePresence narrowing) | All | — (isolated file) |

**Recommended execution order:** 7 → 3+6 (together, both remove `objects` prop) → 4 → 5
