/**
 * Captures performance baselines for the Imperative Konva migration.
 * Writes docs/perf-baselines/pre-migration.json (or post-migration.json via arg).
 *
 * Automated: bundle size (gzip), perf:check (sync latency) output.
 * Manual placeholders: frame times, React re-renders, selector evals, TTI.
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

interface IPreMigrationSchema {
  capturedAt: string;
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

  const baseline: IPreMigrationSchema = {
    capturedAt: new Date().toISOString(),
    frameTime100Drag: { p50: 0, p95: 0, p99: 0 },
    frameTime500Pan: { p50: 0, p95: 0, p99: 0 },
    reactRendersDuringDrag: 0,
    selectorEvalsPerDragFrame: 0,
    bundleSizeGzipKb: bundleKb,
    perfCheckOutput: perfOutput,
    tti1000ObjectsMs: 0,
  };

  if (!existsSync(PERF_BASELINES_DIR)) {
    mkdirSync(PERF_BASELINES_DIR, { recursive: true });
  }
  writeFileSync(outPath, JSON.stringify(baseline, null, 2), 'utf-8');
  process.stdout.write(`[capture-perf-baseline] Wrote ${outPath}\n`);
}

main();
