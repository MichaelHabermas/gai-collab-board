# Imperative Konva Migration V5 — Deferred & Follow-Up

**Parent plan:** [IMPERATIVE-KONVA-MIGRATION-V5.md](IMPERATIVE-KONVA-MIGRATION-V5.md). This doc holds items intentionally deferred from the main migration to keep scope lean. Implement when needed post–cutover or when adding automated baselines.

---

## 1. Deferred E2E Tests

The following E2E tests are **not** required for Epic 0 or Epic 5 cutover. Add them in a follow-up when coverage is desired.

| Test | File | What It Verifies |
|------|------|------------------|
| Frame enter (zoom) | `tests/e2e/frameEnter.spec.ts` | Double-click frame body → viewport zooms to frame bounds |
| Keyboard shortcuts | `tests/e2e/canvasKeyboardShortcuts.spec.ts` | Delete selected, Ctrl+Z undo, Ctrl+Y redo, Ctrl+A select all |

**How to add:** Create the spec file under `tests/e2e/`, use the same board setup helpers as existing E2E tests, and assert the behavior above. Run against the imperative canvas (CanvasHost) after Epic 5.

---

## 2. Performance Baseline Capture

The main plan (Epic 0) requires **performance baselines** to be captured before any migration code and stored in `docs/perf-baselines/pre-migration.json`. Epic 6 compares post-migration results to these.

### Option A — Manual capture (minimal)

1. **Metrics to capture** (same as main plan table):
   - Frame time during 100-object drag (Chrome DevTools Performance, p50/p95/p99)
   - Frame time during 500-object pan
   - React re-renders during drag (React DevTools Profiler, StoreShapeRenderer count)
   - Zustand selector evaluations per drag frame (if instrumented manually)
   - Bundle size gzipped (`bun run build` → `dist/assets/*.js`)
   - `bun run perf:check` output
   - Time-to-interactive for 1000-object board (manual or one-off script)

2. **Schema for `docs/perf-baselines/pre-migration.json`:**

```json
{
  "capturedAt": "ISO8601",
  "frameTime100Drag": { "p50": 0, "p95": 0, "p99": 0 },
  "frameTime500Pan": { "p50": 0, "p95": 0, "p99": 0 },
  "reactRendersDuringDrag": 0,
  "selectorEvalsPerDragFrame": 0,
  "bundleSizeGzipKb": 0,
  "perfCheckOutput": "",
  "tti1000ObjectsMs": 0
}
```

3. Run the same metrics after Epic 6 and save as `post-migration.json`. Compare in Epic 6 PR (e.g. ≥50% reduction in drag frame times).

### Option B — Automated script (when repeatability is needed)

If you need repeatable baseline runs (e.g. CI or multiple branches), implement `scripts/capture-perf-baseline.ts` with:

- Programmatic Playwright test that creates a 1000-object board and measures TTI (e.g. from `setAll()` to first `batchDraw()` complete).
- Optional: Zustand selector counter instrumentation (monkey-patch selectors, count calls during a timed drag).
- Output: JSON matching the schema above, written to `docs/perf-baselines/pre-migration.json` (or a path passed as arg).
- Runnable via `bun run scripts/capture-perf-baseline.ts`.
- Estimated LOC: ~150.

The main plan does **not** require this script for Epic 0; manual capture + schema is sufficient unless you opt for automation.
