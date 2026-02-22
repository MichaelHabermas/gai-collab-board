# Single Source of Truth for Board Defaults — Tasks

**Active:** C6, C7, C8 (coverage). *(Update this line when starting/finishing tasks.)*

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

---

# Imperative Konva Migration V5 — Epic 0 & Epic 1

Base branch: spike/react-konva-1. Source: IMPERATIVE-KONVA-ORCHESTRATION.md

---

## IK1 — Constitutional Amendments (Articles XX–XXV, XXVII)

- **Status:** done
- **Tier:** haiku
- **Role:** quick-fixer
- **Worktree name:** epic0-constitution
- **Description:** Add Articles XX–XXV and XXVII to docs/CONSTITUTION.md. Exact text in V5 doc §6.1.
- **Dependencies:** None

---

## IK2 — Performance Baselines

- **Status:** pending
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic0-perf-baselines
- **Description:** Capture pre-migration metrics. Save to docs/perf-baselines/pre-migration.json.
- **Dependencies:** None

---

## IK3 — E2E Drag Tests

- **Status:** done
- **Tier:** sonnet
- **Role:** tester
- **Worktree name:** epic0-e2e-drag
- **Description:** Playwright tests: marqueeSelection.spec.ts, shapeDrag.spec.ts, multiSelectDrag.spec.ts, undoRedoDrag.spec.ts.
- **Dependencies:** None

---

## IK4 — E2E Connector + Transform Tests

- **Status:** done
- **Tier:** sonnet
- **Role:** tester
- **Worktree name:** epic0-e2e-connector-transform
- **Description:** Playwright tests: connectorCreation.spec.ts, connectorEndpointDrag.spec.ts, shapeResize.spec.ts, shapeRotate.spec.ts.
- **Dependencies:** IK3

---

## IK5 — E2E Frame + Text + Drawing Tests

- **Status:** done
- **Tier:** sonnet
- **Role:** tester
- **Worktree name:** epic0-e2e-frame-text-draw
- **Description:** Playwright tests: frameReparenting.spec.ts, stickyTextEdit.spec.ts, frameTitleEdit.spec.ts, alignmentGuides.spec.ts, drawingTools.spec.ts.
- **Dependencies:** IK4
- **Notes:** All 5 new specs pass. snapToGridDrag.spec.ts passes. textOverlayStability.spec.ts: 2 tests fail (overlay closes on blur when pan/zoom triggers focus loss); StickyNote given data-testid for overlay.

---

## IK6 — Factory Types + Registry

- **Status:** done
- **Notes:** types.ts + index.ts created. Registry has stub entries for all 7 shape types; IK7/8/9 will replace with real factories. format/lint/typecheck pass; main.test.tsx timeout is pre-existing.
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic1-factory-types
- **Description:** Create src/canvas/factories/types.ts and index.ts.
- **Dependencies:** IK1, IK2, IK5 (Review gate W1-R)

---

## IK7 — Simple Factories

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic1-simple-factories
- **Description:** createRectangle.ts, createCircle.ts, createLine.ts with tests.
- **Dependencies:** IK6

---

## IK8 — Complex Factories

- **Status:** done
- **Tier:** opus
- **Role:** architect
- **Worktree name:** epic1-complex-factories
- **Description:** createStickyNote.ts and createFrame.ts (cacheable=true) with tests.
- **Dependencies:** IK6
- **Notes:** createStickyNote.ts, createFrame.ts, types.ts, index.ts created. Unit tests in tests/unit/canvasFactories.test.ts (Konva mocked for jsdom). All 13 factory tests pass. validate fails only on pre-existing main.test.tsx timeout.

---

## IK9 — Connector + TextElement Factories

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic1-connector-text
- **Description:** createConnector.ts (4 modes) and createTextElement.ts with tests.
- **Dependencies:** IK6

---

## IK10 — LayerManager

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic2-layer-manager
- **Description:** Task B1: Create LayerManager.ts (4 layers, RAF batchDraw).
- **Dependencies:** IK6

---

## IK11 — KonvaNodeManager

- **Status:** done
- **Tier:** opus
- **Role:** architect
- **Worktree name:** epic2-node-manager
- **Description:** Task B2: Create KonvaNodeManager.ts (O(changed) diff, connector dedup).
- **Dependencies:** IK10, IK7, IK8, IK9

---

## IK12 — SelectionSyncController

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic2-selection-sync
- **Description:** Task B3: Create SelectionSyncController.ts (layer moves, cache lifecycle).
- **Dependencies:** IK11
- **Notes:** Implemented in-repo. Subscribes to selectionStore + dragOffsetStore; moves nodes static↔active; applies groupDragOffset; cache clear on select, restore on deselect (Article XXIII). Unit tests in tests/unit/SelectionSyncController.test.ts.

---

## IK13 — Drag Sub-Modules

- **Status:** done
- **Tier:** opus
- **Role:** architect
- **Worktree name:** epic3-drag-modules
- **Description:** Task C1: Create dragCommit.ts, dragBounds.ts, frameDragReparenting.ts.
- **Dependencies:** IK6

---

## IK14 — Alignment Engine

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic3-alignment
- **Description:** Task C2: Create alignmentEngine.ts wrapping alignmentGuides.ts.
- **Dependencies:** IK6

---

## IK15 — DragCoordinator

- **Status:** done
- **Tier:** haiku
- **Role:** quick-fixer
- **Worktree name:** epic3-drag-coordinator
- **Description:** Task T15: Create src/canvas/drag/DragCoordinator.ts (~50 LOC). Routes to dragCommit, alignmentEngine, dragBounds, frameDragReparenting.
- **Dependencies:** IK13, IK14

---

## IK16 — StageEventRouter + ShapeEventWiring

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic3-event-wiring
- **Description:** Task T16: Create StageEventRouter.ts (~120 LOC) and ShapeEventWiring.ts (~150 LOC) with unit tests.
- **Dependencies:** IK15

---

## IK17 — Controllers (Drawing, Marquee, Connector)

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic3-controllers
- **Description:** Task T17: Create DrawingController.ts, MarqueeController.ts, ConnectorController.ts.
- **Dependencies:** IK6

---

## IK18 — TextEditController

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic3-text-edit
- **Description:** Task T18: Create TextEditController.ts reusing existing text edit overlay.
- **Dependencies:** IK11

---

## IK19 — OverlayManager

- **Status:** reject
- **Tier:** opus
- **Role:** architect
- **Worktree name:** epic4-overlay-manager
- **Description:** Task T19: Create OverlayManager.ts handling 5 subsystems.
- **Dependencies:** IK10, IK18
- **Notes:** Branch `agent/epic4-overlay-manager` has no diff vs `spike/react-konva-1`; no OverlayManager files present in repo.
- **Review:** `bun run validate` failed in base repo at `tests/unit/TransformerManager.test.ts` (TS1005). Re-run validate once OverlayManager changes exist in worktree.

---

## IK20 — TransformerManager

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic4-transformer
- **Description:** Task T20: Create TransformerManager.ts matching TransformHandler config, add unit tests.
- **Dependencies:** IK16, IK19 (W4-R)
- **Notes:** Implemented in repo. Type fix: isRectNode accepts undefined for findOne return. Unit tests pass.

---

## IK21 — GridRenderer + SelectionDragHandle

- **Status:** done
- **Tier:** haiku
- **Role:** quick-fixer
- **Worktree name:** epic4-grid-handle
- **Description:** Task T21: Create GridRenderer.ts and SelectionDragHandle.ts with unit tests.
- **Dependencies:** IK16, IK19 (W4-R)
- **Notes:** Implemented in repo. Fixed IGroupDragOffset import (from @/types/canvas). Fixed test vi.mock hoisting via vi.hoisted(). Unit tests pass.
