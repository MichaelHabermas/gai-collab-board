import { describe, it, expect } from 'vitest';
import {
  snapToGrid,
  snapPositionToGrid,
  snapSizeToGrid,
} from '@/lib/snapToGrid';

describe('snapToGrid', () => {
  const gridSize = 20;

  describe('snapToGrid', () => {
    it('rounds to nearest multiple of grid size', () => {
      expect(snapToGrid(0, gridSize)).toBe(0);
      expect(snapToGrid(10, gridSize)).toBe(20);
      expect(snapToGrid(15, gridSize)).toBe(20);
      expect(snapToGrid(25, gridSize)).toBe(20);
      expect(snapToGrid(30, gridSize)).toBe(40);
      expect(snapToGrid(-5, gridSize)).toEqual(0);
      expect(snapToGrid(-15, gridSize)).toBe(-20);
    });
  });

  describe('snapPositionToGrid', () => {
    it('snaps x and y to grid', () => {
      expect(snapPositionToGrid(12, 18, gridSize)).toEqual({ x: 20, y: 20 });
      expect(snapPositionToGrid(0, 0, gridSize)).toEqual({ x: 0, y: 0 });
      expect(snapPositionToGrid(100, 55, gridSize)).toEqual({ x: 100, y: 60 });
    });
  });

  describe('snapSizeToGrid', () => {
    it('snaps width and height to grid with minimum one grid unit', () => {
      expect(snapSizeToGrid(50, 30, gridSize)).toEqual({ width: 60, height: 40 });
      expect(snapSizeToGrid(20, 20, gridSize)).toEqual({ width: 20, height: 20 });
      expect(snapSizeToGrid(5, 5, gridSize)).toEqual({ width: 20, height: 20 });
    });
  });
});
