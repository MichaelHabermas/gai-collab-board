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
