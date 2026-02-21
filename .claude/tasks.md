# Single Source of Truth for Board Defaults — Tasks

Base branch: current (development). Source: plan single_source_board_defaults.

---

## T1 — Create src/lib/boardObjectDefaults.ts

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** board-defaults-lib
- **Description:** Create shared module `src/lib/boardObjectDefaults.ts` with all creation constants and STICKY_COLORS.
- **Dependencies:** None

---

## T2 — AI defaults.ts import from lib and re-export

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** board-defaults-ai
- **Description:** defaults.ts imports from @/lib/boardObjectDefaults; re-exports; templates/interfaces/helpers unchanged.
- **Dependencies:** T1

---

## T3 — Remove duplicate STICKY_COLORS and wire consumers

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** board-defaults-sticky-colors
- **Description:** layoutUtils (done in T2), toolExecutor, StickyNote, shapes/index, Toolbar use lib STICKY_COLORS.
- **Dependencies:** T1, T2

---

## T4 — Canvas creation use shared defaults

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** board-defaults-canvas
- **Description:** BoardCanvas, useShapeDrawing, RectangleShape, CircleShape use lib defaults.
- **Dependencies:** T1

---

## T5 — Layouts and compoundExecutor use shared constants

- **Status:** done
- **Tier:** haiku
- **Role:** quick-fixer
- **Worktree name:** board-defaults-layouts
- **Description:** Replace hardcoded strokeWidth: 2 and textFill: #1e293b in layouts and compoundExecutor.
- **Dependencies:** T2

---

# Branch Coverage to 87% (Ralph-loop)

Base branch: development. Current branch coverage: 73.68%. Target: 87%.

---

## C1 — Tests for src/types/guards.ts (63.63% → ~100% branch)

- **Status:** done
- **Tier:** sonnet
- **Role:** tester
- **Description:** Add tests/unit/guards.test.ts. Test isBoardObject, isBoard, isKonvaGroup, isKonvaRect, isKonvaEllipse, isKonvaLine (Line and Arrow branches), isKonvaText with valid inputs, null, non-objects, and wrong shape. Mock Konva node getClassName() where needed.
- **Acceptance criteria:** guards.ts branch coverage ≥ 95%; bun run test:coverage passes for tests/unit/guards.test.ts.

---

## C2 — Firebase getRealtimeDb branch coverage

- **Status:** done
- **Tier:** haiku
- **Role:** tester
- **Description:** In tests/unit/firebase.test.ts (or new tests), add test that getRealtimeDb() returns the same Database instance on multiple calls (lazy init branch). Keep existing env validation tests.
- **Acceptance criteria:** firebase.ts branch coverage increases; no regression in existing firebase tests.

---

## C3 — useHistory branch coverage (50% → higher)

- **Status:** done
- **Tier:** sonnet
- **Role:** tester
- **Description:** In tests/unit/useHistory.test.ts add tests that hit uncovered branches (lines 111-113, 123-125): undo/redo at boundary, clear history on board change, record branches for create/update/delete.
- **Acceptance criteria:** useHistory.ts branch coverage ≥ 75%; all new tests pass.

---

## C4 — historyService.ts branch coverage (68.75%)

- **Status:** done
- **Tier:** sonnet
- **Role:** tester
- **Description:** Add or extend tests for src/modules/history/historyService.ts. Cover branches in 26-41 and 66-112 (canPush, undo/redo limits, serialization).
- **Acceptance criteria:** historyService.ts branch coverage ≥ 85%; bun run validate passes.

---

## C5 — useFrameContainment and useVisibleShapeIds branch coverage

- **Status:** done
- **Tier:** sonnet
- **Role:** tester
- **Description:** Add tests for useFrameContainment (60% branch) and useVisibleShapeIds (61.53% branch). Hit conditional branches: viewport vs all, empty selection, frame children.
- **Acceptance criteria:** Both hooks branch coverage ≥ 75%; tests pass.

---

## C6 — Run coverage and loop

- **Status:** in-progress
- **Tier:** haiku
- **Role:** quick-fixer
- **Description:** After C1–C5 (or batch) complete, run bun run test:coverage. If branch coverage < 87%, add next high-ROI tasks (e.g. AIChatPanel, RightSidebar, BoardCanvas) and re-spawn agents. Repeat until ≥ 87%.
- **Acceptance criteria:** Coverage report shows branches ≥ 87%.
- **Dependencies:** C1, C2, C3, C4, C5

---

## C7 — High-ROI hook/service branch coverage (78.84% → ~84%)

- **Status:** in-progress
- **Tier:** sonnet
- **Role:** tester
- **Description:** Add tests to raise branch coverage. Target files: useExportAsImage (45% branch), useAlignmentGuideCache (50%), commentService (66%), usageLedger (66%), useCanvasKeyboardShortcuts (66%). Hit conditional and error branches; mock deps. Vitest coverage currently excludes server (src only).
- **Acceptance criteria:** New or extended tests pass; branch coverage (src) increases by ≥3 percentage points.

---

## C8 — Second wave: boardService, snapToGrid, connectorAnchors, components (79.6% → 87%)

- **Status:** in-progress
- **Tier:** sonnet
- **Role:** tester
- **Description:** Add branch tests for: boardService.ts (78.84% — lines 66, 86, 198), snapToGrid.ts (70.83%), connectorAnchors (69.23%), and if needed RightSidebar or AIChatPanel key branches. Goal: push src branch coverage to ≥87%.
- **Acceptance criteria:** bun run test:coverage shows branches ≥ 87% (with server excluded in config).
