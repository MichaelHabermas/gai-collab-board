import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import type { ICreateObjectParams } from '@/modules/sync/objectService';

/** Collected measured latencies for REPORT_METRICS=1 or performance log. */
const collectedMetrics: Array<{ name: string; value: number; unit: string }> = [];

const mockRealtimeSet = vi.fn();
const mockFirestoreUpdateDoc = vi.fn();
const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn();
const BENCHMARK_STRICT_MODE = process.env.BENCHMARK_STRICT === '1';
const CURSOR_LATENCY_TARGET_MS = Number(process.env.BENCHMARK_CURSOR_LATENCY_MS ?? '50');
const OBJECT_LATENCY_TARGET_MS = Number(process.env.BENCHMARK_OBJECT_LATENCY_MS ?? '100');
const BATCH_DURATION_TARGET_MS = Number(process.env.BENCHMARK_BATCH_DURATION_MS ?? '1500');

const assertLatencyLessThan = (actual: number, target: number): void => {
  if (BENCHMARK_STRICT_MODE) {
    expect(actual).toBeLessThan(target);
  } else {
    expect.soft(actual).toBeLessThan(target);
  }
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

vi.mock('firebase/database', () => ({
  ref: vi.fn(() => ({ path: 'benchmark-path' })),
  set: async (reference: unknown, data: unknown) => {
    await sleep(12);
    return mockRealtimeSet(reference, data);
  },
  onValue: vi.fn(() => vi.fn()),
  onDisconnect: vi.fn(() => ({ remove: vi.fn() })),
  remove: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ path: 'boards/benchmark-board/objects' })),
  doc: vi.fn(() => ({ id: `obj-${Math.random().toString(36).slice(2, 12)}` })),
  setDoc: vi.fn(),
  updateDoc: async (reference: unknown, data: unknown) => {
    await sleep(18);
    return mockFirestoreUpdateDoc(reference, data);
  },
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  query: vi.fn((ref) => ref),
  orderBy: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: (reference: unknown, data: unknown) => mockBatchSet(reference, data),
    update: vi.fn(),
    delete: vi.fn(),
    commit: async () => {
      await sleep(45);
      return mockBatchCommit();
    },
  })),
  Timestamp: {
    now: () => ({
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
      toMillis: () => Date.now(),
    }),
  },
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
  realtimeDb: {},
}));

describe('Sync Benchmark Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('measures cursor sync write latency under 50ms target envelope', async () => {
    const { updateCursor } = await import('@/modules/sync/realtimeService');

    const start = Date.now();
    await updateCursor('benchmark-board', 'user-latency', 320, 220, 'Latency User', '#ff9900');
    const durationMs = Date.now() - start;
    collectedMetrics.push({ name: 'cursor_latency', value: durationMs, unit: 'ms' });
    expect(mockRealtimeSet).toHaveBeenCalledTimes(1);
    assertLatencyLessThan(durationMs, CURSOR_LATENCY_TARGET_MS);
  });

  it('measures object update sync write latency under 100ms target envelope', async () => {
    const { updateObject } = await import('@/modules/sync/objectService');

    const start = Date.now();
    await updateObject('benchmark-board', 'object-latency', {
      x: 420,
      y: 360,
      text: 'Latency update',
    });
    const durationMs = Date.now() - start;
    collectedMetrics.push({ name: 'object_update_latency', value: durationMs, unit: 'ms' });
    expect(mockFirestoreUpdateDoc).toHaveBeenCalledTimes(1);
    assertLatencyLessThan(durationMs, OBJECT_LATENCY_TARGET_MS);
  });

  it(
    'benchmarks 500-object batch creation throughput with single commit',
    { timeout: 20_000 },
    async () => {
      const { createObjectsBatch } = await import('@/modules/sync/objectService');

      const objects: ICreateObjectParams[] = Array.from({ length: 500 }, (_, index) => ({
        type: 'sticky',
        x: (index % 25) * 120,
        y: Math.floor(index / 25) * 90,
        width: 100,
        height: 70,
        fill: '#fef08a',
        text: `Benchmark ${index + 1}`,
        createdBy: 'benchmark-user',
      }));

      const start = Date.now();
      const created = await createObjectsBatch('benchmark-board', objects);
      const durationMs = Date.now() - start;
      collectedMetrics.push({ name: 'batch_500_objects', value: durationMs, unit: 'ms' });
      expect(created).toHaveLength(500);
      expect(mockBatchSet).toHaveBeenCalledTimes(500);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      assertLatencyLessThan(durationMs, BATCH_DURATION_TARGET_MS);
    }
  );

  afterAll(async () => {
    if (collectedMetrics.length === 0) {
      return;
    }
    const { writeFileSync } = await import('fs');
    const { join } = await import('path');
    const outPath = join(process.cwd(), 'docs/performance/last-run-metrics.json');
    writeFileSync(
      outPath,
      JSON.stringify(
        { capturedAt: new Date().toISOString(), source: 'sync.latency.test.ts', metrics: collectedMetrics },
        null,
        2
      )
    );
  });
});
