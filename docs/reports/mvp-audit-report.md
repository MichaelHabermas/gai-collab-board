# MVP Compliance Audit Report

Date: 2026-02-17
Repo: `gai-collab-board`
Mode: Local app + real services, with destructive test data allowed

## Audit Scope

Validated against:

- `docs/G4 Week 1 - CollabBoard.pdf`
- `docs/PRD.md`

Evidence matrix:

- `docs/reports/mvp-audit-matrix.md`

## Verification Commands Executed

- `bun run test:run`
- `bun run test:coverage`
- `bun run test:e2e`
- `npx playwright test tests/e2e/benchmark.spec.ts --project=chromium`

## Code And Test Additions For This Audit

- `tests/integration/sync.latency.test.ts`
  - cursor write latency benchmark (`<50ms` target envelope)
  - object update write latency benchmark (`<100ms` target envelope)
  - 500-object batch creation throughput check
- `tests/e2e/benchmark.spec.ts`
  - 5-user concurrent board propagation check
  - FPS benchmark under active pan/zoom interactions
  - single-step AI latency benchmark (`<2s`)
- `docs/reports/mvp-audit-matrix.md`
  - criterion-by-criterion evidence mapping
- `tests/unit/useVisibleShapes.test.ts`
  - viewport culling coverage for standard shapes and line/connector bounds
- `tests/unit/useCursors.test.ts`
  - cursor subscription lifecycle and debounce behavior coverage
- Additional hardening coverage added in this closeout pass:
  - `tests/unit/useAI.test.ts`
  - `tests/unit/usePresence.test.ts`
  - `tests/unit/useBatchDraw.test.ts`
  - `tests/unit/Connector.test.tsx`
  - `tests/unit/TextElement.test.tsx`
  - `tests/unit/StickyNote.test.tsx`
  - expanded `tests/unit/BoardCanvas.interactions.test.tsx`
  - expanded `tests/unit/TransformHandler.test.tsx`

## Hardening Follow-Up (Post-Audit)

- `src/components/canvas/BoardCanvas.tsx`
  - reduced pan-mode mouse handler work when no remote cursors are active
  - reused precomputed drag candidate bounds per drag-bound function instance
  - reused connector anchor computations per connector render branch
  - filtered stale remote cursors before rendering/remote-cursor gating
- `src/lib/alignmentGuides.ts`
  - added snapping helper that reuses precomputed guides
  - replaced array de-dupe checks with `Set` de-dupe for guide collection
- `src/hooks/useVisibleShapes.ts`
  - replaced line/connector bounds `filter/map/spread` with a single-pass bounds loop
- `tests/e2e/benchmark.spec.ts`
  - forced benchmark describe block to `mode: 'default'` to avoid parallel-worker contention while preserving strict assertions

## Full Validation Results

### Unit + Integration

- `test:run`: PASS
  - 41 files passed
  - 343 tests passed

### Coverage (MVP target: 80%)

- `test:coverage`: FAIL
  - Statements: `77.79%`
  - Branches: `60.18%`
  - Functions: `76.89%`
  - Lines: `78.05%`
- Verdict: **MVP coverage target is not met**.

### Benchmark (Chromium only)

- `npx playwright test tests/e2e/benchmark.spec.ts --project=chromium`: FAIL
  - 2 passed, 1 failed
  - Failing test: FPS benchmark in `tests/e2e/benchmark.spec.ts`
  - Measured FPS on failed run: `49.95254508206039`

### E2E

- `test:e2e`: FAIL
  - 32 passed, 3 skipped, 33 failed
  - 31 Firefox failures due missing browser executable:
    - `browserType.launch: Executable doesn't exist ... firefox.exe`
  - 2 Chromium benchmark failures:
    - 5-user propagation poll timeout (`expected > 12`, `received 12`)
    - FPS benchmark (`expected >= 58`, `received 54.494550545107884`)

## MVP Hard-Gate Verdicts

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Infinite board with pan/zoom | PASS | `src/hooks/useCanvasViewport.ts`, `tests/unit/useCanvasViewport.test.ts` |
| Sticky notes with editable text | PASS | `src/components/canvas/shapes/StickyNote.tsx`, `tests/integration/canvas.test.ts` |
| At least one shape type | PASS | rectangle/circle/line in `BoardCanvas.tsx`, integration tests |
| Create, move, edit objects | PASS | `objectService.ts`, `useObjects.ts`, canvas integration tests |
| Real-time sync between 2+ users | PASS | `tests/integration/sync.test.ts`, e2e collaboration suite |
| Multiplayer cursors with labels | PASS | `useCursors.ts`, `CursorLayer.tsx`, sync tests |
| Presence awareness | PASS | `usePresence.ts`, `PresenceAvatars.tsx`, sync/e2e tests |
| User authentication | PASS | auth service/hooks + e2e auth flow |
| Public deployment | PARTIAL | deployment config exists, but docs/URL consistency should be reviewed |

## Performance And AI Benchmark Verdicts

| Metric | Target | Measured/Observed | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Frame rate under interaction | 60 FPS | `49.95254508206039 FPS` (Chromium benchmark run) | FAIL | Improved over prior baseline but still below hard gate |
| Object sync latency | <100ms | PASS in sync benchmark test envelope | PARTIAL | Benchmark is instrumentation-based integration (not WAN network) |
| Cursor sync latency | <50ms | PASS in sync benchmark test envelope | PARTIAL | Integration envelope benchmark, not cross-network |
| 500+ object capacity | 500+ objects | PASS in batch throughput benchmark | PARTIAL | Validates backend batch throughput, not full rendering FPS at 500 |
| Concurrent users | 5+ without degradation | Mixed: PASS in Chromium-only benchmark run, FAIL in full e2e run | PARTIAL | Result is currently unstable due environment/run-conditions |
| AI single-step latency | <2s | PASS in Chromium benchmark test | PARTIAL | Dependent on current provider/network conditions |
| AI command breadth | 6+ command categories | PASS | PASS | `src/modules/ai/tools.ts` exceeds minimum |
| MVP coverage target | 80% | `78.05%` lines (`77.79/60.18/76.89/78.05`) | FAIL | Significant improvement, still below threshold (branches are main gap) |

## Harsh Assessment Summary

MVP feature completeness is strong, but **MVP quality gate is currently not met** because:

1. **Performance target failure**: FPS benchmark remains below hard threshold (`>=58`).
2. **Coverage target failure**: global coverage improved materially but remains below 80%, especially branches.
3. **E2E environment reliability issue**: Firefox browser binary is missing, causing broad e2e failures unrelated to app assertions.

Given the documented success metrics, release readiness for MVP criteria is **PARTIAL / NOT PASSING**.

## Risks And Reliability Notes

- FPS benchmark runs on Chromium only for deterministic timing; benchmark tests are skipped on Firefox.
- Local environment currently lacks Playwright Firefox executable (`npx playwright install` required), which blocks cross-browser e2e evidence.
- Full `test:e2e` mixes product assertions with environment constraints; benchmark metrics should continue to be interpreted separately from browser-installation failures.
- Latency tests in `sync.latency.test.ts` provide controlled benchmark envelopes, not internet-grade end-to-end latency distributions.

## Cleanup Notes

- Benchmark e2e tests create temporary auth users (`benchmark-user-...@example.com`) and may create board objects.
- No broad destructive cleanup script was executed to avoid accidental data loss in shared boards.
- If you want cleanup automated, add a dedicated tagged cleanup utility that removes only benchmark-tagged entities.

## Recommended Next Actions

1. Continue BoardCanvas/render-path hardening with focused profiling to close the remaining FPS gap to `>=58`.
2. Target branch-heavy uncovered areas (`BoardCanvas.tsx`, shape primitives, and `Frame`/`CircleShape`/`LineShape`/`RectangleShape`) to reach global 80% thresholds.
3. Install Firefox for Playwright (`npx playwright install`) before treating full e2e counts as product-only regressions.
