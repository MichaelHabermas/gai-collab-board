import { describe, expect, it } from 'vitest';
import {
  scaleLinePointsLengthOnly,
  getWidthHeightFromPoints,
} from '@/lib/lineTransform';

describe('getWidthHeightFromPoints', () => {
  it('returns width and height from points bounding box', () => {
    const { width, height } = getWidthHeightFromPoints([0, 0, 100, 50]);
    expect(width).toBe(100);
    expect(height).toBe(50);
  });

  it('returns 0 for fewer than 4 values', () => {
    expect(getWidthHeightFromPoints([])).toEqual({ width: 0, height: 0 });
    expect(getWidthHeightFromPoints([10, 20])).toEqual({ width: 0, height: 0 });
  });

  it('handles negative coordinates', () => {
    const { width, height } = getWidthHeightFromPoints([-50, -25, 150, 75]);
    expect(width).toBe(200);
    expect(height).toBe(100);
  });
});

describe('scaleLinePointsLengthOnly', () => {
  it('scales only length: uniform scale from center for diagonal line', () => {
    const points = [0, 0, 100, 50];
    const { points: result, width, height } = scaleLinePointsLengthOnly(points, 2, 2);
    const [x0, y0, x1, y1] = result;
    expect(x0).toBeCloseTo(-50, 0);
    expect(y0).toBeCloseTo(-25, 0);
    expect(x1).toBeCloseTo(150, 0);
    expect(y1).toBeCloseTo(75, 0);
    const oldLen = Math.hypot(100, 50);
    const newLen = Math.hypot(x1 - x0, y1 - y0);
    expect(newLen).toBeCloseTo(oldLen * 2, 0);
    expect(width).toBe(200);
    expect(height).toBe(100);
  });

  it('preserves direction when scaleX and scaleY differ (length-only)', () => {
    const points = [0, 0, 10, 20];
    const { points: result } = scaleLinePointsLengthOnly(points, 2, 3);
    const [x0, y0, x1, y1] = result;
    const dx = (x1 - x0) / 10;
    const dy = (y1 - y0) / 20;
    expect(dx).toBeCloseTo(dy, 5);
    const oldLen = Math.hypot(10, 20);
    const rawScaledLen = Math.hypot(20, 60);
    const resultLen = Math.hypot(x1 - x0, y1 - y0);
    expect(resultLen).toBeCloseTo(rawScaledLen, 0);
  });

  it('returns copy of points and box when length is near zero', () => {
    const points = [5, 5, 5, 5];
    const { points: result, width, height } = scaleLinePointsLengthOnly(points, 2, 2);
    expect(result).toEqual([5, 5, 5, 5]);
    expect(width).toBe(0);
    expect(height).toBe(0);
  });

  it('returns points and width/height for fewer than 4 points', () => {
    const points = [1, 2];
    const { points: result, width, height } = scaleLinePointsLengthOnly(points, 1, 1);
    expect(result).toEqual([1, 2]);
    expect(width).toBe(0);
    expect(height).toBe(0);
  });
});
