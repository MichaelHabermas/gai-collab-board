/**
 * Visual Stability Tests
 *
 * These tests verify correctness invariants that prevent visual glitches
 * (flicker, disappearing shapes, layer gaps) during interactions.
 *
 * All tests are pure logic — no React rendering, fast and deterministic.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { useObjectsStore, spatialIndex } from '@/stores/objectsStore';
import { useSelectionStore } from '@/stores/selectionStore';
import type { IBoardObject } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────

const makeObject = (id: string, overrides: Partial<IBoardObject> = {}): IBoardObject => ({
  id,
  type: 'rectangle',
  x: Math.random() * 1000,
  y: Math.random() * 800,
  width: 100,
  height: 80,
  rotation: 0,
  fill: '#93c5fd',
  stroke: '#1e40af',
  strokeWidth: 2,
  createdBy: 'user-1',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  ...overrides,
});

/**
 * Replicate BoardCanvas's layer partition logic.
 * Splits visibleShapeIds into staticIds (frozen layer) and activeIds (60 Hz layer).
 */
const partitionLayers = (
  visibleShapeIds: string[],
  selectedIds: Set<string>,
  draggingFrameChildIds: Set<string>
): { staticIds: string[]; activeIds: string[] } => {
  const staticIds: string[] = [];
  const activeIds: string[] = [];

  for (const id of visibleShapeIds) {
    if (selectedIds.has(id) || draggingFrameChildIds.has(id)) {
      activeIds.push(id);
    } else {
      staticIds.push(id);
    }
  }

  return { staticIds, activeIds };
};

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Visual Stability — Layer Partition Invariants', () => {
  beforeEach(() => {
    useObjectsStore.getState().clear();
    useSelectionStore.getState().clearSelection();
    spatialIndex.clear();
  });

  it('every visible ID appears in exactly one of [staticIds, activeIds]', () => {
    // 200 objects, 10 selected, 20 frame children being dragged
    const visibleIds = Array.from({ length: 200 }, (_, i) => `obj-${i}`);
    const selectedIds = new Set(Array.from({ length: 10 }, (_, i) => `obj-${i}`));
    const draggingChildIds = new Set(Array.from({ length: 20 }, (_, i) => `obj-${50 + i}`));

    const { staticIds, activeIds } = partitionLayers(visibleIds, selectedIds, draggingChildIds);

    // Union must equal original set
    const union = new Set([...staticIds, ...activeIds]);
    expect(union.size).toBe(visibleIds.length);
    for (const id of visibleIds) {
      expect(union.has(id)).toBe(true);
    }

    // No duplicates (intersection must be empty)
    const staticSet = new Set(staticIds);
    const activeSet = new Set(activeIds);
    for (const id of staticIds) {
      expect(activeSet.has(id)).toBe(false);
    }
    for (const id of activeIds) {
      expect(staticSet.has(id)).toBe(false);
    }

    // Active count = selected + dragging children (minus overlap)
    const expectedActive = new Set([...selectedIds, ...draggingChildIds]);
    expect(activeIds.length).toBe(expectedActive.size);
  });

  it('selection change moves shape between layers without gap', () => {
    const visibleIds = Array.from({ length: 200 }, (_, i) => `obj-${i}`);
    const noChildren = new Set<string>();

    // Before selection: obj-5 in static
    const selectedBefore = new Set<string>();
    const before = partitionLayers(visibleIds, selectedBefore, noChildren);
    expect(before.staticIds).toContain('obj-5');
    expect(before.activeIds).not.toContain('obj-5');

    // After selection: obj-5 in active
    const selectedAfter = new Set(['obj-5']);
    const after = partitionLayers(visibleIds, selectedAfter, noChildren);
    expect(after.activeIds).toContain('obj-5');
    expect(after.staticIds).not.toContain('obj-5');

    // Both partitions cover all IDs (no frame gap)
    expect(before.staticIds.length + before.activeIds.length).toBe(200);
    expect(after.staticIds.length + after.activeIds.length).toBe(200);
  });

  it('spatial index drag exemption: shape stays visible while dragged offscreen', () => {
    // 100 objects all within viewport (0,0 → 1920,1080)
    const objects = Array.from({ length: 100 }, (_, i) =>
      makeObject(`obj-${i}`, { x: (i % 10) * 150, y: Math.floor(i / 10) * 100 })
    );

    // Insert all into spatial index
    for (const obj of objects) {
      spatialIndex.insert(obj.id, {
        x1: obj.x,
        y1: obj.y,
        x2: obj.x + obj.width,
        y2: obj.y + obj.height,
      });
    }

    const viewport = { x1: -200, y1: -200, x2: 2120, y2: 1280 };

    // Before drag: obj-0 is in viewport
    const beforeDrag = spatialIndex.query(viewport);
    expect(beforeDrag.has('obj-0')).toBe(true);

    // Mark obj-0 as dragging
    spatialIndex.setDragging(new Set(['obj-0']));

    // Move obj-0 far offscreen in spatial index
    spatialIndex.update('obj-0', { x1: 99999, y1: 99999, x2: 100099, y2: 100079 });

    // obj-0 should STILL appear in viewport query (drag exemption)
    const duringDrag = spatialIndex.query(viewport);
    expect(duringDrag.has('obj-0')).toBe(true);

    // After drag ends: obj-0 no longer exempted
    spatialIndex.clearDragging();
    const afterDrag = spatialIndex.query(viewport);
    expect(afterDrag.has('obj-0')).toBe(false); // It's at 99999, outside viewport
  });

  it('frame reparenting keeps child visible in spatial index', () => {
    // child-1 in frame-A, moving to frame-B
    const frameA = makeObject('frame-a', { type: 'frame', x: 0, y: 0, width: 500, height: 500 });
    const frameB = makeObject('frame-b', { type: 'frame', x: 600, y: 0, width: 500, height: 500 });
    const child = makeObject('child-1', { x: 100, y: 100, parentFrameId: 'frame-a' });

    // Insert all into spatial index
    for (const obj of [frameA, frameB, child]) {
      spatialIndex.insert(obj.id, {
        x1: obj.x,
        y1: obj.y,
        x2: obj.x + obj.width,
        y2: obj.y + obj.height,
      });
    }

    const viewport = { x1: -200, y1: -200, x2: 1300, y2: 800 };

    // Before reparenting: child visible
    const before = spatialIndex.query(viewport);
    expect(before.has('child-1')).toBe(true);

    // Reparent: move child to frame-B position and update parentFrameId
    spatialIndex.update('child-1', { x1: 700, y1: 100, x2: 800, y2: 180 });

    // After reparenting: child still visible (new position also in viewport)
    const after = spatialIndex.query(viewport);
    expect(after.has('child-1')).toBe(true);
  });

  it('draggingFrameId switch: correct children move between layers', () => {
    // frame-1 has 5 children, frame-2 has 3 children, 12 others
    const frame1ChildIds = new Set(Array.from({ length: 5 }, (_, i) => `f1-child-${i}`));
    const frame2ChildIds = new Set(Array.from({ length: 3 }, (_, i) => `f2-child-${i}`));
    const visibleIds = [
      'frame-1',
      ...frame1ChildIds,
      'frame-2',
      ...frame2ChildIds,
      ...Array.from({ length: 12 }, (_, i) => `other-${i}`),
    ];

    // Scenario 1: No frame dragging — all in static
    const selected1 = new Set<string>();
    const noDrag = partitionLayers(visibleIds, selected1, new Set<string>());
    expect(noDrag.activeIds.length).toBe(0);
    expect(noDrag.staticIds.length).toBe(visibleIds.length);

    // Scenario 2: Dragging frame-1 (selected + children in active)
    const selected2 = new Set(['frame-1']);
    const drag1 = partitionLayers(visibleIds, selected2, frame1ChildIds);
    expect(drag1.activeIds).toContain('frame-1');
    for (const id of frame1ChildIds) {
      expect(drag1.activeIds).toContain(id);
    }
    // frame-2 and its children still in static
    expect(drag1.staticIds).toContain('frame-2');
    for (const id of frame2ChildIds) {
      expect(drag1.staticIds).toContain(id);
    }
    expect(drag1.activeIds.length).toBe(1 + 5); // frame + 5 children

    // Scenario 3: Switch to dragging frame-2
    const selected3 = new Set(['frame-2']);
    const drag2 = partitionLayers(visibleIds, selected3, frame2ChildIds);
    expect(drag2.activeIds).toContain('frame-2');
    for (const id of frame2ChildIds) {
      expect(drag2.activeIds).toContain(id);
    }
    // frame-1 and its children back in static
    expect(drag2.staticIds).toContain('frame-1');
    for (const id of frame1ChildIds) {
      expect(drag2.staticIds).toContain(id);
    }
    expect(drag2.activeIds.length).toBe(1 + 3); // frame + 3 children

    // Both partitions always cover all visible IDs
    expect(drag1.staticIds.length + drag1.activeIds.length).toBe(visibleIds.length);
    expect(drag2.staticIds.length + drag2.activeIds.length).toBe(visibleIds.length);
  });
});
