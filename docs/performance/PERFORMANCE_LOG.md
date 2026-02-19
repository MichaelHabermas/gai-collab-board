# 📊 CollabBoard Performance Log

> Tracks task-level reviews, cleanups, and performance improvements over time.

## How metrics are captured

- **Dedicated performance check:** Run `bun run perf:check` to run sync latency tests, append one entry to `docs/performance/metrics-history.json`, and refresh this doc (latest metrics table + progress-over-time graph).
- **Integration (sync latency):** Running `bun run test:run tests/integration/sync.latency.test.ts` measures cursor write, object update, and 500-object batch duration. Measured values are written to `docs/performance/last-run-metrics.json` after each run.
- **E2E (FPS, propagation, AI):** Run `REPORT_METRICS=1 bun run test:e2e tests/e2e/benchmark.spec.ts` (Chromium only). When `REPORT_METRICS=1` is set, the spec logs `METRIC fps`, `METRIC propagation_ms`, and `METRIC ai_command_ms` to stdout. Paste those into this log after a run.
- **Targets (PRD):** FPS ≥58, object sync <100 ms, cursor <50 ms, 500+ objects, 5-user propagation <3000 ms, AI single-step <2000 ms.

---

## Metrics over time

**Latest run (2026-02-19)**

| Metric | Value | Target |
|--------|-------|--------|
| Cursor write latency | 19 ms | <50 ms |
| Object update latency | 19 ms | <100 ms |
| 500-object batch | 61 ms | <1500 ms |

**Progress over time**

```mermaid
xychart-beta
    title "Integration metrics over time (ms)"
    x-axis ["2026-02-19", "2026-02-19", "2026-02-19", "2026-02-19", "2026-02-19", "2026-02-19"]
    y-axis "Latency (ms)" 0 --> 88
    line "Cursor write" [14, 25, 20, 17, 22, 19]
    line "Object update" [31, 18, 32, 32, 26, 19]
    line "Batch 500 objects" [62, 63, 60, 62, 60, 61]
```

## Optimization History

### 2026-02-19 — A.1 useBatchDraw + Zustand for selection

**Files Changed:** 11 (src: 5 added/modified, 2 deleted; tests: 4 modified)
**Scope:** Migrated selection from React Context to Zustand store; wired useBatchDraw in BoardCanvas/TransformHandler for batched Konva redraws.

**Metrics (integration, after task):**

| Metric | Value | Target | Source |
|--------|-------|--------|--------|
| Cursor write latency | 20 ms | <50 ms | `last-run-metrics.json` |
| Object update latency | 23 ms | <100 ms | `last-run-metrics.json` |
| 500-object batch | 60 ms | <1500 ms | `last-run-metrics.json` |

E2E metrics (FPS, propagation, AI command) require running the benchmark spec with Playwright; add them here when captured.

**Issues Found:**

| Severity | Description | File | Fixed? |
|----------|-------------|------|--------|
| Low | Unused mock `transformerBatchDrawMock` and its `mockClear` after switching to `requestBatchDraw` | `tests/unit/TransformHandler.test.tsx` | ✅ |

**Cleanup Applied:**

- Removed dead `transformerBatchDrawMock` and its `mockClear()` from `tests/unit/TransformHandler.test.tsx`; mock layer’s `getLayer()` now returns `{ batchDraw: vi.fn() }` for shape compatibility only.

**Deferred (`// REVIEW:`):**

- None

**Build Status:** ✅ Passing

---

### 2026-02-19 — A.2 Fix delete performance (batch + defer redraws)

**Files Changed:** 5 (src: 3 modified; tests: 2 modified)
**Scope:** Deferred React/Konva updates for bulk delete until Firestore batch commits; selection cleared only after batch success. Single Firestore writeBatch was already in place.

**Changes:**

- `useObjects.handleDeleteObjects`: removed optimistic `setObjects` before `deleteObjectsBatch`; apply single `setObjects` only after batch resolves; on failure leave objects unchanged and set error.
- `useCanvasOperations.handleDelete`: await `onObjectsDeleteBatch` then call `clearSelection` so selection clears after batch success; prop type `void | Promise<void>`.
- `BoardCanvas`: `onObjectsDeleteBatch` prop type relaxed to `void | Promise<void>`; wrapper returns `Promise.resolve(onObjectsDeleteBatch(ids))` so hook can await.
- Tests: useObjects rollback test renamed; added test that state updates only after batch resolves; useCanvasOperations batch-delete tests await `handleDelete()` and mock resolved batch.

**Metrics (integration, no regression expected):**

- Sync latency tests unchanged (cursor, object update, 500-object batch). Run `bun run perf:check` to refresh.

**Issues Found:** None

**Build Status:** ✅ Passing

---

### 2026-02-19 — Baseline (pre multi-drop reconciliation fix)

**Scope:** Baseline capture before fixing post-drop one-by-one disappear/reappear for large multi-selection drags.

**Metrics (integration, before fix):**

| Metric | Value | Target | Source |
|--------|-------|--------|--------|
| Cursor write latency | 17 ms | <50 ms | `last-run-metrics.json` |
| Object update latency | 32 ms | <100 ms | `last-run-metrics.json` |
| 500-object batch | 62 ms | <1500 ms | `last-run-metrics.json` |

E2E benchmarks (FPS, propagation, AI) to be compared post-fix; see A.4 entry.

---

### 2026-02-19 — A.4 Multi-drop reconciliation (no post-drop flicker)

**Files Changed:** 4 (src: 1 modified; tests: 2 modified; docs: 2 modified)
**Scope:** Fix post-drop one-by-one disappear/reappear when dragging a large multi-selection. Kept `objectsByIdRef` in sync with optimistic batch position updates so Firestore snapshot reconciliation does not rebuild from stale ref and cause sequential visual updates.

**Changes:**

- `useObjects.handleUpdateObjects`: inside the optimistic `setObjects` updater, set `objectsByIdRef.current` to the new array so subscription callbacks see current positions when applying incremental changes.
- Tests: `useObjects` regression test for batch position update + simulated Firestore snapshot (10 objects, positions stable); `BoardCanvas.interactions` asserts group-drag batch payload length and object ids.
- PRD: "Multi-drop reconciliation (no post-drop flicker)" with 200-object/250 ms target and verification checkboxes.

**Metrics (integration, after task):**

| Metric | Value | Target | Source |
|--------|-------|--------|--------|
| Cursor write latency | 22 ms | <50 ms | `last-run-metrics.json` |
| Object update latency | 26 ms | <100 ms | `last-run-metrics.json` |
| 500-object batch | 60 ms | <1500 ms | `last-run-metrics.json` |

**Issues Found:** None

**Build Status:** ✅ Passing

---

### 2026-02-19 — A.3 Viewport off React hot path

**Files Changed:** 2 (src: `useCanvasViewport.ts`, `BoardCanvas.tsx`)
**Scope:** Moved live viewport off the React hot path so pan/zoom do not call `setViewport` every frame. Viewport is kept in a ref and the Konva Stage is updated imperatively during wheel/drag/touch; React state is updated only on a 200 ms throttle or on interaction end (drag end, touch end).

**Changes:**

- `useCanvasViewport`: Added `viewportRef` (synced from state); optional `stageRef`; `applyViewportToStage()` to set Stage x/y/scaleX/scaleY imperatively; throttle (200 ms) for `setViewport` from wheel and touch move; flush on drag end and touch end; programmatic APIs (`zoomTo`, `panTo`, `zoomToFitBounds`, `resetViewport`) and resize update both ref and state and apply to Stage.
- `BoardCanvas`: Passes `stageRef` into `useCanvasViewport({ stageRef })`.

**Metrics (integration, after task):**

| Metric | Value | Target | Source |
|--------|-------|--------|--------|
| Cursor write latency | 17 ms | <50 ms | `last-run-metrics.json` |
| Object update latency | 32 ms | <100 ms | `last-run-metrics.json` |
| 500-object batch | 62 ms | <1500 ms | `last-run-metrics.json` |

**E2E:** FPS benchmark ("maintains high frame throughput during pan and zoom interactions") passed. Two other benchmark tests (5-user propagation, AI single-step) failed in this run due to AI/object-creation flow (object count never increased after AI command), not viewport changes.

**Issues Found:** None

**Build Status:** ✅ Passing

---

### 2026-02-19 — A.4 Bundle audit + tree-shaking (Vite) — branch `perf/a4-bundle-tree-shaking`

**Scope:** Bundle audit and tree-shaking per OPTIMIZATION-PLAN A.4. Branch created from `development`.

**Baseline (pre-change, 2026-02-19):**

| Chunk | Size (min) | Gzip |
|--------|------------|------|
| index (main) | 624.28 kB | 186.90 kB |
| firebase | 556.19 kB | 169.07 kB |
| konva | 323.34 kB | 99.68 kB |
| vendor | 3.70 kB | 1.42 kB |
| CSS | 49.43 kB | 8.80 kB |

- `tests/integration/sync.latency.test.ts`: 3 passed.
- `tests/e2e/benchmark.spec.ts`: exists; E2E has pre-existing failures (AI object creation, FPS ~56.66 vs 58 target) per prior log; no regression from this task required.

**Bundle audit (rollup-plugin-visualizer):** Top 5 heaviest deps by rendered size: (1) @firebase/firestore common 797 kB, (2) react-dom 540 kB, (3) react-reconciler 422 kB, (4) @firebase/database 343 kB, (5) @firebase/auth 272 kB. Firebase and Konva already in manualChunks. No lodash/moment; Lucide and Radix use named imports.

**Changes applied:** (1) AIChatPanel lazy-loaded via `React.lazy` + `Suspense` so AI UI is in a separate async chunk. (2) `manualChunks.openai` added so OpenAI SDK is in its own chunk. (3) Visualizer runs in production build only; output `dist/stats.html`.

**After (2026-02-19):**

| Chunk | Size (min) | Gzip |
|--------|------------|------|
| index (main) | 520.22 kB | 158.84 kB |
| firebase | 556.19 kB | 169.07 kB |
| konva | 323.34 kB | 99.68 kB |
| openai | 102.48 kB | 27.82 kB |
| AIChatPanel (async) | 2.76 kB | 1.35 kB |
| vendor | 3.70 kB | 1.42 kB |
| CSS | 49.43 kB | 8.80 kB |

Main chunk reduced from 624.28 kB to 520.22 kB (~104 kB, ~17%).

**Metrics (integration, after task):** cursor 19 ms, object update 19 ms, batch 500 objects 61 ms (all within target). E2E benchmark suite has pre-existing failures (AI/propagation); no regression from this task.

**Build Status:** ✅ Passing
