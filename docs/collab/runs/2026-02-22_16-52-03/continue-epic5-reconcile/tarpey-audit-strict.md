# Tarpey Audit (Strict) — Epic 5 Cutover Verification

**Mode:** audit  
**Preset:** strict  
**Date:** 2026-02-22  
**Constraint:** No code changes; findings and evidence only.

---

## Objective

Verify what actually works: which E2E pass/fail, which unit tests pass, and whether tests are guarding the cutover or are wrong/outdated. Scope: E2E for migration-critical flows (drag, resize, connector, text edit, marquee); unit tests touching canvas/cutover; Epic 5 “complete” claim vs evidence.

---

## Evidence Summary

### Unit tests

- **Command:** `bun run test`
- **Result:** **138 files, 1700 passed, 4 skipped** (exit 0)
- **Duration:** ~30s

### E2E tests

- **Command:** `bunx playwright test --reporter=list`
- **Result:** **61 failed, 67 passed, 14 skipped** (exit 1)
- **Total:** 142 tests, ~3.0 min
- **Evidence source:** Full run output captured this session

### Unit tests skipped (4)

| File | Test |
|------|------|
| `useKonvaCache.test.ts` | caches node when shouldCache is true and node fits within budget |
| `useKonvaCache.test.ts` | skips caching when node is too large |
| `useObjects.test.ts` | filters some self-echoes when only partial changes are in-flight |
| `PropertyInspector.test.tsx` | does not commit opacity change when value is "Mixed" |

### E2E tests skipped (14)

- **largeBoardPagination.spec.ts:** 4 tests (S3 pagination not implemented)
- **perfBaseline.spec.ts:** 1 test (Chromium-only skip)
- **benchmark.spec.ts:** 2 tests (Chromium-only skip)
- Plus other project-configured skips across browsers

### E2E migration-critical specs (audit scope)

| Spec | Flow | Chromium | Firefox |
|------|------|----------|---------|
| shapeDrag.spec.ts | Drag | **FAIL** | **FAIL** |
| shapeResize.spec.ts | Resize | **FAIL** | **FAIL** |
| shapeRotate.spec.ts | Rotate | **FAIL** | **FAIL** |
| connectorCreation.spec.ts | Connector | **FAIL** | **FAIL** |
| connectorEndpointDrag.spec.ts | Connector | **FAIL** | **FAIL** |
| marqueeSelection.spec.ts | Marquee | **FAIL** | **FAIL** |
| multiSelectDrag.spec.ts | Drag | **FAIL** | **FAIL** |
| frameTitleEdit.spec.ts | Text edit | **FAIL** | **FAIL** |
| stickyTextEdit.spec.ts | Text edit | **FAIL** | **FAIL** |
| textOverlayStability.spec.ts | Text overlay | **FAIL** | **FAIL** |
| lineResizeRotate.spec.ts | Line tool | **FAIL** | **FAIL** |
| singleSourceUndoRedo.spec.ts | Undo/redo | **FAIL** | **FAIL** |
| drawingTools.spec.ts | Drawing | **PASS** (Chromium) | **FAIL** |
| alignmentGuides.spec.ts | Guides | **PASS** (Chromium) | **FAIL** |

So: **all migration-critical E2E flows fail on at least one browser**; only a subset pass on Chromium (e.g. drawingTools, alignmentGuides, guest-board logged-out, one benchmark).

---

## Claim vs verified table

| Claim | Source | Verified (evidence) | Status |
|-------|--------|---------------------|--------|
| Epic 5 cutover complete (implementation) | IMPERATIVE-KONVA-MIGRATION-V5.md, tasks | App uses CanvasHost; `data-testid="board-canvas"` present on CanvasHost | **Verified** |
| Epic 5 DoD: all E2E pass | Epic 5 DoD §11 | 61 failed, 67 passed, 14 skipped | **Not verified** |
| Epic 5.1 gate: full test:e2e passes | Epic 5.1 binary checks | Full run fails (61 failures) | **Not verified** |
| Tests guard the cutover | Implicit | Migration-critical specs fail (mostly at board load); cannot conclude behavior after load | **Not verified** |
| Unit tests for canvas/cutover pass | — | 1700 passed; canvas-related unit files (OverlayManager, useCanvasSetup, ConnectorController, etc.) in suite and pass | **Verified** |
| No regression in drag/resize/connector/text/marquee | Epic 5 intent | E2E for these flows do not reach assertions (time out waiting for board) or fail later; cannot verify | **Unverified** |

---

## Failure analysis

### Dominant E2E failure mode

Most failing tests fail at **first interaction with the board**:  
`expect(page.locator('[data-testid="board-canvas"]')).toBeVisible({ timeout: 15_000 or 20_000 })` → **element(s) not found**.

- **Testid:** Present in `CanvasHost.tsx` (`data-testid='board-canvas'`). Selector is correct.
- **Implication:** The page under test does not reach a state where the board canvas is visible within the timeout. Typical sequence in failing specs: signup → wait for board visible → timeout. So either auth/redirect/board creation is slow or flaky, or the app never renders the canvas in those runs.
- **Same setup, different outcome:** e.g. `drawingTools` (can draw a rectangle) **passed** on Chromium; `shapeDrag` **failed** on Chromium. Same pattern: signup then `waitForBoardVisible`. So failures are consistent with **environmental/timing variance** (auth or board load), not a missing testid.

### Other failure modes (fewer)

- **undoRedoDrag (Firefox):** `page.waitForURL(... pathname !== '/login' ...)` timeout 20s — post-signup navigation never leaves `/login`.
- **connectorCreation / connectorEndpointDrag:** At least one failure reported beyond board load (e.g. assertion on object count or connector state); need triage to see if product bug or flake.
- **Benchmark/perf:** Timeouts or assertion failures (FPS, 5 users, pan/zoom, AI command).

### Unit tests touching canvas/cutover

All **pass**. No unit test is currently failing or skipped for cutover-related reasons. Skipped unit tests are explicitly disabled (useKonvaCache, useObjects, PropertyInspector) and are not migration gatekeepers.

---

## Severity-ordered findings

1. **Critical — E2E do not reliably guard the cutover**  
   Migration-critical E2E (drag, resize, connector, text edit, marquee) either time out before the canvas is visible or fail later. Most failures are board-canvas visibility timeout. So we cannot claim “E2E guard the cutover” or “no regression in critical flows” from this run.

2. **Critical — Epic 5 “complete” and Epic 5.1 “full E2E pass” are not satisfied**  
   Doc and tasks state Epic 5 is not done until E2E pass; Epic 5.1 requires full `test:e2e` pass. Current evidence: 61 E2E failures. So Epic 5 / 5.1 are correctly marked blocked; the “complete” claim applies only to implementation/cutover, not DoD.

3. **High — Unclear split: product vs env**  
   Many failures are “board not visible in time.” Until we know whether that’s slow/flaky auth and board creation (env) vs app not rendering canvas (product), we cannot prioritize fixes. Same spec pattern passes sometimes (e.g. drawingTools on Chromium), so env/timing is a likely factor.

4. **Medium — Unit tests cover canvas/cutover but are not E2E**  
   Unit tests for OverlayManager, useCanvasSetup, ConnectorController, DrawingController, MarqueeController, etc., pass. They do not exercise full app load, auth, or real canvas interaction, so they do not replace E2E for cutover assurance.

5. **Low — Skipped tests**  
   Four unit and 14 E2E skipped tests are documented (S3 pagination, Chromium-only perf, etc.). None are the primary blocker for Epic 5.1.

---

## Recommended next action (one)

**Stabilize E2E board load, then re-run and triage by failure mode.**

1. **One concrete step:** Establish why `[data-testid="board-canvas"]` is not visible within 15–20s in failing specs. Options (no code change in this audit): (a) Inspect one failing run (e.g. shapeDrag) — capture screenshot or trace at timeout; (b) Compare with a passing run (e.g. drawingTools) — same auth path, different outcome suggests flake; (c) Check if Firebase/auth or board creation is slow in CI/local and whether timeouts or test order can be adjusted in a follow-up.
2. After board load is stable (or understood), re-run full E2E and bucket remaining failures into: **product regression** (fix app or test assertion) vs **env/flake** (fix setup or quarantine).
3. Do **not** revert the cutover or change production code as part of this audit; the next action is **fix E2E first** (stabilize setup and triage), then fix any confirmed product regressions.

---

## Evidence references

- **Unit:** `bun run test` → 138 files, 1700 passed, 4 skipped.
- **E2E:** `bunx playwright test --reporter=list` → 61 failed, 67 passed, 14 skipped; full output from this run used for failure list and error patterns.
- **Failing E2E list:** See “61 failed” section in the E2E run output (chromium + firefox).
- **Skipped:** Unit — useKonvaCache (2), useObjects (1), PropertyInspector (1); E2E — largeBoardPagination (4), perfBaseline/benchmark (Chromium-only), etc., total 14.
- **Branch:** `spike/react-konva-1` (from reconciliation-check).
