# Task Board

<!--
Status: backlog | todo | in-progress | review | done | blocked | escalate
Tier: haiku | sonnet | opus
Role: quick-fixer | architect | reviewer | tester
Retries: number of review rejections (max 3 before escalate)
Branch: worktree branch name (set when work begins)

Agents: update YOUR task only. Read others for context.
Orchestrator: owns task creation, assignment, and merging.
-->

## Epic 0 — Governance (STATE-MANAGEMENT-PLAN-2.md)

### E0-1 — Amend CONSTITUTION.md with Articles IX–XIX

- **Status:** done
- **Tier:** haiku | **Role:** quick-fixer
- **Description:** Add Articles IX–XIX (state management unification amendment) and Invariants section to `docs/CONSTITUTION.md`. Scoped to S1–S7 work only.
- **Acceptance:** 19 articles present. No conflicts with Articles I–VIII. `bun run validate` passes.
- **Dependencies:** none
- **Branch:** spike/state-management-cleanup-1

### E0-2 — Create STATE-MGMT-REVIEWER-CHECKLIST.md

- **Status:** done
- **Tier:** haiku | **Role:** quick-fixer
- **Description:** Create `docs/STATE-MGMT-REVIEWER-CHECKLIST.md` — per-PR checklist for S1–S7 reviewers covering all new articles.
- **Acceptance:** Checklist covers Articles IX–XIX. Copyable into PR descriptions.
- **Dependencies:** E0-1
- **Branch:** spike/state-management-cleanup-1

### E0-3 — Update STATE-MANAGEMENT-PLAN-2.md references

- **Status:** done
- **Tier:** haiku | **Role:** quick-fixer
- **Description:** Update `STATE-MANAGEMENT-PLAN-2.md` Assumptions section to reference the constitution amendment (Articles IX–XIX) and reviewer checklist.
- **Acceptance:** Plan references new articles and checklist.
- **Dependencies:** E0-1, E0-2
- **Branch:** spike/state-management-cleanup-1

## Active Tasks

### T1 — Fix useConnectorCreation stale closure bug

- **Status:** todo
- **Tier:** sonnet | **Role:** architect
- **Description:** Promise `.then()/.catch()` in `handleConnectorNodeClick` (line ~35-82) executes `setConnectorFrom(null)`, `setActiveTool('select')`, and `activeToolRef.current = 'select'` after async `onObjectCreate`. If component unmounts before promise settles, these fire on stale state/refs.
- **Acceptance:** Promise cleanup on unmount (abort flag or ref guard). No state updates after unmount. Test covers the fix.
- **Dependencies:** none
- **Branch:** —

### T2 — Unit tests: useConnectorCreation

- **Status:** todo
- **Tier:** sonnet | **Role:** tester
- **Description:** Write unit tests for `src/hooks/useConnectorCreation.ts` (85 lines). Two-click connector flow: first click sets `connectorFrom`, second click creates connector via `onObjectCreate`. Follow test pattern from `tests/unit/useShapeDrawing.test.ts`.
- **Acceptance:** Tests cover: initial state, first click (sets from), second click (calls create), reset, error path. Coverage >80% for the hook.
- **Dependencies:** T1 (test the fixed version)
- **Branch:** —

### T3 — Unit tests: useMarqueeSelection

- **Status:** todo
- **Tier:** sonnet | **Role:** tester
- **Description:** Write unit tests for `src/hooks/useMarqueeSelection.ts` (126 lines). Rubber-band selection with AABB hit testing. Mock Konva stage pointer position and objects array.
- **Acceptance:** Tests cover: start selection, update rect on move, end selection (hit test), empty selection, additive selection (shift). Coverage >80%.
- **Dependencies:** none
- **Branch:** —

### T4 — Unit tests: useViewportActions

- **Status:** todo
- **Tier:** sonnet | **Role:** tester
- **Description:** Write unit tests for `src/hooks/useViewportActions.ts` (132 lines). Zoom, export callbacks, viewport actions store wiring.
- **Acceptance:** Tests cover: zoom in/out, zoom to fit, export callback, store sync. Coverage >80%.
- **Dependencies:** none
- **Branch:** —

### T5 — Unit tests: useObjectDragHandlers

- **Status:** todo
- **Tier:** opus | **Role:** tester
- **Description:** Write unit tests for `src/hooks/useObjectDragHandlers.ts` (762 lines). This is the largest and most complex hook — drag/select/transform handlers, handler map caching, alignment guides, spatial index drag exemptions. Break into logical test groups.
- **Acceptance:** Tests cover: single drag, multi-select drag, transform, alignment guide snapping, handler map caching, frame containment. Coverage >80%.
- **Dependencies:** none
- **Branch:** —

### T6 — Review: useObjects incremental change logic

- **Status:** todo
- **Tier:** sonnet | **Role:** architect
- **Description:** Review the coupled condition at `useObjects.ts:203` — `nextObjects === prevObjects && update.objects.length !== prevObjects.length`. Determine if this is correct defensive logic or a latent bug. Add a code comment if correct, or fix if not.
- **Acceptance:** Condition is documented or fixed. No behavioral regression.
- **Dependencies:** none
- **Branch:** —

## Completed Tasks

<!-- Move tasks here when done. Keep last 20 for context. Prune older ones. -->
