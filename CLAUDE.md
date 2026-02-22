# CollabBoard — Project Rules

## Constitution

All work on the state improvement plan (Epics 1–3) is governed by `docs/CONSTITUTION.md`. The constitution is inviolable. Violations block merge. Read it before starting any task.

## Package Manager

**bun only.** No npm. No yarn. Applies to install, run, test, build — everything.

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `.claude/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

All work is tracked in `.claude/tasks.md`. Agents MUST:

1. Read `.claude/tasks.md` to find assigned tasks
2. Update task status when starting work (`in-progress`)
3. Update task status when done (`review` for architect, `done` for quick-fixer/tester)
4. Include specific notes on any blockers or issues

Workflow for every task:

1. **Plan First**: Write plan to `.claude/tasks.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `.claude/tasks.md`
6. **Capture Lessons**: Update `.claude/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

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
