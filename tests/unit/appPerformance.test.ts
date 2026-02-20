/**
 * Comprehensive App Performance Tests
 *
 * Measures every critical hot path at scale (100, 500, 1000 objects).
 * Each test captures wall-clock timing and logs results to stdout.
 *
 * Categories:
 *   1. Zustand Store Operations (write throughput)
 *   2. Selector Performance (read throughput)
 *   3. Viewport Culling (useVisibleShapes filter)
 *   4. Frame Containment (spatial queries)
 *   5. Subscription Isolation (per-shape re-render proof)
 *   6. Drag Store Throughput (60 Hz transient state)
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { useObjectsStore, selectObject, selectAllObjects, selectFrameChildCount } from '@/stores/objectsStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useDragOffsetStore, selectFrameOffset, selectIsDropTarget } from '@/stores/dragOffsetStore';
import { findContainingFrame, getFrameChildren, resolveParentFrameId } from '@/hooks/useFrameContainment';
import { getObjectBounds } from '@/lib/canvasBounds';
import type { IBoardObject } from '@/types';
import type { IViewportState } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────

interface IMetric {
  name: string;
  value: number;
  unit: string;
  objectCount: number;
}

const metrics: IMetric[] = [];

const record = (name: string, value: number, unit: string, objectCount: number): void => {
  metrics.push({ name, value, unit, objectCount });
};

/** High-resolution timer. */
const hrtMs = (): number => performance.now();

const makeObject = (id: string, overrides: Partial<IBoardObject> = {}): IBoardObject => ({
  id,
  type: 'rectangle',
  x: Math.random() * 5000,
  y: Math.random() * 5000,
  width: 100 + Math.random() * 200,
  height: 80 + Math.random() * 150,
  rotation: 0,
  fill: '#93c5fd',
  stroke: '#1e40af',
  strokeWidth: 2,
  createdBy: 'user-1',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  ...overrides,
});

const makeFrame = (id: string, x: number, y: number, w: number, h: number): IBoardObject =>
  makeObject(id, { type: 'frame', x, y, width: w, height: h });

const makeConnector = (id: string, fromId: string, toId: string): IBoardObject =>
  makeObject(id, {
    type: 'connector',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    points: [0, 0, 100, 100],
    fromObjectId: fromId,
    toObjectId: toId,
  });

/** Generate N objects spread across a 5000x5000 canvas. */
const generateObjects = (count: number): IBoardObject[] =>
  Array.from({ length: count }, (_, i) => makeObject(`obj-${i}`));

/** Generate N objects with M frames and parent assignments. */
const generateWithFrames = (
  totalCount: number,
  frameCount: number
): { objects: IBoardObject[]; frames: IBoardObject[] } => {
  const frames: IBoardObject[] = [];
  for (let i = 0; i < frameCount; i++) {
    const fx = (i % 10) * 600;
    const fy = Math.floor(i / 10) * 600;
    frames.push(makeFrame(`frame-${i}`, fx, fy, 500, 500));
  }

  const objects: IBoardObject[] = [...frames];
  const childrenPerFrame = Math.floor((totalCount - frameCount) / frameCount);

  for (let fi = 0; fi < frameCount; fi++) {
    const frame = frames[fi]!;
    for (let ci = 0; ci < childrenPerFrame; ci++) {
      const child = makeObject(`child-${fi}-${ci}`, {
        x: frame.x + 20 + Math.random() * 400,
        y: frame.y + 20 + Math.random() * 400,
        parentFrameId: frame.id,
      });
      objects.push(child);
    }
  }

  // Fill remaining
  while (objects.length < totalCount) {
    objects.push(makeObject(`extra-${objects.length}`));
  }

  return { objects, frames };
};

const DEFAULT_VIEWPORT: IViewportState = {
  position: { x: 0, y: 0 },
  scale: { x: 1, y: 1 },
  width: 1920,
  height: 1080,
};

// ── Viewport culling (pure function, no hook) ────────────────────────────

const VIEWPORT_PADDING = 200;

/** Pure viewport culling — same logic as useVisibleShapeIds but no React. */
const computeVisibleIds = (
  objectsRecord: Record<string, IBoardObject>,
  viewport: IViewportState
): string[] => {
  const { position, scale, width, height } = viewport;
  const viewLeft = -position.x / scale.x - VIEWPORT_PADDING;
  const viewRight = (-position.x + width) / scale.x + VIEWPORT_PADDING;
  const viewTop = -position.y / scale.y - VIEWPORT_PADDING;
  const viewBottom = (-position.y + height) / scale.y + VIEWPORT_PADDING;

  const visible: string[] = [];

  for (const id in objectsRecord) {
    const obj = objectsRecord[id]!;
    let objLeft: number, objRight: number, objTop: number, objBottom: number;

    if ((obj.type === 'line' || obj.type === 'connector') && obj.points && obj.points.length >= 2) {
      const { points } = obj;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let pi = 0; pi < points.length - 1; pi += 2) {
        const px = obj.x + (points[pi] ?? 0);
        const py = obj.y + (points[pi + 1] ?? 0);
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
      }
      objLeft = minX;
      objRight = maxX;
      objTop = minY;
      objBottom = maxY;
    } else {
      objLeft = obj.x;
      objRight = obj.x + obj.width;
      objTop = obj.y;
      objBottom = obj.y + obj.height;
    }

    if (objRight >= viewLeft && objLeft <= viewRight && objBottom >= viewTop && objTop <= viewBottom) {
      visible.push(id);
    }
  }

  return visible;
};

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('App Performance — Store Operations', () => {
  beforeEach(() => {
    useObjectsStore.getState().clear();
    useSelectionStore.getState().clearSelection();
  });

  for (const count of [100, 500, 1000]) {
    it(`setAll: load ${count} objects into store`, () => {
      const objects = generateObjects(count);

      const start = hrtMs();
      useObjectsStore.getState().setAll(objects);
      const duration = hrtMs() - start;

      record(`store_setAll`, duration, 'ms', count);
      expect(Object.keys(useObjectsStore.getState().objects)).toHaveLength(count);
      expect(duration).toBeLessThan(50); // Must complete in <50ms
      console.log(`[PERF] store.setAll(${count}): ${duration.toFixed(2)} ms`);
    });

    it(`setObjects (batch upsert): update ${count} objects`, () => {
      const objects = generateObjects(count);
      useObjectsStore.getState().setAll(objects);
      const updates = objects.map((o) => ({ ...o, x: o.x + 10 }));

      const start = hrtMs();
      useObjectsStore.getState().setObjects(updates);
      const duration = hrtMs() - start;

      record(`store_setObjects_batch`, duration, 'ms', count);
      expect(duration).toBeLessThan(50);
      console.log(`[PERF] store.setObjects(${count}): ${duration.toFixed(2)} ms`);
    });

    it(`updateObject: ${count} individual updates (simulates drag)`, () => {
      const objects = generateObjects(count);
      useObjectsStore.getState().setAll(objects);

      const start = hrtMs();
      for (let i = 0; i < count; i++) {
        useObjectsStore.getState().updateObject(`obj-${i}`, { x: i * 5 });
      }
      const duration = hrtMs() - start;
      const perOp = duration / count;

      record(`store_updateObject_individual`, duration, 'ms', count);
      record(`store_updateObject_per_op`, perOp, 'ms', count);
      console.log(`[PERF] store.updateObject x${count}: ${duration.toFixed(2)} ms (${perOp.toFixed(3)} ms/op)`);
      // Individual updates at 60 Hz: need <16.7ms per frame
      // For single-object drag this is the critical metric
      expect(perOp).toBeLessThan(1); // <1ms per update
    });

    it(`deleteObjects: bulk delete ${count} objects`, () => {
      const objects = generateObjects(count);
      useObjectsStore.getState().setAll(objects);
      const ids = objects.map((o) => o.id);

      const start = hrtMs();
      useObjectsStore.getState().deleteObjects(ids);
      const duration = hrtMs() - start;

      record(`store_deleteObjects_bulk`, duration, 'ms', count);
      expect(Object.keys(useObjectsStore.getState().objects)).toHaveLength(0);
      expect(duration).toBeLessThan(50);
      console.log(`[PERF] store.deleteObjects(${count}): ${duration.toFixed(2)} ms`);
    });
  }
});

describe('App Performance — Selector Throughput', () => {
  beforeEach(() => {
    useObjectsStore.getState().clear();
  });

  for (const count of [100, 500, 1000]) {
    it(`selectObject: ${count} lookups on ${count}-object store`, () => {
      const objects = generateObjects(count);
      useObjectsStore.getState().setAll(objects);
      const state = useObjectsStore.getState();

      const start = hrtMs();
      for (let i = 0; i < count; i++) {
        selectObject(`obj-${i}`)(state);
      }
      const duration = hrtMs() - start;
      const perLookup = duration / count;

      record(`selector_selectObject`, duration, 'ms', count);
      record(`selector_selectObject_per_lookup`, perLookup, 'ms', count);
      console.log(`[PERF] selectObject x${count}: ${duration.toFixed(2)} ms (${perLookup.toFixed(4)} ms/lookup)`);
      expect(perLookup).toBeLessThan(0.1); // <0.1ms per lookup (O(1) hash)
    });

    it(`selectAllObjects: materialize ${count} objects`, () => {
      const objects = generateObjects(count);
      useObjectsStore.getState().setAll(objects);
      const state = useObjectsStore.getState();

      const start = hrtMs();
      const all = selectAllObjects(state);
      const duration = hrtMs() - start;

      record(`selector_selectAllObjects`, duration, 'ms', count);
      expect(all).toHaveLength(count);
      console.log(`[PERF] selectAllObjects(${count}): ${duration.toFixed(2)} ms`);
      expect(duration).toBeLessThan(10);
    });

    it(`selectFrameChildCount: count children in ${count}-object store (20 frames)`, () => {
      const { objects } = generateWithFrames(count, 20);
      useObjectsStore.getState().setAll(objects);
      const state = useObjectsStore.getState();

      const start = hrtMs();
      let totalChildren = 0;
      for (let f = 0; f < 20; f++) {
        totalChildren += selectFrameChildCount(`frame-${f}`)(state);
      }
      const duration = hrtMs() - start;

      record(`selector_frameChildCount_20frames`, duration, 'ms', count);
      expect(totalChildren).toBeGreaterThan(0);
      console.log(`[PERF] selectFrameChildCount x20 (${count} total objects): ${duration.toFixed(2)} ms, ${totalChildren} children`);
      expect(duration).toBeLessThan(20);
    });
  }
});

describe('App Performance — Viewport Culling', () => {
  beforeEach(() => {
    useObjectsStore.getState().clear();
  });

  for (const count of [100, 500, 1000]) {
    it(`viewport culling: filter ${count} objects (full viewport)`, () => {
      const objects = generateObjects(count);
      useObjectsStore.getState().setAll(objects);
      const record_ = useObjectsStore.getState().objects;

      // Full viewport (covers 0-1920 x 0-1080 + padding)
      const start = hrtMs();
      const visible = computeVisibleIds(record_, DEFAULT_VIEWPORT);
      const duration = hrtMs() - start;

      record(`viewport_cull_full`, duration, 'ms', count);
      console.log(`[PERF] viewport culling (${count} objects, full): ${duration.toFixed(2)} ms → ${visible.length} visible`);
      expect(duration).toBeLessThan(10);
    });

    it(`viewport culling: filter ${count} objects (zoomed out, all visible)`, () => {
      const objects = generateObjects(count);
      useObjectsStore.getState().setAll(objects);
      const record_ = useObjectsStore.getState().objects;

      const zoomedOut: IViewportState = {
        position: { x: 0, y: 0 },
        scale: { x: 0.1, y: 0.1 },
        width: 1920,
        height: 1080,
      };

      const start = hrtMs();
      const visible = computeVisibleIds(record_, zoomedOut);
      const duration = hrtMs() - start;

      record(`viewport_cull_zoomed_out`, duration, 'ms', count);
      console.log(`[PERF] viewport culling (${count} objects, zoomed out): ${duration.toFixed(2)} ms → ${visible.length} visible`);
      expect(duration).toBeLessThan(15);
    });

    it(`viewport culling: filter ${count} objects (panned away, few visible)`, () => {
      const objects = generateObjects(count);
      useObjectsStore.getState().setAll(objects);
      const record_ = useObjectsStore.getState().objects;

      const pannedAway: IViewportState = {
        position: { x: -50000, y: -50000 },
        scale: { x: 1, y: 1 },
        width: 1920,
        height: 1080,
      };

      const start = hrtMs();
      const visible = computeVisibleIds(record_, pannedAway);
      const duration = hrtMs() - start;

      record(`viewport_cull_panned_away`, duration, 'ms', count);
      console.log(`[PERF] viewport culling (${count} objects, panned away): ${duration.toFixed(2)} ms → ${visible.length} visible`);
      expect(duration).toBeLessThan(10);
    });
  }
});

describe('App Performance — Frame Containment', () => {
  for (const count of [100, 500, 1000]) {
    it(`findContainingFrame: spatial query with ${count} objects (20 frames)`, () => {
      const { objects, frames } = generateWithFrames(count, 20);

      // Test object dropped at center of first frame
      const testBounds = { x1: frames[0]!.x + 100, y1: frames[0]!.y + 100, x2: frames[0]!.x + 200, y2: frames[0]!.y + 200 };

      const start = hrtMs();
      // Simulate 100 drop queries (e.g., multi-object drag end)
      for (let i = 0; i < 100; i++) {
        findContainingFrame(testBounds, frames);
      }
      const duration = hrtMs() - start;
      const perQuery = duration / 100;

      record(`frame_containment_query`, duration, 'ms', count);
      record(`frame_containment_per_query`, perQuery, 'ms', count);
      console.log(`[PERF] findContainingFrame x100 (${frames.length} frames, ${count} total): ${duration.toFixed(2)} ms (${perQuery.toFixed(3)} ms/query)`);
      expect(perQuery).toBeLessThan(1);
    });

    it(`resolveParentFrameId: ${count} objects resolution`, () => {
      const { objects } = generateWithFrames(count, 20);
      // Resolve parent for first 50 non-frame objects
      const nonFrames = objects.filter((o) => o.type !== 'frame').slice(0, 50);

      const start = hrtMs();
      for (const obj of nonFrames) {
        const bounds = getObjectBounds(obj);
        resolveParentFrameId(obj, bounds, objects);
      }
      const duration = hrtMs() - start;
      const perResolve = duration / nonFrames.length;

      record(`frame_resolve_parentId`, duration, 'ms', count);
      record(`frame_resolve_per_object`, perResolve, 'ms', count);
      console.log(`[PERF] resolveParentFrameId x${nonFrames.length} (${count} total): ${duration.toFixed(2)} ms (${perResolve.toFixed(3)} ms/obj)`);
      expect(perResolve).toBeLessThan(2);
    });

    it(`getFrameChildren: filter children for 20 frames from ${count} objects`, () => {
      const { objects } = generateWithFrames(count, 20);

      const start = hrtMs();
      let totalChildren = 0;
      for (let f = 0; f < 20; f++) {
        totalChildren += getFrameChildren(`frame-${f}`, objects).length;
      }
      const duration = hrtMs() - start;

      record(`frame_getChildren_20frames`, duration, 'ms', count);
      console.log(`[PERF] getFrameChildren x20 (${count} objects): ${duration.toFixed(2)} ms, ${totalChildren} children`);
      expect(duration).toBeLessThan(20);
    });
  }
});

describe('App Performance — Drag Store (60 Hz simulation)', () => {
  beforeEach(() => {
    useDragOffsetStore.getState().setFrameDragOffset(null);
    useDragOffsetStore.getState().setDropTargetFrameId(null);
  });

  it('frameDragOffset: 1000 updates at 60Hz (16.7ms budget)', () => {
    const iterations = 1000;

    const start = hrtMs();
    for (let i = 0; i < iterations; i++) {
      useDragOffsetStore.getState().setFrameDragOffset({
        frameId: 'frame-0',
        dx: i * 0.5,
        dy: i * 0.3,
      });
    }
    const duration = hrtMs() - start;
    const perUpdate = duration / iterations;

    record(`drag_frameDragOffset_1000`, duration, 'ms', iterations);
    record(`drag_frameDragOffset_per_update`, perUpdate, 'ms', iterations);
    console.log(`[PERF] setFrameDragOffset x${iterations}: ${duration.toFixed(2)} ms (${perUpdate.toFixed(4)} ms/update)`);
    // At 60 Hz, each frame has 16.7ms budget. This should be <0.1ms/update.
    expect(perUpdate).toBeLessThan(0.5);
  });

  it('selectFrameOffset: 1000 selector evaluations', () => {
    useDragOffsetStore.getState().setFrameDragOffset({
      frameId: 'frame-0',
      dx: 50,
      dy: 30,
    });
    const state = useDragOffsetStore.getState();
    const iterations = 1000;

    const start = hrtMs();
    for (let i = 0; i < iterations; i++) {
      // Alternate between matching and non-matching parent frames
      selectFrameOffset(i % 2 === 0 ? 'frame-0' : 'frame-99')(state);
    }
    const duration = hrtMs() - start;

    record(`drag_selectFrameOffset_1000`, duration, 'ms', iterations);
    console.log(`[PERF] selectFrameOffset x${iterations}: ${duration.toFixed(2)} ms`);
    expect(duration).toBeLessThan(5);
  });

  it('selectIsDropTarget: 1000 selector evaluations', () => {
    useDragOffsetStore.getState().setDropTargetFrameId('frame-5');
    const state = useDragOffsetStore.getState();
    const iterations = 1000;

    const start = hrtMs();
    for (let i = 0; i < iterations; i++) {
      selectIsDropTarget(`frame-${i % 20}`)(state);
    }
    const duration = hrtMs() - start;

    record(`drag_selectIsDropTarget_1000`, duration, 'ms', iterations);
    console.log(`[PERF] selectIsDropTarget x${iterations}: ${duration.toFixed(2)} ms`);
    expect(duration).toBeLessThan(5);
  });
});

describe('App Performance — Subscription Isolation', () => {
  beforeEach(() => {
    useObjectsStore.getState().clear();
  });

  it('1000 objects: updating 1 object triggers exactly 1 subscriber', () => {
    const objects = generateObjects(1000);
    useObjectsStore.getState().setAll(objects);

    // Subscribe to 100 individual objects (simulating 100 visible StoreShapeRenderers)
    let triggerCount = 0;
    const unsubs: (() => void)[] = [];

    for (let i = 0; i < 100; i++) {
      const selector = selectObject(`obj-${i}`);
      let prev = selector(useObjectsStore.getState());
      const unsub = useObjectsStore.subscribe((state) => {
        const next = selector(state);
        if (next !== prev) {
          triggerCount++;
          prev = next;
        }
      });
      unsubs.push(unsub);
    }

    // Update object obj-0 (subscribed) → should trigger 1 subscriber
    triggerCount = 0;
    useObjectsStore.getState().updateObject('obj-0', { fill: '#ff0000' });
    expect(triggerCount).toBe(1);

    // Update object obj-500 (NOT subscribed) → should trigger 0 subscribers
    triggerCount = 0;
    useObjectsStore.getState().updateObject('obj-500', { fill: '#00ff00' });
    expect(triggerCount).toBe(0);

    // Bulk update: 50 rapid mutations to different subscribed objects
    triggerCount = 0;
    const start = hrtMs();
    for (let i = 0; i < 50; i++) {
      useObjectsStore.getState().updateObject(`obj-${i}`, { x: i * 10 });
    }
    const duration = hrtMs() - start;

    record(`subscription_50_targeted_updates`, duration, 'ms', 1000);
    console.log(`[PERF] 50 targeted updates (1000 objects, 100 subscribers): ${duration.toFixed(2)} ms, ${triggerCount} subscriber triggers`);
    expect(triggerCount).toBe(50); // Exactly 50 — one per updated object

    // Cleanup
    unsubs.forEach((u) => u());
  });

  it('per-shape selector isolation: 500 mutations to unsubscribed objects trigger 0 callbacks', () => {
    const objects = generateObjects(1000);
    useObjectsStore.getState().setAll(objects);

    // Subscribe to obj-0 only
    const selector = selectObject('obj-0');
    let triggerCount = 0;
    let prev = selector(useObjectsStore.getState());
    const unsub = useObjectsStore.subscribe((state) => {
      const next = selector(state);
      if (next !== prev) {
        triggerCount++;
        prev = next;
      }
    });

    const start = hrtMs();
    for (let i = 1; i <= 500; i++) {
      useObjectsStore.getState().updateObject(`obj-${i}`, { y: i * 3 });
    }
    const duration = hrtMs() - start;

    record(`subscription_500_unsubscribed_updates`, duration, 'ms', 1000);
    console.log(`[PERF] 500 mutations to unsubscribed objects: ${triggerCount} triggers (expected 0), ${duration.toFixed(2)} ms`);
    expect(triggerCount).toBe(0);

    unsub();
  });
});

describe('App Performance — Connector Endpoint Lookup', () => {
  for (const connectorCount of [50, 100, 200]) {
    it(`getObjectBounds for ${connectorCount} connectors + endpoints`, () => {
      // Create source/target objects
      const sourceObjects = Array.from({ length: connectorCount }, (_, i) =>
        makeObject(`src-${i}`, { x: i * 120, y: 0, width: 100, height: 80 })
      );
      const targetObjects = Array.from({ length: connectorCount }, (_, i) =>
        makeObject(`tgt-${i}`, { x: i * 120, y: 300, width: 100, height: 80 })
      );
      const connectors = Array.from({ length: connectorCount }, (_, i) =>
        makeConnector(`conn-${i}`, `src-${i}`, `tgt-${i}`)
      );

      const allObjects = [...sourceObjects, ...targetObjects, ...connectors];
      useObjectsStore.getState().setAll(allObjects);

      // Simulate re-computing bounds for all connectors (happens during viewport culling)
      const start = hrtMs();
      for (const conn of connectors) {
        getObjectBounds(conn);
        // Also lookup endpoints (what StoreShapeRenderer does)
        const fromObj = useObjectsStore.getState().objects[conn.fromObjectId ?? ''];
        const toObj = useObjectsStore.getState().objects[conn.toObjectId ?? ''];
        if (fromObj) getObjectBounds(fromObj);
        if (toObj) getObjectBounds(toObj);
      }
      const duration = hrtMs() - start;
      const perConnector = duration / connectorCount;

      record(`connector_bounds_lookup`, duration, 'ms', connectorCount);
      record(`connector_bounds_per_connector`, perConnector, 'ms', connectorCount);
      console.log(`[PERF] connector bounds+endpoints x${connectorCount}: ${duration.toFixed(2)} ms (${perConnector.toFixed(3)} ms/connector)`);
      expect(perConnector).toBeLessThan(0.5);
    });
  }
});

// ── Report ────────────────────────────────────────────────────────────────

afterAll(() => {
  if (metrics.length === 0) return;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  APP PERFORMANCE REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Group by category
  const grouped = new Map<string, IMetric[]>();
  for (const m of metrics) {
    const category = m.name.split('_')[0]!;
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)!.push(m);
  }

  for (const [category, items] of grouped) {
    console.log(`── ${category.toUpperCase()} ──`);
    for (const m of items) {
      const val = m.value < 1 ? m.value.toFixed(4) : m.value.toFixed(2);
      console.log(`  ${m.name} [${m.objectCount} objects]: ${val} ${m.unit}`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
});
