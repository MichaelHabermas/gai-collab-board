# CollabBoard — Project Rules

## Constitution

All work on the state improvement plan (Epics 1–3) is governed by `docs/CONSTITUTION.md`. The constitution is inviolable. Violations block merge. Read it before starting any task.

## Package Manager

**bun only.** No npm. No yarn. Applies to install, run, test, build — everything.

## Architecture

- React-Konva canvas app, Zustand state management, Firebase Firestore persistence
- Component chain: `BoardCanvas` → `StoreShapeRenderer` → `CanvasShapeRenderer` → shape components
- BoardCanvas is a thin orchestrator. Logic lives in extracted hooks:
  - `useShapeDrawing` — drawing state, preview rendering (returns JSX → .tsx)
  - `useMarqueeSelection` — rubber-band selection rect + AABB hit testing
  - `useConnectorCreation` — two-click connector flow
  - `useViewportActions` — zoom/export callbacks + viewport actions store wiring
  - `useObjectDragHandlers` — all drag/select/transform handlers, handler maps, alignment guides
- Mouse handlers use **dispatch pattern**: thin wrappers route to hook handlers based on `activeTool`

## Code Standards

- TypeScript strict. **No `as` casts** — use type guards or fix the types.
- **Minimize useEffect**: derive state during render, use event handlers. Only for true side effects.
- **Minimize useRef**: only for DOM handles or stable cross-render identity with no alternative.
- ESLint: blank line before return statements. Max 2 useEffects per component.
- Hooks returning JSX must be `.tsx` files.
- Functions <40 lines. Files <300 lines. PRs small and focused.
- Hook config objects: large hooks take a typed config interface, not 10+ params.

## Write Queue Pattern

- `queueWrite(id, updates)` for high-frequency ops (text, opacity, color)
- `onObjectUpdate` for structural/infrequent changes
- Optimistic: `useObjectsStore.getState().updateObject()` for immediate UI, `queueWrite()` for Firestore

## Testing

- Vitest for unit/integration. Playwright for E2E.
- 80% coverage thresholds (statements, branches, functions, lines).
- **E2E-first**: write acceptance tests before implementation when scope is clear.
- data-testid selectors for E2E, not CSS classes.
- Mock Firebase and external services in unit tests. Never hit real APIs.
- Run `bun run validate` before committing.
- For release: `bun run release:gate`.

## Performance

- Never put 60Hz-changing state in useMemo deps that gate O(n) work.
- Spatial index for viewport culling (`useVisibleShapeIds`), not brute-force AABB.
- Lazy dynamic imports (`import()`) for heavy modules — top-level imports load eagerly.
- Refs or imperative updates for per-frame changes, not React state.

## Orchestration Protocol

### Task Board

All work is tracked in `.claude/tasks.md`. Agents MUST:

1. Read `.claude/tasks.md` to find assigned tasks
2. Update task status when starting work (`in-progress`)
3. Update task status when done (`review` for architect, `done` for quick-fixer/tester)
4. Include specific notes on any blockers or issues

### Worktrees

Each parallel agent works in its own worktree:

- Create: `bun run scripts/worktree-manager.ts create <name>`
- Merge: `bun run scripts/worktree-manager.ts merge <name>`
- Cleanup: `bun run scripts/worktree-manager.ts cleanup <name>`
- List: `bun run scripts/worktree-manager.ts list`

### Model Tiering

| Task Type | Model | Agent |
| --- | --- | --- |
| Lint fix, format, simple rename | haiku | quick-fixer |
| Standard feature, bug fix | sonnet | architect |
| Multi-file refactor, perf opt | opus | architect |
| Code review | sonnet | reviewer |
| Test writing | sonnet | tester |

### Review Loop

- Reviewer runs `bun run validate` + reads diff
- Approve → merge → done
- Reject → specific feedback in tasks.md → original agent retries
- Max 3 rejections → task status becomes `escalate` → human decides
