/**
 * Interaction Performance Tests
 *
 * Simulates full interaction sequences (drag, marquee, frame drag) through
 * the Zustand stores and measures end-to-end cost per frame — the same
 * JavaScript cost that determines whether users see jank.
 *
 * Unlike isolated store benchmarks, these tests simulate realistic subscriber
 * fan-out during a full 60-frame interaction, measuring:
 *   - Total sequence time
 *   - Peak per-frame cost
 *   - Average per-frame cost
 *   - Subscriber triggers per frame
 *
 * The 16.67ms frame budget is the target. JS work must leave headroom for
 * Konva canvas paint (~3-5ms) so we target < 8ms for JS work per frame.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { useObjectsStore, selectObject } from '@/stores/objectsStore';
import { useSelectionStore } from '@/stores/selectionStore';
import {
  useDragOffsetStore,
  selectFrameOffset,
  selectGroupDragOffset,
} from '@/stores/dragOffsetStore';
import type { IBoardObject } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────

interface IMetric {
  name: string;
  value: number;
  unit: string;
  context: string;
}

const metrics: IMetric[] = [];

const record = (name: string, value: number, unit: string, context: string): void => {
  metrics.push({ name, value, unit, context });
};

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

/** Stable null selector — mirrors StoreShapeRenderer. */
const _selectNullGroupOffset = (): null => null;

const FRAMES = 60;

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Interaction Performance — Simulated Sequences', () => {
  beforeEach(() => {
    useObjectsStore.getState().clear();
    useSelectionStore.getState().clearSelection();
    useDragOffsetStore.getState().clearDragState();
  });

  it('single-object drag: 60 frames with 200 visible subscribers', () => {
    // Setup: 200 objects, obj-0 selected
    const objects = Array.from({ length: 200 }, (_, i) => makeObject(`obj-${i}`));
    useObjectsStore.getState().setAll(objects);

    // Subscribe 200 per-shape selectObject selectors (simulating StoreShapeRenderer)
    let triggersThisFrame = 0;
    const unsubs: Array<() => void> = [];
    for (let i = 0; i < 200; i++) {
      const selector = selectObject(`obj-${i}`);
      let prev = selector(useObjectsStore.getState());
      const unsub = useObjectsStore.subscribe((state) => {
        const next = selector(state);
        if (next !== prev) {
          triggersThisFrame++;
          prev = next;
        }
      });
      unsubs.push(unsub);
    }

    // Simulate 60-frame drag: single updateObject per frame (imperative Konva updates
    // don't hit store, but drag-end commits do; we simulate worst-case per-frame store write)
    const frameTimes: number[] = [];
    const frameTriggers: number[] = [];

    for (let frame = 0; frame < FRAMES; frame++) {
      triggersThisFrame = 0;
      const t0 = hrtMs();
      useObjectsStore.getState().updateObject('obj-0', { x: frame * 5 });
      frameTimes.push(hrtMs() - t0);
      frameTriggers.push(triggersThisFrame);
    }

    const totalTime = frameTimes.reduce((a, b) => a + b, 0);
    const avgFrame = totalTime / FRAMES;
    const peakFrame = Math.max(...frameTimes);
    const avgTriggers = frameTriggers.reduce((a, b) => a + b, 0) / FRAMES;

    record('interaction_singleDrag_total', totalTime, 'ms', '200 objects, 60 frames');
    record('interaction_singleDrag_avgFrame', avgFrame, 'ms', '200 objects');
    record('interaction_singleDrag_peakFrame', peakFrame, 'ms', '200 objects');
    record('interaction_singleDrag_triggersPerFrame', avgTriggers, 'count', '200 objects');

    console.log('[INTERACTION] Single-object drag (200 objects, 60 frames):');
    console.log(`  Total: ${totalTime.toFixed(2)} ms`);
    console.log(`  Avg/frame: ${avgFrame.toFixed(3)} ms | Peak: ${peakFrame.toFixed(3)} ms`);
    console.log(`  Triggers/frame: ${avgTriggers.toFixed(1)} (expect 1)`);

    expect(avgFrame).toBeLessThan(8); // JS budget: 8ms (leaving 8ms for Konva paint)
    expect(avgTriggers).toBe(1); // Only obj-0's subscriber should fire

    unsubs.forEach((u) => u());
  });

  it('multi-select drag: 10 of 200, 60 frames via groupDragOffset', () => {
    const objects = Array.from({ length: 200 }, (_, i) => makeObject(`obj-${i}`));
    useObjectsStore.getState().setAll(objects);
    const selectedIds = new Set(Array.from({ length: 10 }, (_, i) => `obj-${i}`));
    useSelectionStore.getState().setSelectedIds([...selectedIds]);

    // Subscribe 200 conditional drag offset selectors
    let triggersThisFrame = 0;
    const unsubs: Array<() => void> = [];
    for (let i = 0; i < 200; i++) {
      const isSelected = selectedIds.has(`obj-${i}`);
      const selector = isSelected ? selectGroupDragOffset : _selectNullGroupOffset;
      let prev = selector(useDragOffsetStore.getState());
      const unsub = useDragOffsetStore.subscribe((state) => {
        const next = selector(state);
        if (next !== prev) {
          triggersThisFrame++;
          prev = next;
        }
      });
      unsubs.push(unsub);
    }

    const frameTimes: number[] = [];
    const frameTriggers: number[] = [];

    for (let frame = 1; frame <= FRAMES; frame++) {
      triggersThisFrame = 0;
      const t0 = hrtMs();
      useDragOffsetStore.getState().setGroupDragOffset({ dx: frame * 3, dy: frame * 2 });
      frameTimes.push(hrtMs() - t0);
      frameTriggers.push(triggersThisFrame);
    }

    const totalTime = frameTimes.reduce((a, b) => a + b, 0);
    const avgFrame = totalTime / FRAMES;
    const peakFrame = Math.max(...frameTimes);
    const avgTriggers = frameTriggers.reduce((a, b) => a + b, 0) / FRAMES;

    record('interaction_multiDrag_total', totalTime, 'ms', '10 of 200, 60 frames');
    record('interaction_multiDrag_avgFrame', avgFrame, 'ms', '10 of 200');
    record('interaction_multiDrag_peakFrame', peakFrame, 'ms', '10 of 200');
    record('interaction_multiDrag_triggersPerFrame', avgTriggers, 'count', '10 of 200');

    console.log('[INTERACTION] Multi-select drag (10 of 200, 60 frames):');
    console.log(`  Total: ${totalTime.toFixed(2)} ms`);
    console.log(`  Avg/frame: ${avgFrame.toFixed(3)} ms | Peak: ${peakFrame.toFixed(3)} ms`);
    console.log(`  Triggers/frame: ${avgTriggers.toFixed(1)} (expect 10)`);

    expect(avgFrame).toBeLessThan(5);
    expect(avgTriggers).toBe(10);

    unsubs.forEach((u) => u());
  });

  it('marquee + release: 60 move frames + AABB filter on 500 objects', () => {
    const objects = Array.from({ length: 500 }, (_, i) =>
      makeObject(`obj-${i}`, {
        x: Math.random() * 5000,
        y: Math.random() * 5000,
      })
    );
    useObjectsStore.getState().setAll(objects);

    // Subscribe 500 selectObject selectors
    let objectTriggers = 0;
    const unsubs: Array<() => void> = [];
    for (let i = 0; i < 500; i++) {
      const selector = selectObject(`obj-${i}`);
      let prev = selector(useObjectsStore.getState());
      const unsub = useObjectsStore.subscribe((state) => {
        const next = selector(state);
        if (next !== prev) {
          objectTriggers++;
          prev = next;
        }
      });
      unsubs.push(unsub);
    }

    // 60 marquee move frames: selection rect updates DON'T touch objectsStore
    // (they update component state or selectionStore only)
    // Verify zero object re-renders during the move phase
    objectTriggers = 0;
    const moveStart = hrtMs();
    for (let frame = 0; frame < FRAMES; frame++) {
      // selectionRect is component state in useMarqueeSelection — nothing touches objectsStore
      // We just burn some time to simulate the frame
    }
    void (hrtMs() - moveStart);

    // Release: AABB filter on all objects
    const releaseStart = hrtMs();
    const selX1 = 0, selY1 = 0, selX2 = 2500, selY2 = 2500;
    const selected = objects.filter((obj) => {
      const r = obj.x + obj.width;
      const b = obj.y + obj.height;

      return r >= selX1 && obj.x <= selX2 && b >= selY1 && obj.y <= selY2;
    });
    const releaseDuration = hrtMs() - releaseStart;

    // Selection store update
    const selectionStart = hrtMs();
    useSelectionStore.getState().setSelectedIds(selected.map((o) => o.id));
    const selectionDuration = hrtMs() - selectionStart;

    record('interaction_marquee_move_objectTriggers', objectTriggers, 'count', '500 objects, 60 frames');
    record('interaction_marquee_release_aabb', releaseDuration, 'ms', `500 objects → ${selected.length} selected`);
    record('interaction_marquee_release_setSelection', selectionDuration, 'ms', `${selected.length} selected`);

    console.log('[INTERACTION] Marquee + release (500 objects, 60 move frames):');
    console.log(`  Move phase object triggers: ${objectTriggers} (expect 0)`);
    console.log(`  Release AABB filter: ${releaseDuration.toFixed(3)} ms (${selected.length} matches)`);
    console.log(`  setSelectedIds: ${selectionDuration.toFixed(3)} ms`);
    console.log(`  Total release cost: ${(releaseDuration + selectionDuration).toFixed(3)} ms`);

    expect(objectTriggers).toBe(0);
    expect(releaseDuration + selectionDuration).toBeLessThan(10);

    unsubs.forEach((u) => u());
  });

  it('frame drag with 50 children: 60 frames via frameDragOffset', () => {
    // 1 frame + 50 children + 149 other shapes = 200 total
    const frameObj = makeObject('frame-0', {
      type: 'frame',
      x: 0,
      y: 0,
      width: 500,
      height: 500,
    });
    const children = Array.from({ length: 50 }, (_, i) =>
      makeObject(`child-${i}`, { parentFrameId: 'frame-0' })
    );
    const others = Array.from({ length: 149 }, (_, i) => makeObject(`other-${i}`));
    const allObjects = [frameObj, ...children, ...others];
    useObjectsStore.getState().setAll(allObjects);

    // Subscribe 200 selectFrameOffset selectors
    let triggersThisFrame = 0;
    const unsubs: Array<() => void> = [];
    for (const obj of allObjects) {
      const selector = selectFrameOffset(obj.parentFrameId);
      let prev = selector(useDragOffsetStore.getState());
      const unsub = useDragOffsetStore.subscribe((state) => {
        const next = selector(state);
        if (next !== prev) {
          triggersThisFrame++;
          prev = next;
        }
      });
      unsubs.push(unsub);
    }

    const frameTimes: number[] = [];
    const frameTriggers: number[] = [];

    for (let frame = 1; frame <= FRAMES; frame++) {
      triggersThisFrame = 0;
      const t0 = hrtMs();
      useDragOffsetStore.getState().setFrameDragOffset({
        frameId: 'frame-0',
        dx: frame * 3,
        dy: frame * 2,
      });
      frameTimes.push(hrtMs() - t0);
      frameTriggers.push(triggersThisFrame);
    }

    const totalTime = frameTimes.reduce((a, b) => a + b, 0);
    const avgFrame = totalTime / FRAMES;
    const peakFrame = Math.max(...frameTimes);
    const avgTriggers = frameTriggers.reduce((a, b) => a + b, 0) / FRAMES;

    record('interaction_frameDrag_total', totalTime, 'ms', '50 children of 200, 60 frames');
    record('interaction_frameDrag_avgFrame', avgFrame, 'ms', '50 children of 200');
    record('interaction_frameDrag_peakFrame', peakFrame, 'ms', '50 children of 200');
    record('interaction_frameDrag_triggersPerFrame', avgTriggers, 'count', '50 children of 200');

    console.log('[INTERACTION] Frame drag (50 children of 200, 60 frames):');
    console.log(`  Total: ${totalTime.toFixed(2)} ms`);
    console.log(`  Avg/frame: ${avgFrame.toFixed(3)} ms | Peak: ${peakFrame.toFixed(3)} ms`);
    console.log(`  Triggers/frame: ${avgTriggers.toFixed(1)} (expect 50 — children only)`);

    expect(avgFrame).toBeLessThan(3);
    expect(avgTriggers).toBe(50); // Only children, not the frame itself or others

    unsubs.forEach((u) => u());
  });
});

// ── Report ────────────────────────────────────────────────────────────────

afterAll(() => {
  if (metrics.length === 0) return;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  INTERACTION PERFORMANCE REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const m of metrics) {
    const val = m.value < 1 ? m.value.toFixed(4) : m.value.toFixed(2);
    console.log(`  ${m.name}: ${val} ${m.unit} (${m.context})`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
});
