import { describe, it, expect } from 'vitest';
import {
  computeAlignUpdates,
  computeDistributeUpdates,
  type ILayoutRect,
} from '@/lib/alignDistribute';

const rect = (id: string, x: number, y: number, w: number, h: number): ILayoutRect => ({
  id,
  x,
  y,
  width: w,
  height: h,
});

describe('alignDistribute', () => {
  describe('computeAlignUpdates', () => {
    const twoRects = [
      rect('a', 100, 50, 80, 40),
      rect('b', 200, 120, 60, 30),
    ];

    it('align left: moves all to min x', () => {
      const updates = computeAlignUpdates(twoRects, 'left');
      expect(updates).toHaveLength(2);
      expect(updates.find((u) => u.id === 'a')).toEqual({ id: 'a', x: 100 });
      expect(updates.find((u) => u.id === 'b')).toEqual({ id: 'b', x: 100 });
    });

    it('align right: moves all so right edges match', () => {
      const updates = computeAlignUpdates(twoRects, 'right');
      expect(updates).toHaveLength(2);
      const maxRight = 200 + 60;
      expect(updates.find((u) => u.id === 'a')).toEqual({ id: 'a', x: maxRight - 80 });
      expect(updates.find((u) => u.id === 'b')).toEqual({ id: 'b', x: 200 });
    });

    it('align center: centers all on same vertical line', () => {
      const updates = computeAlignUpdates(twoRects, 'center');
      expect(updates).toHaveLength(2);
      const minX = 100;
      const maxRight = 260;
      const centerX = (minX + maxRight) / 2;
      expect(updates.find((u) => u.id === 'a')).toEqual({ id: 'a', x: centerX - 40 });
      expect(updates.find((u) => u.id === 'b')).toEqual({ id: 'b', x: centerX - 30 });
    });

    it('align top: moves all to min y', () => {
      const updates = computeAlignUpdates(twoRects, 'top');
      expect(updates).toHaveLength(2);
      expect(updates.find((u) => u.id === 'a')).toEqual({ id: 'a', y: 50 });
      expect(updates.find((u) => u.id === 'b')).toEqual({ id: 'b', y: 50 });
      expect(updates.find((u) => u.id === 'b')).toEqual({ id: 'b', y: 50 });
    });

    it('align bottom: moves all so bottom edges match', () => {
      const updates = computeAlignUpdates(twoRects, 'bottom');
      expect(updates).toHaveLength(2);
      const maxBottom = 120 + 30;
      expect(updates.find((u) => u.id === 'a')).toEqual({ id: 'a', y: maxBottom - 40 });
      expect(updates.find((u) => u.id === 'b')).toEqual({ id: 'b', y: maxBottom - 30 });
    });

    it('align middle: centers all on same horizontal line', () => {
      const updates = computeAlignUpdates(twoRects, 'middle');
      expect(updates).toHaveLength(2);
      const minY = 50;
      const maxBottom = 150;
      const centerY = (minY + maxBottom) / 2;
      expect(updates.find((u) => u.id === 'a')).toEqual({ id: 'a', y: centerY - 20 });
      expect(updates.find((u) => u.id === 'b')).toEqual({ id: 'b', y: centerY - 15 });
    });

    it('returns empty array for no objects', () => {
      expect(computeAlignUpdates([], 'left')).toEqual([]);
    });
  });

  describe('computeDistributeUpdates', () => {
    it('distribute horizontal: equal spacing between 3 objects', () => {
      const objects = [
        rect('a', 0, 0, 50, 20),
        rect('b', 100, 0, 50, 20),
        rect('c', 200, 0, 50, 20),
      ];
      const updates = computeDistributeUpdates(objects, 'horizontal');
      expect(updates).toHaveLength(3);
      const totalWidth = 200 + 50 - 0;
      const objectsWidth = 50 * 3;
      const spacing = (totalWidth - objectsWidth) / 2;
      expect(updates[0]).toEqual({ id: 'a', x: 0 });
      expect(updates[1]).toEqual({ id: 'b', x: 50 + spacing });
      expect(updates[2]).toEqual({ id: 'c', x: 200 });
    });

    it('distribute vertical: equal spacing between 3 objects', () => {
      const objects = [
        rect('a', 0, 0, 30, 40),
        rect('b', 0, 80, 30, 40),
        rect('c', 0, 160, 30, 40),
      ];
      const updates = computeDistributeUpdates(objects, 'vertical');
      expect(updates).toHaveLength(3);
      expect(updates[0]).toEqual({ id: 'a', y: 0 });
      expect(updates[1]).toEqual({ id: 'b', y: 80 });
      expect(updates[2]).toEqual({ id: 'c', y: 160 });
    });

    it('returns empty array for fewer than 3 objects', () => {
      expect(computeDistributeUpdates([rect('a', 0, 0, 10, 10)], 'horizontal')).toEqual([]);
      expect(
        computeDistributeUpdates(
          [rect('a', 0, 0, 10, 10), rect('b', 20, 0, 10, 10)],
          'horizontal'
        )
      ).toEqual([]);
    });

    it('sorts by x for horizontal and by y for vertical', () => {
      const objects = [
        rect('c', 200, 0, 50, 20),
        rect('a', 0, 0, 50, 20),
        rect('b', 100, 0, 50, 20),
      ];
      const updates = computeDistributeUpdates(objects, 'horizontal');
      expect(updates.map((u) => u.id)).toEqual(['a', 'b', 'c']);
    });
  });
});
