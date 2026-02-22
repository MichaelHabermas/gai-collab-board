# Performance Baselines — Imperative Konva Migration

Pre- and post-migration metrics for the react-konva → imperative Konva migration. See `docs/IMPERATIVE-KONVA-MIGRATION-V5.md` §6.2 and `docs/IMPERATIVE-KONVA-MIGRATION-V5-FOLLOW-UP.md` §2.

## Automated Capture

```bash
bun run perf:baseline              # pre-migration.json
bun run perf:baseline post-migration  # post-migration.json
```

Captures:

- **Bundle size** (gzip) from `bun run build`
- **Sync latency** from `perf:check` (sync.latency.test.ts)
- **E2E metrics** from `tests/e2e/perfBaseline.spec.ts`:
  - `frameTime100Drag` (p50/p95/p99) — rAF frame deltas during 100-object drag
  - `frameTime500Pan` (p50/p95/p99) — rAF frame deltas during 500-object pan
  - `reactRendersDuringDrag` — StoreShapeRenderer render count (dev instrumentation)
  - `selectorEvalsPerDragFrame` — selectObject/selectGroupDragOffset evals per frame (dev instrumentation)
  - `tti1000ObjectsMs` — setAll to 2 rAFs (proxy for first paint; batchDraw not hooked)

The E2E spec runs on Chromium only. Requires dev-mode store exposure (`__objectsStore`).

## Manual Fallback (if E2E fails)

If E2E capture fails, the script preserves existing values from the JSON file. You can also run the E2E spec standalone and paste results:

```bash
CAPTURE_PERF_BASELINE=1 bun run test:e2e -- tests/e2e/perfBaseline.spec.ts --project=chromium
```

## Schema

```json
{
  "capturedAt": "ISO8601",
  "metadata": {
    "environment": "platform Node version",
    "commandSet": ["bun run build", "bun run vitest run tests/integration/sync.latency.test.ts"],
    "sampleSize": { "syncLatencyRuns": 1 }
  },
  "frameTime100Drag": { "p50": 0, "p95": 0, "p99": 0 },
  "frameTime500Pan": { "p50": 0, "p95": 0, "p99": 0 },
  "reactRendersDuringDrag": 0,
  "selectorEvalsPerDragFrame": 0,
  "bundleSizeGzipKb": 0,
  "perfCheckOutput": "",
  "tti1000ObjectsMs": 0
}
```

## Epic 6 Success Criteria

- ≥50% drag frame time reduction vs pre-migration
- 0 shape-related React re-renders during drag
- Bundle size reduced ~45KB (react-konva removed)
