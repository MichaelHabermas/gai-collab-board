/**
 * Runs the dedicated performance check: sync latency tests, appends to metrics
 * history, and updates docs/performance/PERFORMANCE_LOG.md with latest metrics
 * and a Mermaid line chart of progress over time.
 *
 * Usage: bun run scripts/run-performance-check.ts
 * Or:    bun run perf:check
 */

import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const PERF_DIR = join(ROOT, 'docs/performance');
const LAST_RUN_PATH = join(PERF_DIR, 'last-run-metrics.json');
const HISTORY_PATH = join(PERF_DIR, 'metrics-history.json');
const LOG_PATH = join(PERF_DIR, 'PERFORMANCE_LOG.md');

const MAX_CHART_POINTS = 15;

interface IMetricEntry {
  name: string;
  value: number;
  unit: string;
}

interface ILastRunMetrics {
  capturedAt: string;
  capturedAtMs?: number;
  source: string;
  metrics: IMetricEntry[];
}

interface IHistoryEntry {
  date: string;
  timestamp?: string;
  timestamp_ms?: number;
  cursor_latency_ms: number;
  object_update_latency_ms: number;
  batch_500_objects_ms: number;
}

interface IMetricsHistory {
  history: IHistoryEntry[];
}

function runSyncLatencyTests(): boolean {
  process.stdout.write('[perf-check] Running sync latency tests...\n');
  const result = spawnSync('bun', ['run', 'test:run', 'tests/integration/sync.latency.test.ts'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    process.stderr.write('[perf-check] Sync latency tests failed.\n');
    return false;
  }
  return true;
}

function readJson<T>(path: string): T {
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as T;
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

function getMetricValue(metrics: IMetricEntry[], name: string): number {
  const entry = metrics.find((m) => m.name === name);
  return entry?.value ?? 0;
}

function appendToHistory(last: ILastRunMetrics, history: IMetricsHistory): void {
  const cursor = getMetricValue(last.metrics, 'cursor_latency');
  const objectUpdate = getMetricValue(last.metrics, 'object_update_latency');
  const batch500 = getMetricValue(last.metrics, 'batch_500_objects');

  const date = last.capturedAt.slice(0, 10);
  const timestampMs =
    last.capturedAtMs ?? new Date(last.capturedAt).getTime();
  const entry: IHistoryEntry = {
    date,
    timestamp: last.capturedAt,
    timestamp_ms: timestampMs,
    cursor_latency_ms: cursor,
    object_update_latency_ms: objectUpdate,
    batch_500_objects_ms: batch500,
  };

  history.history.push(entry);
  writeJson(HISTORY_PATH, history);
  process.stdout.write(`[perf-check] Appended metrics for ${date}.\n`);
}

function formatChartLabel(entry: IHistoryEntry): string {
  const ms = entry.timestamp_ms ?? (entry.timestamp ? new Date(entry.timestamp).getTime() : NaN);
  if (!Number.isNaN(ms)) {
    const d = new Date(ms);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${min}`;
  }
  return entry.date;
}

function buildMermaidChart(history: IHistoryEntry[]): string {
  const slice = history.slice(-MAX_CHART_POINTS);
  if (slice.length === 0) {
    return 'No data yet. Run `bun run perf:check` to record metrics.';
  }
  if (slice.length === 1) {
    return 'One data point so far. Run `bun run perf:check` again to see a trend.';
  }

  const labels = slice.map((e) => formatChartLabel(e));
  const cursor = slice.map((e) => e.cursor_latency_ms);
  const objectUpdate = slice.map((e) => e.object_update_latency_ms);
  const batch500 = slice.map((e) => e.batch_500_objects_ms);

  const yMax = Math.max(...cursor, ...objectUpdate, ...batch500, 80);
  const yMin = 0;

  return [
    '```mermaid',
    'xychart-beta',
    '    title "Integration metrics over time (ms)"',
    `    x-axis [${labels.map((l) => `"${l}"`).join(', ')}]`,
    `    y-axis "Latency (ms)" ${yMin} --> ${Math.ceil(yMax * 1.1)}`,
    `    line "Cursor write" [${cursor.join(', ')}]`,
    `    line "Object update" [${objectUpdate.join(', ')}]`,
    `    line "Batch 500 objects" [${batch500.join(', ')}]`,
    '```',
  ].join('\n');
}

function buildLatestTable(entry: IHistoryEntry): string {
  return [
    '| Metric | Value | Target |',
    '|--------|-------|--------|',
    `| Cursor write latency | ${entry.cursor_latency_ms} ms | <50 ms |`,
    `| Object update latency | ${entry.object_update_latency_ms} ms | <100 ms |`,
    `| 500-object batch | ${entry.batch_500_objects_ms} ms | <1500 ms |`,
  ].join('\n');
}

function updatePerformanceLog(history: IMetricsHistory): void {
  let content = readFileSync(LOG_PATH, 'utf-8');

  const markerStart = '## Metrics over time';
  const markerNext = '## Optimization History';

  const startIdx = content.indexOf(markerStart);
  if (startIdx === -1) {
    process.stderr.write('[perf-check] PERFORMANCE_LOG.md missing "## Metrics over time" section.\n');
    return;
  }

  const afterStart = startIdx + markerStart.length;
  const endIdx = content.indexOf(markerNext, afterStart);
  const endOfSection = endIdx !== -1 ? endIdx : content.length;

  const latest = history.history[history.history.length - 1];
  const latestTable = latest ? buildLatestTable(latest) : '*No runs yet.*';
  const chart = buildMermaidChart(history.history);

  const latestRunLabel =
    latest && (latest.timestamp ?? latest.timestamp_ms !== undefined)
      ? (() => {
          const ms = latest.timestamp_ms ?? new Date(latest.timestamp).getTime();
          const d = new Date(ms);
          const y = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          return `${y}-${mo}-${day} ${hh}:${min}`;
        })()
      : latest?.date ?? 'n/a';

  const newSection = [
    '',
    '',
    `**Latest run (${latestRunLabel})**`,
    '',
    latestTable,
    '',
    '**Progress over time**',
    '',
    chart,
    '',
    '',
  ].join('\n');

  content = content.slice(0, afterStart) + newSection + content.slice(endOfSection);
  writeFileSync(LOG_PATH, content, 'utf-8');
  process.stdout.write('[perf-check] Updated PERFORMANCE_LOG.md.\n');
}

function main(): void {
  if (!runSyncLatencyTests()) {
    process.exit(1);
  }

  let last: ILastRunMetrics;
  try {
    last = readJson<ILastRunMetrics>(LAST_RUN_PATH);
  } catch (e) {
    process.stderr.write(`[perf-check] Could not read ${LAST_RUN_PATH}. ${String(e)}\n`);
    process.exit(1);
  }

  let history: IMetricsHistory;
  try {
    history = readJson<IMetricsHistory>(HISTORY_PATH);
  } catch {
    history = { history: [] };
  }

  if (!Array.isArray(history.history)) {
    history.history = [];
  }

  appendToHistory(last, history);
  updatePerformanceLog(history);

  process.stdout.write('[perf-check] Done.\n');
}

main();
