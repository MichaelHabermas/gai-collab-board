import { describe, it, expect } from 'vitest';
import {
  getObjectBounds,
  getSelectionBounds,
  getSelectionBoundsFromRecord,
  getBoardBounds,
  getBoardBoundsFromRecord,
  isPointInBounds,
  computeViewportToFitBounds,
} from '@/lib/canvasBounds';
import type { IBoardObject } from '@/types';

function makeSticky(overrides: Partial<IBoardObject> & { id: string; x: number; y: number; width: number; height: number }): IBoardObject {
  return {
    ...overrides,
    type: 'sticky',
    rotation: 0,
    fill: overrides.fill ?? '#f',
    text: '',
    createdBy: 'test',
    createdAt: {} as IBoardObject['createdAt'],
    updatedAt: {} as IBoardObject['updatedAt'],
  };
}

describe('canvasBounds', () => {
  describe('getObjectBounds', () => {
    it('returns rect bounds for sticky', () => {
      const obj = makeSticky({ id: '1', x: 10, y: 20, width: 100, height: 80 });
      expect(getObjectBounds(obj)).toEqual({ x1: 10, y1: 20, x2: 110, y2: 100 });
    });

    it('returns bounds from points for line', () => {
      const obj: IBoardObject = {
        ...makeSticky({ id: '2', x: 0, y: 0, width: 0, height: 0 }),
        type: 'line',
        points: [0, 0, 100, 50],
      };
      const b = getObjectBounds(obj);
      expect(b.x1).toBe(0);
      expect(b.y1).toBe(0);
      expect(b.x2).toBe(100);
      expect(b.y2).toBe(50);
    });

    it('returns non-zero bounds for line with only 2 points', () => {
      const obj: IBoardObject = {
        ...makeSticky({ id: 'line-2pt', x: 0, y: 0, width: 0, height: 0 }),
        type: 'line',
        points: [10, 20],
      };
      const b = getObjectBounds(obj);
      expect(b.x2 - b.x1).toBeGreaterThan(0);
      expect(b.y2 - b.y1).toBeGreaterThan(0);
      expect(b.x1).toBeLessThanOrEqual(b.x2);
      expect(b.y1).toBeLessThanOrEqual(b.y2);
    });

    it('returns bounds for connector with 2 points so marquee can select', () => {
      const obj: IBoardObject = {
        ...makeSticky({ id: 'conn-2pt', x: 5, y: 5, width: 0, height: 0 }),
        type: 'connector',
        points: [0, 0],
      };
      const b = getObjectBounds(obj);
      expect(b.x2 - b.x1).toBeGreaterThan(0);
      expect(b.y2 - b.y1).toBeGreaterThan(0);
    });

    it('expands line bounds when extent is below MIN_POINTS_BOUND_SIZE', () => {
      const obj: IBoardObject = {
        ...makeSticky({ id: 'line-tiny', x: 10, y: 20, width: 0, height: 0 }),
        type: 'line',
        points: [0, 0, 1, 0],
      };
      const b = getObjectBounds(obj);
      expect(b.x2 - b.x1).toBeGreaterThanOrEqual(2);
      expect(b.y2 - b.y1).toBeGreaterThanOrEqual(2);
      expect(b.x1).toBeLessThanOrEqual(10);
      expect(b.x2).toBeGreaterThanOrEqual(11);
    });

    it('expands connector bounds when vertical extent is below MIN_POINTS_BOUND_SIZE', () => {
      const obj: IBoardObject = {
        ...makeSticky({ id: 'conn-vert', x: 0, y: 0, width: 0, height: 0 }),
        type: 'connector',
        points: [0, 0, 0, 1],
      };
      const b = getObjectBounds(obj);
      expect(b.y2 - b.y1).toBeGreaterThanOrEqual(2);
      expect(b.x2 - b.x1).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getSelectionBounds', () => {
    it('returns null when no selection', () => {
      const objects = [makeSticky({ id: '1', x: 0, y: 0, width: 10, height: 10 })];
      expect(getSelectionBounds(objects, [])).toBeNull();
    });

    it('returns bounds of selected objects', () => {
      const objects = [
        makeSticky({ id: '1', x: 0, y: 0, width: 10, height: 10 }),
        makeSticky({ id: '2', x: 100, y: 50, width: 20, height: 20 }),
      ];
      expect(getSelectionBounds(objects, ['1', '2'])).toEqual({
        x1: 0,
        y1: 0,
        x2: 120,
        y2: 70,
      });
    });
  });

  describe('getSelectionBoundsFromRecord', () => {
    it('returns null when no selection', () => {
      const record: Record<string, IBoardObject> = {
        '1': makeSticky({ id: '1', x: 0, y: 0, width: 10, height: 10 }),
      };
      expect(getSelectionBoundsFromRecord(record, [])).toBeNull();
      expect(getSelectionBoundsFromRecord(record, new Set())).toBeNull();
    });

    it('returns bounds of selected objects by id', () => {
      const record: Record<string, IBoardObject> = {
        '1': makeSticky({ id: '1', x: 0, y: 0, width: 10, height: 10 }),
        '2': makeSticky({ id: '2', x: 100, y: 50, width: 20, height: 20 }),
      };
      expect(getSelectionBoundsFromRecord(record, ['1', '2'])).toEqual({
        x1: 0,
        y1: 0,
        x2: 120,
        y2: 70,
      });
      expect(getSelectionBoundsFromRecord(record, new Set(['1', '2']))).toEqual({
        x1: 0,
        y1: 0,
        x2: 120,
        y2: 70,
      });
    });

    it('ignores missing ids in record', () => {
      const record: Record<string, IBoardObject> = {
        '1': makeSticky({ id: '1', x: 10, y: 10, width: 10, height: 10 }),
      };
      expect(getSelectionBoundsFromRecord(record, ['1', 'missing'])).toEqual({
        x1: 10,
        y1: 10,
        x2: 20,
        y2: 20,
      });
    });
  });

  describe('isPointInBounds', () => {
    it('returns true when point is inside bounds', () => {
      const bounds = { x1: 10, y1: 20, x2: 100, y2: 80 };
      expect(isPointInBounds(50, 50, bounds)).toBe(true);
      expect(isPointInBounds(10, 20, bounds)).toBe(true);
      expect(isPointInBounds(100, 80, bounds)).toBe(true);
    });

    it('returns false when point is outside bounds', () => {
      const bounds = { x1: 10, y1: 20, x2: 100, y2: 80 };
      expect(isPointInBounds(9, 20, bounds)).toBe(false);
      expect(isPointInBounds(10, 19, bounds)).toBe(false);
      expect(isPointInBounds(101, 80, bounds)).toBe(false);
      expect(isPointInBounds(10, 81, bounds)).toBe(false);
    });
  });

  describe('getBoardBounds', () => {
    it('returns null when board empty', () => {
      expect(getBoardBounds([])).toBeNull();
    });

    it('returns bounds of all objects', () => {
      const objects = [
        makeSticky({ id: '1', x: 5, y: 5, width: 10, height: 10 }),
        makeSticky({ id: '2', x: 100, y: 50, width: 20, height: 20 }),
      ];
      expect(getBoardBounds(objects)).toEqual({ x1: 5, y1: 5, x2: 120, y2: 70 });
    });

    it('returns null when first element is missing (sparse array)', () => {
      const sparse: IBoardObject[] = [];
      sparse[1] = makeSticky({ id: '1', x: 10, y: 10, width: 10, height: 10 });
      expect(getBoardBounds(sparse)).toBeNull();
    });

    it('skips undefined elements in the loop', () => {
      const withHole: IBoardObject[] = [
        makeSticky({ id: '1', x: 0, y: 0, width: 10, height: 10 }),
        undefined as unknown as IBoardObject,
        makeSticky({ id: '2', x: 100, y: 100, width: 10, height: 10 }),
      ];
      expect(getBoardBounds(withHole)).toEqual({ x1: 0, y1: 0, x2: 110, y2: 110 });
    });
  });

  describe('getBoardBoundsFromRecord', () => {
    it('returns null when record empty', () => {
      expect(getBoardBoundsFromRecord({})).toBeNull();
    });

    it('returns bounds of all objects in record', () => {
      const record: Record<string, IBoardObject> = {
        '1': makeSticky({ id: '1', x: 5, y: 5, width: 10, height: 10 }),
        '2': makeSticky({ id: '2', x: 100, y: 50, width: 20, height: 20 }),
      };
      expect(getBoardBoundsFromRecord(record)).toEqual({ x1: 5, y1: 5, x2: 120, y2: 70 });
    });
  });

  describe('computeViewportToFitBounds', () => {
    it('returns scale and position so bounds fit with padding', () => {
      const bounds = { x1: 0, y1: 0, x2: 100, y2: 100 };
      const result = computeViewportToFitBounds(400, 300, bounds, 20);
      expect(result.scale).toBeGreaterThan(0);
      expect(result.scale).toBeLessThanOrEqual(10);
      expect(result.position).toEqual({
        x: 400 / 2 - 50 * result.scale,
        y: 300 / 2 - 50 * result.scale,
      });
    });

    it('clamps scale to max', () => {
      const bounds = { x1: 0, y1: 0, x2: 1, y2: 1 };
      const result = computeViewportToFitBounds(1000, 1000, bounds, 0);
      expect(result.scale).toBeLessThanOrEqual(10);
    });
  });
});
