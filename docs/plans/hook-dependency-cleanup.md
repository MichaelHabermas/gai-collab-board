# Hook Dependency Cleanup Plan

## Problem

Functions in React dependency arrays cause unnecessary re-runs when the function identity changes every render. This repo has several instances of function deps, unnecessary `useCallback` wrapping, dead code, and one inline anonymous function that creates a new reference every render. Additionally, there's no lint rule preventing regressions.

---

## Audit Results

### Issues Found

| # | File | Hook | Issue | Severity |
|---|------|------|-------|----------|
| 1 | `useLineLikeShape.ts:35-41` | arg to `useShapeTransformHandler` | Inline anonymous fn created every render, passed to a hook that puts it in a `useCallback` dep array | **High** |
| 2 | `useCanvasOperations.ts:293-447` | `useEffect` | 7 function deps (`handleDelete`, `handleDuplicate`, `handleCopy`, `handlePaste`, `clearSelection`, `setSelectedIds`, `onObjectCreate`). Each is `useCallback`-wrapped or a Zustand action (stable), so technically correct — but the effect re-attaches `keydown` listener whenever *any* upstream dep changes. The handler should be defined inside the effect. | **Medium** |
| 3 | `useCanvasOperations.ts:48-50` | `useCallback` (`getSelectedObjects`) | Returns `objects.filter(...)` — changes every time `objects` or `selectedIds` changes. Used in `handleDuplicate` and `handleCopy` dep arrays, causing those callbacks to also re-create. Should be a plain function called at use-site or moved inside each callback. | **Medium** |
| 4 | `useCanvasOperations.ts:287-290` | `useCallback` (`handleSelectAll`) | No-op stub with empty deps. Dead code. | **Low** |
| 5 | `useSelection.ts` (entire file) | N/A | **Dead module.** Selection lives in `selectionStore.ts` (Zustand). This hook is imported nowhere. Contains 6 unnecessary `useCallback` wrappers. | **Low** |
| 6 | `useSelection.ts:54-58` | `useCallback` (`isSelected`) | Depends on `[selectedIds]` — re-creates every state change, defeating `useCallback`. Would be a derived value, but the whole file is dead anyway. | **Low** |
| 7 | `useConnectionStatus.ts:33-35` | `useCallback` (`clearOfflineFlag`) | Wraps a single `setState(false)` call with `[]` deps. Unnecessary — the function is only used as a return value of a hook that likely has few consumers. | **Low** |
| 8 | `useTheme.ts:54-65` | `useCallback` (`setTheme`, `toggleTheme`) | Both wrap simple state transitions with `[]` deps. Unnecessary wrapping — these call module-level `applyTheme()` which is stable. | **Low** |
| 9 | `useLineLikeShape.ts:38` | N/A | `as ITransformEndLineAttrs` type cast inside the inline fn. Violates no-cast preference. Should use a type guard. | **Low** |
| 10 | `useCanvasKeyboardShortcuts.ts:84` | N/A | `as { current: ToolMode }` cast on `activeToolRef`. Violates no-cast preference. | **Low** |

### Already Good

- `useCanvasViewport.ts` — all `useCallback` deps are refs or primitives. Clean.
- `useHistory.ts` — uses refs for raw fns, callbacks only where needed.
- `useBatchDraw.ts` — minimal, correct deps.
- `useComments.ts` — clean dependency tracking.
- `useDebouncedNumberField.ts` — `commitValue` dep is a properly-chained `useCallback`. Acceptable.
- `useShapeDragHandler.ts` / `useShapeTransformHandler.ts` — return values of hooks, `useCallback` is necessary for stable identity.

---

## Fix Plan

### Phase 1: High-impact fixes (function deps causing re-renders)

**1.1 — `useLineLikeShape.ts`: Extract inline fn to `useMemo`**

The anonymous function at line 35-41 creates a new reference every render. Wrap with `useMemo`:

```ts
const wrappedTransformEnd = useMemo(
  () =>
    onTransformEnd
      ? (attrs: ITransformEndAttrsUnion) => {
            if ('points' in attrs) {
              onTransformEnd(attrs); // fix type guard to narrow properly
            }
          }
      : undefined,
  [onTransformEnd]
);

const handleTransformEnd = useShapeTransformHandler('line', wrappedTransformEnd);
```

Also fix the `as` cast with a proper type guard or discriminated union narrowing.

**1.2 — `useCanvasOperations.ts`: Move handler inside effect**

The keyboard shortcut `useEffect` (line 293-447) has 10 deps including 7 functions. The entire `handleKeyDown` function + all its logic should be defined *inside* the effect body. The deps become just the raw data the handler reads: `selectedIds`, `objects`, `clipboard`. The callback props (`onObjectCreate`, `onObjectDelete`, etc.) should be read from a ref to avoid being deps.

Pattern:
```ts
// Store latest callbacks in refs
const onObjectCreateRef = useRef(onObjectCreate);
onObjectCreateRef.current = onObjectCreate;
// ... same for other callback props

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // use refs for callbacks: onObjectCreateRef.current(...)
    // use state values directly (they're in the dep array)
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedIds, objects, clipboard]);
```

**1.3 — `useCanvasOperations.ts`: Remove `getSelectedObjects` useCallback**

`getSelectedObjects` is a `useCallback` that returns a filtered array — it changes whenever `objects` or `selectedIds` changes, making it useless as a stable reference. Inline `objects.filter(o => selectedIds.includes(o.id))` at each call site (handleDuplicate, handleCopy) or use a plain function.

### Phase 2: Remove unnecessary useCallback

**2.1 — `useConnectionStatus.ts`: Remove `useCallback` from `clearOfflineFlag`**

Replace:
```ts
const clearOfflineFlag = useCallback(() => setWasOffline(false), []);
```
With:
```ts
const clearOfflineFlag = () => setWasOffline(false);
```

This hook is consumed in one place. No child component relies on referential equality of this function.

**2.2 — `useTheme.ts`: Remove `useCallback` from `setTheme` and `toggleTheme`**

Same rationale — these are consumed via the hook return, not passed as props to memoized children. Plain functions suffice.

### Phase 3: Dead code removal

**3.1 — Delete `useSelection.ts`**

The entire file is unused. Selection is managed by `selectionStore.ts` (Zustand). No imports reference `useSelection` anywhere in the codebase. Delete it.

**3.2 — Remove `handleSelectAll` from `useCanvasOperations.ts`**

It's a no-op stub (empty `useCallback` with a comment saying "this would need to be implemented"). Select-all is already implemented in the `useEffect` keydown handler at line 345. Remove from the return type and return object.

### Phase 4: Type cast cleanup (bonus, related to inline fn fix)

**4.1 — `useLineLikeShape.ts:38`: Replace `as ITransformEndLineAttrs` cast**

The `'points' in attrs` check narrows the type. Either:
- Add a type guard function: `function isLineAttrs(a: ITransformEndAttrsUnion): a is ITransformEndLineAttrs`
- Or make the union discriminated (add a `kind` field) so the `in` check narrows automatically.

**4.2 — `useCanvasKeyboardShortcuts.ts:84`: Replace `as { current: ToolMode }` cast**

The cast is used to mutate `activeToolRef.current`. Use `MutableRefObject<ToolMode>` as the type of the ref parameter instead.

---

## Regression Prevention

### New ESLint rule: `no-function-in-deps`

Create a custom ESLint rule at `eslint-rules/no-function-in-deps.js` that warns when:

1. A function **defined in the component body** (not imported, not from a ref) appears in a dependency array
2. A `useCallback` with `[]` deps wraps a function that only calls setState — these are already stable via React's guarantee

This won't catch every case perfectly (it's hard to statically determine if a dep is a function), but it covers the most common patterns:
- Arrow functions defined in the component
- Named functions defined in the component
- `useCallback` wrappers with empty deps around trivial setState calls

**Config addition to `eslint.config.js`:**
```js
"local/no-function-in-deps": "warn",
```

### Strengthen existing `exhaustive-deps`

The existing `react-hooks/exhaustive-deps` is enabled via the recommended config. No changes needed — it already catches missing deps. The new rule complements it by catching *unnecessary* function deps (the opposite problem).

### Documentation

Add a brief note to `CLAUDE.md` or project conventions:
> Functions should not appear in hook dependency arrays. Move functions inside the effect, extract them outside the component, or use refs for callback props. `useCallback` is only justified when a stable function identity is required by a memoized child or another hook's dep array.

---

## Execution Order

1. **Phase 3 first** (dead code removal) — smallest diff, no behavior change, clears noise
2. **Phase 1** (high-impact fixes) — biggest perf/correctness wins
3. **Phase 2** (unnecessary useCallback) — minor cleanup
4. **Phase 4** (type casts) — bonus, aligns with project preferences
5. **Lint rule** — last, so we can verify it catches the patterns we just fixed
6. **Verification** — run `bun run lint`, `bun run typecheck`, `bun run test` after each phase

## Estimated Scope

- **Files modified:** 6 (`useLineLikeShape.ts`, `useCanvasOperations.ts`, `useConnectionStatus.ts`, `useTheme.ts`, `useCanvasKeyboardShortcuts.ts`, `eslint.config.js`)
- **Files deleted:** 1 (`useSelection.ts`)
- **Files created:** 1 (`eslint-rules/no-function-in-deps.js`)
- **Risk:** Low-medium. Phase 1.2 (refactoring the keyboard effect) is the largest change and touches keyboard shortcut behavior — needs manual testing.
