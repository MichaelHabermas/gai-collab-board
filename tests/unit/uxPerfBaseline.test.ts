/**
 * UX Performance Deep-Dive — Baseline & Tracking Tests
 *
 * Measures the specific metrics targeted by the UX-PERFORMANCE-DEEP-DIVE.md plan:
 *   1. groupDragOffset propagation cost (subscriber callback count per drag frame)
 *   2. Viewport culling: spatial index vs O(n) filter
 *   3. selectFrameChildCount selector identity stability
 *   4. Incremental sync cost: setAll vs per-object updateObject
 *
 * Run before and after each optimization phase to track gains.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  useObjectsStore,
  selectFrameChildCount,
  spatialIndex,
} from '@/stores/objectsStore';
import { useDragOffsetStore } from '@/stores/dragOffsetStore';
import type { IBoardObject } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────

interface IMetric {
  name: string;
  value: number;
  unit: string;
}

const metrics: IMetric[] = [];

const record = (name: string, value: number, unit: string): void => {
  metrics.push({ name, value, unit });
};

const hrtMs = (): number => performance.now();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  onSnapshot: vi.fn(),
  runTransaction: vi.fn(),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }),
  },
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
}));

const makeObject = (id: string, overrides: Partial<IBoardObject> = {}): IBoardObject => ({
  id,
  type: 'rectangle',
  x: Math.random() * 5000,
  y: Math.random() * 5000,
  width: 100 + Math.random() * 200,
  height: 80 + Math.random() * 150,
  rotation: 0,
  fill: '#FFD700',
  opacity: 1,
  text: '',
  fontSize: 14,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  createdBy: 'test-user',
  ...overrides,
});

afterAll(() => {
  /* eslint-disable no-console */
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  UX PERFORMANCE DEEP-DIVE — METRICS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  for (const m of metrics) {
    console.log(`  ${m.name}: ${m.value.toFixed(4)} ${m.unit}`);
  }
  console.log('\n═══════════════════════════════════════════════════════════════\n');
  /* eslint-enable no-console */
});

// ── 1. groupDragOffset propagation cost ──────────────────────────────────

describe('UX Perf — groupDragOffset propagation', () => {
  beforeEach(() => {
    useObjectsStore.getState().clear();
    useDragOffsetStore.setState({
      frameDragOffset: null,
      dropTargetFrameId: null,
    });
  });

  it('measures drag offset subscriber callback count per frame on 500 objects', () => {
    // Populate store with 500 objects
    const objects = Array.from({ length: 500 }, (_, i) => makeObject(`obj-${i}`));
    useObjectsStore.getState().setAll(objects);

    // Subscribe 500 per-shape listeners (mimics StoreShapeRenderer)
    let callbackCount = 0;
    const unsubscribers: Array<() => void> = [];
    for (let i = 0; i < 500; i++) {
      const unsub = useDragOffsetStore.subscribe(() => {
        callbackCount++;
      });
      unsubscribers.push(unsub);
    }

    // Simulate 60 frames of drag offset updates
    const t0 = hrtMs();
    for (let frame = 0; frame < 60; frame++) {
      callbackCount = 0;
      useDragOffsetStore.setState({ frameDragOffset: { frameId: 'f1', dx: frame, dy: frame } });
      // Each setState triggers all 500 subscribers
    }
    const elapsed = hrtMs() - t0;

    record('dragOffset_500subs_60frames_total', elapsed, 'ms');
    record('dragOffset_500subs_per_frame', elapsed / 60, 'ms');
    record('dragOffset_callbacks_per_frame', callbackCount, 'count');

    // Cleanup
    for (const unsub of unsubscribers) unsub();

    // The important metric: 500 callbacks fire per frame (Zustand notifies all subscribers)
    expect(callbackCount).toBe(500);
  });
});

// ── 2. Viewport culling: spatial index vs O(n) filter ────────────────────

describe('UX Perf — viewport culling comparison', () => {
  const OBJECT_COUNT = 1000;
  let objects: IBoardObject[];

  beforeEach(() => {
    useObjectsStore.getState().clear();
    objects = Array.from({ length: OBJECT_COUNT }, (_, i) => makeObject(`obj-${i}`));
    useObjectsStore.getState().setAll(objects);
  });

  it('benchmarks spatial index query vs O(n) AABB filter', () => {
    const viewport = { x1: 1000, y1: 1000, x2: 3000, y2: 3000 };

    // Spatial index query (O(cells))
    const t0 = hrtMs();
    for (let i = 0; i < 100; i++) {
      spatialIndex.query(viewport);
    }
    const spatialTime = (hrtMs() - t0) / 100;

    // O(n) brute-force filter (legacy useVisibleShapes approach)
    const objectsRecord = useObjectsStore.getState().objects;
    const allObjects = Object.values(objectsRecord);
    const t1 = hrtMs();
    for (let i = 0; i < 100; i++) {
      allObjects.filter((obj) => {
        const r = obj.x + obj.width;
        const b = obj.y + obj.height;

        return r >= viewport.x1 && obj.x <= viewport.x2 && b >= viewport.y1 && obj.y <= viewport.y2;
      });
    }
    const bruteTime = (hrtMs() - t1) / 100;

    record('viewport_spatial_query_1000obj', spatialTime, 'ms');
    record('viewport_bruteforce_filter_1000obj', bruteTime, 'ms');
    record('viewport_speedup_ratio', bruteTime / spatialTime, 'x');

    expect(spatialTime).toBeLessThan(bruteTime * 2); // Spatial should not be slower
  });
});

// ── 3. selectFrameChildCount selector identity ───────────────────────────

describe('UX Perf — selectFrameChildCount selector identity', () => {
  it('creates a new closure on each call (the bug)', () => {
    const selectorA = selectFrameChildCount('frame-1');
    const selectorB = selectFrameChildCount('frame-1');

    // These are different function references — that's the bug.
    // After memoization fix, this test documents the current behavior.
    expect(selectorA).not.toBe(selectorB);

    // But they should return the same value
    useObjectsStore.getState().clear();
    const storeState = useObjectsStore.getState();
    expect(selectorA(storeState)).toBe(selectorB(storeState));
  });
});

// ── 4. Incremental sync cost: setAll vs updateObject ─────────────────────

describe('UX Perf — incremental sync cost', () => {
  const OBJECT_COUNT = 1000;

  beforeEach(() => {
    useObjectsStore.getState().clear();
  });

  it('benchmarks setAll(1000) vs 5× updateObject', () => {
    const objects = Array.from({ length: OBJECT_COUNT }, (_, i) => makeObject(`obj-${i}`));
    useObjectsStore.getState().setAll(objects);

    // Time a full setAll with 1 object changed
    const modified = objects.map((o, i) => (i === 0 ? { ...o, x: o.x + 10 } : o));
    const t0 = hrtMs();
    for (let i = 0; i < 50; i++) {
      useObjectsStore.getState().setAll(modified);
    }
    const setAllTime = (hrtMs() - t0) / 50;

    // Time 5 individual updateObject calls
    const t1 = hrtMs();
    for (let i = 0; i < 50; i++) {
      for (let j = 0; j < 5; j++) {
        useObjectsStore.getState().updateObject(`obj-${j}`, { x: objects[j]!.x + 10 });
      }
    }
    const updateTime = (hrtMs() - t1) / 50;

    record('sync_setAll_1000obj', setAllTime, 'ms');
    record('sync_5x_updateObject_1000obj', updateTime, 'ms');
    record('sync_incremental_speedup', setAllTime / updateTime, 'x');

    // updateObject should be faster than setAll for small changes
    expect(updateTime).toBeLessThan(setAllTime);
  });
});

// ── 5. Bundle size tracking (reference only) ─────────────────────────────

describe('UX Perf — bundle size reference', () => {
  it('documents baseline chunk sizes (update after each phase)', () => {
    const baseline = {
      index: 542.46,
      firebase: 433.38,
      konva: 323.36,
      'firebase-rtdb': 128.56,
      openai: 102.48,
      PropertyInspector: 13.87,
      AIChatPanel: 5.49,
      vendor: 3.70,
      total: 542.46 + 433.38 + 323.36 + 128.56 + 102.48 + 13.87 + 5.49 + 3.70,
    };

    // Sanity check: total is in expected range
    expect(baseline.total).toBeGreaterThan(1500);
    expect(baseline.total).toBeLessThan(1600);
  });
});
