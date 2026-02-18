import { describe, it, expect } from 'vitest';
import {
  computeAlignmentGuides,
  computeSnappedPosition,
  computeSnappedPositionFromGuides,
} from '@/lib/alignmentGuides';
import type { IBounds } from '@/lib/canvasBounds';

const b = (x1: number, y1: number, x2: number, y2: number): IBounds => ({
  x1,
  y1,
  x2,
  y2,
});

describe('alignmentGuides', () => {
  describe('computeAlignmentGuides', () => {
    it('returns vertical guide when left edges align within threshold', () => {
      const dragged = b(50, 0, 150, 100);
      const others = [b(50, 200, 100, 300)];
      const result = computeAlignmentGuides(dragged, others, 5);
      expect(result.vertical).toContain(50);
      expect(result.horizontal).toHaveLength(0);
    });

    it('returns horizontal guide when top edges align within threshold', () => {
      const dragged = b(0, 80, 100, 180);
      const others = [b(200, 80, 300, 200)];
      const result = computeAlignmentGuides(dragged, others, 5);
      expect(result.horizontal).toContain(80);
      expect(result.vertical).toHaveLength(0);
    });

    it('returns both when centers align', () => {
      const dragged = b(95, 95, 105, 105);
      const others = [b(95, 95, 105, 105)]; // same center (100, 100)
      const result = computeAlignmentGuides(dragged, others, 5);
      expect(result.vertical.length).toBeGreaterThan(0);
      expect(result.horizontal.length).toBeGreaterThan(0);
    });

    it('returns empty when no alignment within threshold', () => {
      const dragged = b(0, 0, 100, 100);
      const others = [b(500, 500, 600, 600)];
      const result = computeAlignmentGuides(dragged, others, 5);
      expect(result.vertical).toHaveLength(0);
      expect(result.horizontal).toHaveLength(0);
    });
  });

  describe('computeSnappedPosition', () => {
    it('snaps x to vertical guide when left edge aligns', () => {
      const dragged = b(48, 0, 148, 100);
      const others = [b(50, 200, 150, 300)];
      const pos = computeSnappedPosition(dragged, others, { x: 48, y: 0 }, 100, 100, 5);
      expect(pos.x).toBe(50);
      expect(pos.y).toBe(0);
    });

    it('snaps y to horizontal guide when top edge aligns', () => {
      const dragged = b(0, 78, 100, 178);
      const others = [b(200, 80, 300, 280)];
      const pos = computeSnappedPosition(dragged, others, { x: 0, y: 78 }, 100, 100, 5);
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(80);
    });

    it('returns unchanged position when no alignment', () => {
      const dragged = b(0, 0, 100, 100);
      const others = [b(500, 500, 600, 600)];
      const pos = computeSnappedPosition(dragged, others, { x: 10, y: 20 }, 100, 100, 5);
      expect(pos).toEqual({ x: 10, y: 20 });
    });
  });

  describe('computeSnappedPositionFromGuides', () => {
    it('snaps by center and bottom alignment branches', () => {
      const pos = computeSnappedPositionFromGuides(
        {
          vertical: [100],
          horizontal: [240],
        },
        { x: 52, y: 150 },
        96,
        90,
        5
      );

      expect(pos.x).toBe(52);
      expect(pos.y).toBe(150);

      const centeredPos = computeSnappedPositionFromGuides(
        {
          vertical: [100],
          horizontal: [240],
        },
        { x: 54, y: 152 },
        92,
        88,
        5
      );

      expect(centeredPos.x).toBe(54);
      expect(centeredPos.y).toBe(152);
    });

    it('snaps by right and bottom edges when within threshold', () => {
      const pos = computeSnappedPositionFromGuides(
        {
          vertical: [200],
          horizontal: [300],
        },
        { x: 103, y: 214 },
        100,
        90,
        5
      );

      expect(pos.x).toBe(100);
      expect(pos.y).toBe(210);
    });
  });
});
