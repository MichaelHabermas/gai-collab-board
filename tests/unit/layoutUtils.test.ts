import { describe, it, expect } from 'vitest';
import {
  resolveStickyColor,
  computeBoundingBox,
  findOpenSpace,
  STICKY_COLORS,
  DEFAULT_FILL,
  DEFAULT_STICKY_WIDTH,
  DEFAULT_STICKY_HEIGHT,
  DEFAULT_FRAME_PADDING,
  FRAME_PLACEHOLDER_ID,
  type BoundedObject,
} from '@/modules/ai/layouts/layoutUtils';

describe('layoutUtils', () => {
  describe('resolveStickyColor', () => {
    it('returns default fill for undefined input', () => {
      expect(resolveStickyColor(undefined)).toBe(DEFAULT_FILL);
    });

    it('returns default fill for empty string', () => {
      expect(resolveStickyColor('')).toBe(DEFAULT_FILL);
    });

    it('resolves named colors case-insensitively', () => {
      expect(resolveStickyColor('yellow')).toBe(STICKY_COLORS.yellow);
      expect(resolveStickyColor('Pink')).toBe(STICKY_COLORS.pink);
      expect(resolveStickyColor('BLUE')).toBe(STICKY_COLORS.blue);
      expect(resolveStickyColor('green')).toBe(STICKY_COLORS.green);
      expect(resolveStickyColor('purple')).toBe(STICKY_COLORS.purple);
      expect(resolveStickyColor('orange')).toBe(STICKY_COLORS.orange);
      expect(resolveStickyColor('red')).toBe(STICKY_COLORS.red);
    });

    it('passes through hex colors unchanged', () => {
      expect(resolveStickyColor('#ff0000')).toBe('#ff0000');
      expect(resolveStickyColor('#abc')).toBe('#abc');
    });

    it('returns default fill for unrecognized non-hex strings', () => {
      expect(resolveStickyColor('chartreuse')).toBe(DEFAULT_FILL);
      expect(resolveStickyColor('notacolor')).toBe(DEFAULT_FILL);
    });
  });

  describe('computeBoundingBox', () => {
    it('returns zero-size box for empty array', () => {
      expect(computeBoundingBox([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('returns exact bounds for a single object', () => {
      const objects: BoundedObject[] = [{ x: 10, y: 20, width: 100, height: 50 }];

      expect(computeBoundingBox(objects)).toEqual({ x: 10, y: 20, width: 100, height: 50 });
    });

    it('computes union bounding box for multiple objects', () => {
      const objects: BoundedObject[] = [
        { x: 0, y: 0, width: 50, height: 50 },
        { x: 100, y: 100, width: 50, height: 50 },
      ];

      expect(computeBoundingBox(objects)).toEqual({ x: 0, y: 0, width: 150, height: 150 });
    });

    it('handles negative coordinates', () => {
      const objects: BoundedObject[] = [
        { x: -50, y: -30, width: 40, height: 20 },
        { x: 10, y: 5, width: 30, height: 25 },
      ];

      expect(computeBoundingBox(objects)).toEqual({ x: -50, y: -30, width: 90, height: 60 });
    });

    it('handles overlapping objects', () => {
      const objects: BoundedObject[] = [
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 50, y: 50, width: 100, height: 100 },
      ];

      expect(computeBoundingBox(objects)).toEqual({ x: 0, y: 0, width: 150, height: 150 });
    });
  });

  describe('findOpenSpace', () => {
    it('returns default position for empty board', () => {
      expect(findOpenSpace([], 200, 200)).toEqual({ x: 100, y: 100 });
    });

    it('places to the right of existing objects with default padding', () => {
      const objects: BoundedObject[] = [{ x: 0, y: 0, width: 300, height: 200 }];

      const result = findOpenSpace(objects, 200, 200);

      expect(result.x).toBe(360); // 0 + 300 + 60 (default padding)
      expect(result.y).toBe(0);
    });

    it('uses custom padding', () => {
      const objects: BoundedObject[] = [{ x: 50, y: 50, width: 100, height: 100 }];

      const result = findOpenSpace(objects, 200, 200, 30);

      expect(result.x).toBe(180); // 50 + 100 + 30
      expect(result.y).toBe(50);
    });

    it('aligns y with topmost existing object', () => {
      const objects: BoundedObject[] = [
        { x: 0, y: 100, width: 50, height: 50 },
        { x: 200, y: 50, width: 50, height: 50 },
      ];

      const result = findOpenSpace(objects, 100, 100);

      expect(result.y).toBe(50); // min y of bounding box
    });
  });

  describe('constants', () => {
    it('exports expected constant values', () => {
      expect(DEFAULT_STICKY_WIDTH).toBe(200);
      expect(DEFAULT_STICKY_HEIGHT).toBe(120);
      expect(DEFAULT_FRAME_PADDING).toBe(30);
      expect(FRAME_PLACEHOLDER_ID).toBe('__frame__');
    });

    it('exports all 7 named sticky colors', () => {
      expect(Object.keys(STICKY_COLORS)).toHaveLength(7);
      expect(STICKY_COLORS).toHaveProperty('yellow');
      expect(STICKY_COLORS).toHaveProperty('pink');
      expect(STICKY_COLORS).toHaveProperty('blue');
      expect(STICKY_COLORS).toHaveProperty('green');
      expect(STICKY_COLORS).toHaveProperty('purple');
      expect(STICKY_COLORS).toHaveProperty('orange');
      expect(STICKY_COLORS).toHaveProperty('red');
    });
  });
});
