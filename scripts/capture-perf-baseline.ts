/**
 * Captures performance baselines for the Imperative Konva migration.
 * Writes docs/perf-baselines/pre-migration.json (or post-migration.json via arg).
 *
 * Automated: bundle size (gzip), perf:check (sync latency), E2E metrics
 * (frame times, React re-renders, selector evals, TTI).
 *
 * Usage: bun run scripts/capture-perf-baseline.ts [pre-migration|post-migration]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { gzipSync } from 'zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PERF_BASELINES_DIR = join(ROOT, 'docs/perf-baselines');
const PERF_DIR = join(ROOT, 'docs/performance');
const DIST_ASSETS = join(ROOT, 'dist/assets');
const E2E_METRICS_PATH = join(ROOT, '.tmp/perf-e2e-metrics.json');

interface IPreMigrationSchema {
  capturedAt: string;
  metadata?: {
    environment: string;
    commandSet: string[];
    sampleSize?: { syncLatencyRuns: number };
    manualPlaceholders?: string[];
  };
  frameTime100Drag: { p50: number; p95: number; p99: number };
  frameTime500Pan: { p50: number; p95: number; p99: number };
  reactRendersDuringDrag: number;
  selectorEvalsPerDragFrame: number;
  bundleSizeGzipKb: number;
  perfCheckOutput: string;
  tti1000ObjectsMs: number;
}

function getBundleSizeGzipKb(): number {
  if (!existsSync(DIST_ASSETS)) {
    execSync('bun run build', { cwd: ROOT, stdio: 'pipe' });
  }
  const jsFiles = readdirSync(DIST_ASSETS).filter((f) => f.endsWith('.js'));
  let totalGzip = 0;
  for (const f of jsFiles) {
    const buf = readFileSync(join(DIST_ASSETS, f));
    totalGzip += gzipSync(buf).length;
  }
  return Math.round((totalGzip / 1024) * 100) / 100;
}

function getPerfCheckOutput(): string {
  const lastRunPath = join(PERF_DIR, 'last-run-metrics.json');
  if (!existsSync(lastRunPath)) {
    execSync('bun run vitest run tests/integration/sync.latency.test.ts', {
      cwd: ROOT,
      stdio: 'pipe',
    });
  }
  const raw = readFileSync(lastRunPath, 'utf-8');
  const data = JSON.parse(raw) as {
    capturedAt: string;
    metrics: Array<{ name: string; value: number; unit: string }>;
  };
  return JSON.stringify({ capturedAt: data.capturedAt, metrics: data.metrics }, null, 2);
}

interface IE2EMetrics {
  frameTime100Drag?: { p50: number; p95: number; p99: number };
  frameTime500Pan?: { p50: number; p95: number; p99: number };
  reactRendersDuringDrag?: number;
  selectorEvalsPerDragFrame?: number;
  tti1000ObjectsMs?: number;
}

function runE2EPerfCapture(): IE2EMetrics {
  const tmpDir = join(ROOT, '.tmp');
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  process.stdout.write('[capture-perf-baseline] Running E2E perf capture...\n');
  try {
    execSync(
      `bun run test:e2e -- tests/e2e/perfBaseline.spec.ts --project=chromium`,
      {
        cwd: ROOT,
        stdio: 'inherit',
        env: {
          ...process.env,
          CAPTURE_PERF_BASELINE: '1',
          CAPTURE_PERF_BASELINE_OUTPUT: E2E_METRICS_PATH,
        },
      }
    );
  } catch {
    process.stderr.write('[capture-perf-baseline] E2E perf capture failed; using placeholders.\n');
    return {};
  }

  if (!existsSync(E2E_METRICS_PATH)) {
    process.stderr.write('[capture-perf-baseline] E2E metrics file not found.\n');
    return {};
  }

  try {
    const raw = readFileSync(E2E_METRICS_PATH, 'utf-8');
    return JSON.parse(raw) as IE2EMetrics;
  } catch (e) {
    process.stderr.write(`[capture-perf-baseline] Failed to parse E2E metrics: ${String(e)}\n`);
    return {};
  }
}

function loadExistingManualValues(outPath: string): Partial<IPreMigrationSchema> {
  if (!existsSync(outPath)) {
    return {};
  }
  try {
    const raw = readFileSync(outPath, 'utf-8');
    const existing = JSON.parse(raw) as IPreMigrationSchema;
    const manual: Partial<IPreMigrationSchema> = {};
    if (
      existing.frameTime100Drag &&
      (existing.frameTime100Drag.p50 > 0 ||
        existing.frameTime100Drag.p95 > 0 ||
        existing.frameTime100Drag.p99 > 0)
    ) {
      manual.frameTime100Drag = existing.frameTime100Drag;
    }
    if (
      existing.frameTime500Pan &&
      (existing.frameTime500Pan.p50 > 0 ||
        existing.frameTime500Pan.p95 > 0 ||
        existing.frameTime500Pan.p99 > 0)
    ) {
      manual.frameTime500Pan = existing.frameTime500Pan;
    }
    if (existing.reactRendersDuringDrag != null && existing.reactRendersDuringDrag > 0) {
      manual.reactRendersDuringDrag = existing.reactRendersDuringDrag;
    }
    if (existing.selectorEvalsPerDragFrame != null && existing.selectorEvalsPerDragFrame > 0) {
      manual.selectorEvalsPerDragFrame = existing.selectorEvalsPerDragFrame;
    }
    if (existing.tti1000ObjectsMs != null && existing.tti1000ObjectsMs > 0) {
      manual.tti1000ObjectsMs = existing.tti1000ObjectsMs;
    }
    return manual;
  } catch {
    return {};
  }
}

function main(): void {
  const outName = process.argv[2] === 'post-migration' ? 'post-migration.json' : 'pre-migration.json';
  const outPath = join(PERF_BASELINES_DIR, outName);

  let bundleKb = 0;
  try {
    bundleKb = getBundleSizeGzipKb();
  } catch (e) {
    process.stderr.write(`[capture-perf-baseline] Bundle size failed: ${String(e)}\n`);
  }

  let perfOutput = '';
  try {
    perfOutput = getPerfCheckOutput();
  } catch (e) {
    process.stderr.write(`[capture-perf-baseline] perfCheck failed: ${String(e)}\n`);
  }

  const existingManual = loadExistingManualValues(outPath);
  const e2eMetrics = runE2EPerfCapture();

  const frameTime100 =
    e2eMetrics.frameTime100Drag ??
    existingManual.frameTime100Drag ?? { p50: 0, p95: 0, p99: 0 };
  const frameTime500 =
    e2eMetrics.frameTime500Pan ?? existingManual.frameTime500Pan ?? { p50: 0, p95: 0, p99: 0 };
  const reactRenders =
    e2eMetrics.reactRendersDuringDrag ?? existingManual.reactRendersDuringDrag ?? 0;
  const selectorEvals =
    e2eMetrics.selectorEvalsPerDragFrame ?? existingManual.selectorEvalsPerDragFrame ?? 0;
  const tti = e2eMetrics.tti1000ObjectsMs ?? existingManual.tti1000ObjectsMs ?? 0;

  const hasFrameTime100 =
    frameTime100.p50 > 0 || frameTime100.p95 > 0 || frameTime100.p99 > 0;
  const hasFrameTime500 =
    frameTime500.p50 > 0 || frameTime500.p95 > 0 || frameTime500.p99 > 0;
  const hasReactRenders = e2eMetrics.reactRendersDuringDrag !== undefined || existingManual.reactRendersDuringDrag != null;
  const hasSelectorEvals = e2eMetrics.selectorEvalsPerDragFrame !== undefined || existingManual.selectorEvalsPerDragFrame != null;
  const hasTti = tti > 0;

  const manualPlaceholders = [
    ...(!hasFrameTime100 ? ['frameTime100Drag'] : []),
    ...(!hasFrameTime500 ? ['frameTime500Pan'] : []),
    ...(!hasReactRenders ? ['reactRendersDuringDrag'] : []),
    ...(!hasSelectorEvals ? ['selectorEvalsPerDragFrame'] : []),
    ...(!hasTti ? ['tti1000ObjectsMs'] : []),
  ];

  const commandSet = [
    'bun run build',
    'bun run vitest run tests/integration/sync.latency.test.ts',
    'bun run test:e2e -- tests/e2e/perfBaseline.spec.ts --project=chromium',
  ];

  const capturedAt = new Date().toISOString();
  const baseline: IPreMigrationSchema = {
    capturedAt,
    metadata: {
      environment: `${process.platform} Node ${process.version}`,
      commandSet,
      sampleSize: { syncLatencyRuns: 1 },
      ...(manualPlaceholders.length > 0 ? { manualPlaceholders } : {}),
    },
    frameTime100Drag: frameTime100,
    frameTime500Pan: frameTime500,
    reactRendersDuringDrag: reactRenders,
    selectorEvalsPerDragFrame: selectorEvals,
    bundleSizeGzipKb: bundleKb,
    perfCheckOutput: perfOutput,
    tti1000ObjectsMs: tti,
  };

  if (!existsSync(PERF_BASELINES_DIR)) {
    mkdirSync(PERF_BASELINES_DIR, { recursive: true });
  }
  writeFileSync(outPath, JSON.stringify(baseline, null, 2), 'utf-8');
  process.stdout.write(`[capture-perf-baseline] Wrote ${outPath}\n`);
}

main();
