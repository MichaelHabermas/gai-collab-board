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

## Epic — Guest Board (Global Anonymous Board)

### G1 — Guest board constant and doc

- **Status:** done
- **Tier:** sonnet | **Role:** architect
- **Description:** Add `GUEST_BOARD_ID` and `isGuestBoard(boardId)` (e.g. in boardService or lib/constants). Ensure `boards/guest` document exists: one-time seed script or doc in README. Document in `docs/GUEST-BOARD.md` (anonymous identity, no delete, not in list).
- **Acceptance:** Constant and helper exist; guest board doc creation is documented or scripted; GUEST-BOARD.md describes behavior and identity.
- **Dependencies:** none
- **Branch:** —
- **Retries:** 0

### G2 — Firestore rules for guest board

- **Status:** done
- **Tier:** sonnet | **Role:** architect
- **Description:** In firestore.rules: allow unauthenticated read/create/update for `boards/guest` and `boards/guest/objects`; deny delete for `boards/guest`. Keep existing auth rules for other boards.
- **Acceptance:** Unauthenticated can read/write guest board and objects; delete on boards/guest is denied; other boards unchanged.
- **Dependencies:** G1
- **Branch:** —
- **Retries:** 0

### G3 — Backend: prevent guest board delete

- **Status:** done
- **Tier:** haiku | **Role:** quick-fixer
- **Description:** In boardService.ts deleteBoard: if isGuestBoard(boardId) throw before transaction.
- **Acceptance:** deleteBoard(guestBoardId, anyUserId) throws; no Firestore delete attempted.
- **Dependencies:** G1
- **Branch:** agent/guest-g3
- **Retries:** 0

### G4 — Anonymous identity helper and docs

- **Status:** done
- **Tier:** sonnet | **Role:** architect
- **Description:** Implement getOrCreateAnonymousId() (e.g. in lib/guestSession.ts) using sessionStorage; return stable id and display name "Guest". Extend docs/GUEST-BOARD.md with how anonymous users are represented (presence/cursor/audit).
- **Acceptance:** Helper returns stable session id and "Guest"; GUEST-BOARD.md updated with identity/presence/audit.
- **Dependencies:** none
- **Branch:** —
- **Retries:** 0

### G5 — Hooks: optional user and guest board

- **Status:** done
- **Tier:** opus | **Role:** architect
- **Description:** useObjects: accept user | null; when null use getOrCreateAnonymousId() for createdBy. usePresence/useCursors: when user null use same anonymous id for uid and "Guest". useBoardAutoJoin: no-op when isGuestBoard(boardId). useCanEdit/call sites: isGuestBoard(boardId) -> canEdit true, canManage false.
- **Acceptance:** All hooks work with null user on guest board; auto-join skipped for guest; guest board is editable by all.
- **Dependencies:** G1, G4
- **Branch:** —
- **Retries:** 0

### G6 — Routing and unauthenticated guest view

- **Status:** done
- **Tier:** opus | **Role:** architect
- **Description:** In App.tsx: when !user and paramBoardId === GUEST_BOARD_ID, render full board view with anonymous id (no redirect). When !user and other boardId, keep LoggedOutBoardRedirect. BoardView (or GuestBoardView) accepts user | null and uses anonymous id when null.
- **Acceptance:** /board/guest when logged out shows editable board; other /board/:id when logged out still redirects to login.
- **Dependencies:** G1, G4, G5
- **Branch:** —
- **Retries:** 0

### G7 — BoardListSidebar exclude guest board

- **Status:** done
- **Tier:** haiku | **Role:** quick-fixer
- **Description:** In BoardListSidebar.tsx, filter out GUEST_BOARD_ID from the list so the guest board never appears in "My boards".
- **Acceptance:** Guest board never shown in sidebar board list.
- **Dependencies:** G1
- **Branch:** agent/guest-g7
- **Retries:** 0

### G8 — Header: guest board link and guest-only UI

- **Status:** done
- **Tier:** sonnet | **Role:** architect
- **Description:** In App.tsx BoardView header: add "Guest board" / "Try the board" link to /board/guest when logged in. When boardId === GUEST_BOARD_ID: show board name read-only, no rename, no Share (or copy-link only), no Leave.
- **Acceptance:** Logged-in users see header link to guest board; on guest board header shows read-only name and no rename/Share/Leave.
- **Dependencies:** G1, G6
- **Branch:** —
- **Retries:** 0

### G9 — WelcomePage: notice and button

- **Status:** done
- **Tier:** sonnet | **Role:** architect
- **Description:** In WelcomePage.tsx: add visible notice (banner or copy) that a shared guest board exists; add button "Open guest board" / "Try without signing in" linking to /board/guest.
- **Acceptance:** Landing page has notice and CTA that navigates to /board/guest.
- **Dependencies:** G1
- **Branch:** —
- **Retries:** 0

### G10 — RTDB rules for guest board

- **Status:** done
- **Tier:** sonnet | **Role:** architect
- **Description:** In database.rules.json: allow read/write for boards/guest/cursors and boards/guest/presence without auth; relax uid validation for guest so anonymous session ids can write.
- **Acceptance:** Unauthenticated clients can read/write presence and cursors for guest board path.
- **Dependencies:** G1
- **Branch:** —
- **Retries:** 0

### G11 — E2E: guest board acceptance

- **Status:** done
- **Tier:** sonnet | **Role:** tester
- **Description:** Add E2E tests: (1) Logged out: open landing, click guest board CTA, can edit. (2) Logged in: open guest board from header, can edit. (3) Guest board does not appear in boards list. (4) Delete not available for guest board.
- **Acceptance:** Four acceptance scenarios in tests/e2e/guest-board.spec.ts; data-testid guest-board-cta, header-guest-board-link for implementation.
- **Dependencies:** G1–G10 (implementation makes tests pass).
- **Branch:** agent/test-guest-board
- **Retries:** 0

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

### G11 — E2E: guest board acceptance

- **Status:** review
- **Tier:** sonnet | **Role:** tester
- **Description:** Write E2E acceptance tests (Playwright) in tests/e2e/ for the Guest Board feature. Tests describe desired behavior (they will fail until implementation exists). Requirements: (1) Logged out: landing guest CTA → /board/guest, user can edit; (2) Logged in: header guest board link → /board/guest, user can edit; (3) Guest board not in boards list sidebar; (4) Delete board not available on guest board.
- **Acceptance:** tests/e2e/guest-board.spec.ts with 4 tests, data-testid selectors, following existing E2E patterns.
- **Dependencies:** none
- **Branch:** agent/test-guest-board

## Completed Tasks

<!-- Move tasks here when done. Keep last 20 for context. Prune older ones. -->
