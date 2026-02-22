# Performance Baselines — Imperative Konva Migration

Pre- and post-migration metrics for the react-konva → imperative Konva migration. See `docs/IMPERATIVE-KONVA-MIGRATION-V5.md` §6.2 and `docs/IMPERATIVE-KONVA-MIGRATION-V5-FOLLOW-UP.md` §2.

## Automated Capture

```bash
bun run perf:baseline              # pre-migration.json
bun run perf:baseline post-migration  # post-migration.json
```

Captures: bundle size (gzip), sync latency metrics from `perf:check`.

## Manual Metrics (fill before Epic 6 comparison)

Metrics with value `0` require manual capture. Update the JSON directly or re-run the script after filling.

| Metric | How to Measure |
| ------ | ------ |
| **frameTime100Drag** (p50/p95/p99) | Chrome DevTools Performance tab. Create board with 100 objects, select one, drag for 3s. Record frame times from flame chart. |
| **frameTime500Pan** (p50/p95/p99) | Same, but pan across a board with 500 objects. |
| **reactRendersDuringDrag** | React DevTools Profiler. Record during single shape drag. Count StoreShapeRenderer re-renders. |
| **selectorEvalsPerDragFrame** | Custom instrumentation in `selectObject` and `selectGroupDragOffset` selectors, or monkey-patch. |
| **tti1000ObjectsMs** | From `setAll()` to first `batchDraw()` complete on 1000-object board. Manual or one-off script. |

## Schema

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

## Epic 6 Success Criteria

- ≥50% drag frame time reduction vs pre-migration
- 0 shape-related React re-renders during drag
- Bundle size reduced ~45KB (react-konva removed)
