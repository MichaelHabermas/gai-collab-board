import { describe, it, expect, vi } from 'vitest';
import { buildGuideCandidates, onDragMove } from '@/canvas/drag/alignmentEngine';
import type { IBoardObject } from '@/types';
import Konva from 'konva';

describe('alignmentEngine', () => {
  const objects: Record<string, IBoardObject> = {
    obj1: { id: 'obj1', x: 10, y: 10, width: 50, height: 50 } as IBoardObject,
    obj2: { id: 'obj2', x: 100, y: 100, width: 50, height: 50 } as IBoardObject,
    obj3: { id: 'obj3', x: 200, y: 200, width: 50, height: 50 } as IBoardObject,
  };

  describe('buildGuideCandidates', () => {
    it('returns candidates for visible objects not being dragged', () => {
      const visibleIds = ['obj1', 'obj2', 'obj3'];
      const draggedIds = new Set(['obj2']);
      const candidates = buildGuideCandidates(visibleIds, draggedIds, objects);

      expect(candidates).toHaveLength(2);
      expect(candidates.map((c) => c.id)).toEqual(['obj1', 'obj3']);
      expect(candidates[0]!.id).toBe('obj1');
      expect(candidates[0]!.bounds).toEqual({
        x1: 10,
        y1: 10,
        x2: 60,
        y2: 60,
      });
      expect(candidates[0]!.positions).toBeDefined();
    });

    it('ignores missing objects', () => {
      const visibleIds = ['obj1', 'missing'];
      const draggedIds = new Set<string>();
      const candidates = buildGuideCandidates(visibleIds, draggedIds, objects);

      expect(candidates).toHaveLength(1);
      expect(candidates[0]!.id).toBe('obj1');
    });
  });

  describe('onDragMove', () => {
    it('computes guides, snaps position, and calls updateGuides', () => {
      let pos = { x: 12, y: 10 };
      const node = {
        width: () => 50,
        height: () => 50,
        scaleX: () => 1,
        scaleY: () => 1,
        position: vi.fn((p?: { x: number; y: number }) => {
          if (p) { pos = p; return node; }
          return pos;
        }),
      } as unknown as Konva.Node;
      const event = { target: node } as unknown as Konva.KonvaEventObject<DragEvent>;
      
      const bounds = { x1: 10, y1: 100, x2: 60, y2: 150 };
      const candidates = [
        { id: 'obj1', bounds, positions: { v: [10, 35, 60], h: [100, 125, 150] } }, 
      ];
      
      const overlayManager = { updateGuides: vi.fn() };
      
      onDragMove(event, candidates, overlayManager);
      
      // Node position should be snapped to 10 (because 12 is within SNAP_TOLERANCE of 10)
      // Assuming computeSnappedPositionFromGuides snaps it.
      expect(pos.x).toBe(10);
      
      expect(overlayManager.updateGuides).toHaveBeenCalled();
      const guidesArg = overlayManager.updateGuides.mock.calls[0]?.[0];
      expect(guidesArg).toBeDefined();
      expect(guidesArg.vertical.length).toBeGreaterThan(0);
    });
  });
});
