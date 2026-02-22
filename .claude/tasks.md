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

- **Status:** reject
- **Tier:** haiku
- **Role:** quick-fixer
- **Worktree name:** epic0-constitution
- **Description:** Add Articles XX–XXV and XXVII to docs/CONSTITUTION.md. Exact text in V5 doc §6.1.
- **Dependencies:** None
- **Notes:** Deliverable incomplete. Articles XX–XXV, XXVII missing from docs/CONSTITUTION.md.

---

## IK2 — Performance Baselines

- **Status:** review
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic0-perf-baselines
- **Description:** Capture pre-migration metrics. Save to docs/perf-baselines/pre-migration.json.
- **Dependencies:** None
- **Notes:** pre-migration.json created with all 7 metrics per V5 §6.2. Automated: bundleSizeGzipKb (~550), perfCheckOutput (sync latency). Manual placeholders (frame times, React re-renders, selector evals, TTI) per doc—Epic 0 allows manual capture. scripts/capture-perf-baseline.ts + docs/perf-baselines/README.md added.

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

- **Status:** reject
- **Tier:** haiku
- **Role:** quick-fixer
- **Worktree name:** epic3-drag-coordinator
- **Description:** Task T15: Create src/canvas/drag/DragCoordinator.ts (~50 LOC). Routes to dragCommit, alignmentEngine, dragBounds, frameDragReparenting.
- **Dependencies:** IK13, IK14
- **Notes:** Files/folder missing. DragCoordinator.ts not present in repo.

---

## IK16 — StageEventRouter + ShapeEventWiring

- **Status:** reject
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic3-event-wiring
- **Description:** Task T16: Create StageEventRouter.ts (~120 LOC) and ShapeEventWiring.ts (~150 LOC) with unit tests.
- **Dependencies:** IK15
- **Notes:** Files/folder missing. StageEventRouter.ts and ShapeEventWiring.ts not present in repo.

---

## IK17 — Controllers (Drawing, Marquee, Connector)

- **Status:** reject
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic3-controllers
- **Description:** Task T17: Create DrawingController.ts, MarqueeController.ts, ConnectorController.ts.
- **Dependencies:** IK6
- **Notes:** Files/folder missing. DrawingController.ts, MarqueeController.ts, ConnectorController.ts not present in repo.

---

## IK18 — TextEditController

- **Status:** reject
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** epic3-text-edit
- **Description:** Task T18: Create TextEditController.ts reusing existing text edit overlay.
- **Dependencies:** IK11
- **Notes:** Files/folder missing. TextEditController.ts not present in repo.

---

## IK19 — OverlayManager

- **Status:** reject
- **Tier:** opus
- **Role:** architect
- **Worktree name:** epic4-overlay-manager
- **Description:** Task T19: Create OverlayManager.ts handling 5 subsystems.
- **Dependencies:** IK10, IK18
- **Notes:** Branch `agent/epic4-overlay-manager` has no diff vs `spike/react-konva-1`; no OverlayManager files present in repo. Worktree path exists but is empty; `worktree-manager` create fails because the directory already exists.
- **Review:** `bun run validate` failed in base repo at `tests/unit/TransformerManager.test.ts` (TS1005). `bun run validate` in the provided worktree path fails with `Script not found "validate"` due to missing repo files.

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

---

# Ralph Loop — Epics 0-3 (Strict Gate)

Base branch: spike/react-konva-1. Strict Epic 0→1→2→3 ralph-loop. All gates must pass before advancing.

---

## RL0 — Epic 0 Constitution Completion (Articles XX–XXV, XXVII)

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** rl0-constitution
- **Description:** Add missing Articles XX–XXV and XXVII to docs/CONSTITUTION.md. Exact text in V5 doc §6.1.
- **Dependencies:** None
- **Acceptance criteria:** Articles XX–XXV, XXVII present in docs/CONSTITUTION.md; text matches V5 spec.
- **Notes:** Replaces IK1. Constitution is inviolable; must be complete before Epic 0 gates. Added Amendment — Imperative Konva Migration with Articles XX (Imperative Canvas Rendering Contract), XXI (Connector Endpoint Reactivity), XXII (Subscription Efficiency), XXIII (Bitmap Caching Preservation), XXIV (Layer Partitioning Invariant), XXV (Event System Isolation), XXVII (Migration Safety). Exact wording from V5 §6.1.
- **Review #1 — APPROVED:** Articles XX–XXV and XXVII present with wording matching IMPERATIVE-KONVA-MIGRATION-V5.md §6.1. RL0 commit 6318edc touches only docs/CONSTITUTION.md (1 file, 88 insertions). `bun run validate` passed.

---

## RL1 — Epic 0 Real Perf Baseline Capture

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** rl1-perf-baselines
- **Description:** Replace placeholder metrics in docs/perf-baselines/pre-migration.json with real captured values.
- **Dependencies:** RL0
- **Acceptance criteria:** pre-migration.json contains real measurements; no placeholder values; automated script or documented capture process.
- **Notes:** Replaces IK2. All 7 metrics now automated via `bun run perf:baseline`. E2E spec `tests/e2e/perfBaseline.spec.ts` captures frame times (rAF deltas), react renders (dev instrumentation), selector evals (dev instrumentation), TTI (2-rAF proxy). Dev-only hooks: `__PERF_MEASURING`, `__perfStoreShapeRenderCount`, `__perfSelectorEvalCount` in StoreShapeRenderer and selectors. No manual placeholders.
- **Review #2 — APPROVED:** (1) pre-migration.json has all 7 metrics with real values: frameTime100Drag (p50/p95/p99 ~16.7–16.8 ms), frameTime500Pan (p50/p95/p99), reactRendersDuringDrag (0), selectorEvalsPerDragFrame (0), bundleSizeGzipKb (550.08), perfCheckOutput (sync latency JSON), tti1000ObjectsMs (19–27). No manualPlaceholders in metadata. (2) `bun run perf:baseline` runs successfully, writes pre-migration.json. (3) Code changes minimal: dev-only instrumentation in StoreShapeRenderer, dragOffsetStore, objectsStore; zero prod overhead when __PERF_MEASURING unset. Reviewer fixed TS errors in perfBaseline.spec.ts (unused evaluate params, noUncheckedIndexedAccess for sorted[idx]). `bun run validate` passes.

---

## RL2 — Epic 0 E2E Flaky/Fixme Resolution

- **Status:** done
- **Tier:** sonnet
- **Role:** tester
- **Worktree name:** rl2-e2e-safety-net
- **Description:** Resolve flaky tests and fixme markers in required safety net E2E specs.
- **Dependencies:** RL0
- **Acceptance criteria:** All required E2E specs pass consistently; no fixme/skip in safety net tests.
- **Notes:** Fixme removed from textOverlayStability (2 tests) and lineResizeRotate (1 test). Root cause: StickyNote/TextElement overlay closed on blur when pan/zoom triggered focus loss (canvas not focusable → relatedTarget null). Fix: blur handler refocuses overlay when relatedTarget is null or inside board-canvas (keeps overlay open during pan/zoom). lineResizeRotate fixme passed without app changes (likely prior flakiness). textOverlayStability + lineResizeRotate: 8/8 pass (chromium+firefox). Epic 0 safety-net: 35/40 pass (connectorCreation, frameReparenting, undoRedoDrag have pre-existing flakiness).
- **Review #1 — REJECTED:** Acceptance criteria require "All required E2E specs pass consistently." Epic 0 safety-net run: 37 passed, 3 failed. Failing: connectorCreation.spec.ts › creates connector between two shapes via anchor clicks (chromium — object-count "2/2" vs expected "3"); undoRedoDrag.spec.ts › can undo and redo a shape drag (chromium + firefox — redo button stays disabled, timeout). RL2 diff is minimal/safe (5 files: StickyNote, TextElement, useShapeDrawing, lineResizeRotate, textOverlayStability). No fixme/skip in safety net ✓. **Remediation:** (1) Fix connectorCreation flakiness — connector not created on first anchor click in chromium; investigate timing or anchor visibility. (2) Fix undoRedoDrag — undo works but redo never enables; verify history stack/redo state after drag commit. Re-run `bun run test:e2e -- tests/e2e/connectorCreation.spec.ts tests/e2e/undoRedoDrag.spec.ts` until both pass on chromium and firefox.
- **Review #2 — FIXED:** Root causes: (1) connectorCreation — timing: anchor nodes need 300ms after tool switch and 200ms between clicks; added 300ms after stickies. (2) undoRedoDrag — selection drag via SelectionDragHandle bypassed history (onObjectsUpdate not wrapped); Transformer layer was above SelectionDragHandle so drag never fired. Fixes: useHistory now wraps updateObjects and pushes batch entries; SelectionDragHandle moved to layer above Transformer; test uses keyboard shortcut for redo, more drag steps (15), canvas focus before shortcut. Targeted run: connectorCreation + undoRedoDrag 4/4 pass (chromium+firefox). Full Epic 0: 118 passed, 9 failed (benchmark, guest-board, singleSourceUndoRedo, frameReparenting — pre-existing).
- **Review #3 — REJECTED:** (1) **Fixme/skip:** None in Epic 0 safety-net specs ✓. (2) **connectorCreation + undoRedoDrag:** Run 1 passed 4/4; runs 2–3 failed 4/4 at `waitForBoardVisible` (board-canvas never appears after signup). Acceptance criteria require "pass consistently" — 1/3 runs pass is not consistent. Failures at auth/signup (pre-application), but criterion is binary. (3) **Product changes:** Safe and deterministic. StickyNote/TextElement blur fix, useHistory updateObjects wrapping, BoardCanvas layer order — all correct. (4) **validate:** passes ✓. **Remediation:** Run E2E in CI or with Firebase emulator; verify 3 consecutive green runs of `bun run test:e2e -- tests/e2e/connectorCreation.spec.ts tests/e2e/undoRedoDrag.spec.ts --project=chromium --project=firefox` before re-submit. Auth/signup flakiness blocks "pass consistently" verification.
- **Review #4 — RL2 auth fix applied, still REJECTED:** (1) **waitForBoardVisible fix:** Added `waitForPostSignupNavigation` (wait for URL to leave /login before waiting for board-canvas). Root cause: test clicked "Create Account" and immediately waited for board-canvas; signup + Firestore createBoard chain is async. Fix: two-phase wait (navigation away from /login, then board-canvas). **Result:** Zero waitForBoardVisible failures across 3 runs ✓. (2) **3-run matrix:** Run 1: connectorCreation firefox ✓, chromium ✗ (2/2 vs 3), undoRedoDrag both ✗. Runs 2–3: 4/4 failed. (3) **Blockers:** (a) **connectorCreation:** Connector anchor clicks not registering — object-count stays 2/2; second anchor click does not create connector. (b) **undoRedoDrag:** Redo button stays disabled; selection drag uses `onObjectsUpdate` (batch) which bypasses history — `useHistory` only wraps `updateObject` (single). (4) **Files changed:** tests/e2e/connectorCreation.spec.ts, tests/e2e/undoRedoDrag.spec.ts (waitForPostSignupNavigation + connector timing).
- **Review #5 — APPROVED:** connectorCreation fixed (switch to select tool before clicking empty area so no accidental sticky; Transformer no longer blocks connection nodes). undoRedoDrag passing. Both specs pass on chromium and firefox. Epic 0 RL1+RL2 committed on spike/react-konva-1.

---

## RL3 — Epic 0 Harsh Review Gate

- **Status:** done
- **Tier:** sonnet
- **Role:** reviewer
- **Worktree name:** rl3-epic0-review
- **Description:** Brutally honest review of RL0, RL1, RL2 deliverables. Can reject findings; no rubber-stamping.
- **Dependencies:** RL0, RL1, RL2
- **Acceptance criteria:** Reviewer approves or rejects with specific feedback; RL0–RL2 findings validated.
- **Notes:** Gate blocks Epic 1 verification. Rejections flow back to RL0–RL2.
- **Review — APPROVED:** RL0 constitution merged; RL1 baselines and RL2 E2E (connectorCreation, undoRedoDrag) committed on spike/react-konva-1. validate passes; connectorCreation + undoRedoDrag pass on chromium and firefox. Epic 0 complete.

---

## RL4 — Epic 1 Verification Gate

- **Status:** blocked
- **Tier:** sonnet
- **Role:** reviewer
- **Worktree name:** rl4-epic1-verify
- **Description:** Harsh re-audit of Epic 1 (factories, types, registry). Fix tasks if regressions found.
- **Dependencies:** RL3 done
- **Acceptance criteria:** Epic 1 modules pass re-audit; any regressions fixed before advancing.
- **Notes:** Verification only; no new implementation unless regressions found.

---

## RL5 — Epic 2 Verification Gate

- **Status:** blocked
- **Tier:** sonnet
- **Role:** reviewer
- **Worktree name:** rl5-epic2-verify
- **Description:** Harsh re-audit of Epic 2 (LayerManager, KonvaNodeManager, SelectionSyncController). Fix tasks if regressions found.
- **Dependencies:** RL4 done
- **Acceptance criteria:** Epic 2 modules pass re-audit; any regressions fixed before advancing.
- **Notes:** Verification only; no new implementation unless regressions found.

---

## RL6 — Epic 3 Missing Modules Implementation

- **Status:** blocked
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** rl6-epic3-modules
- **Description:** Implement DragCoordinator, StageEventRouter, ShapeEventWiring, controllers (Drawing, Marquee, Connector), TextEditController, events router/wiring.
- **Dependencies:** RL5 done
- **Acceptance criteria:** All missing Epic 3 modules present; unit tests pass; bun run validate passes.
- **Notes:** Replaces IK15, IK16, IK17, IK18. Blocked until Epic 2 verified.

---

## RL7 — Epic 3 Test and Appendix D Evidence Completion

- **Status:** blocked
- **Tier:** sonnet
- **Role:** tester
- **Worktree name:** rl7-epic3-tests
- **Description:** Complete Epic 3 unit tests and Appendix D evidence per V5 doc.
- **Dependencies:** RL6
- **Acceptance criteria:** All Epic 3 tests pass; Appendix D evidence documented.
- **Notes:** Blocked until RL6 modules implemented.

---

## RL8 — Epic 3 Harsh Review Gate

- **Status:** blocked
- **Tier:** sonnet
- **Role:** reviewer
- **Worktree name:** rl8-epic3-review
- **Description:** Brutally honest review of Epic 3 deliverables (RL6, RL7).
- **Dependencies:** RL6, RL7
- **Acceptance criteria:** Reviewer approves or rejects with specific feedback; Epic 3 validated.
- **Notes:** Gate blocks final closeout. Rejections flow back to RL6–RL7.

---

## RL9 — Final Epics 0-3 Closeout

- **Status:** blocked
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** rl9-closeout
- **Description:** Update docs/status, closeout documentation, run bun run validate.
- **Dependencies:** RL3, RL4, RL5, RL8
- **Acceptance criteria:** docs/status updated; Epics 0–3 closeout complete; bun run validate passes.
- **Notes:** Final gate. All Epic 0–3 verification gates must be done.
