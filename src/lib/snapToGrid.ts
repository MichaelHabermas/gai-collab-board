/**
 * Snap values to grid for consistent layout (e.g. 20px grid).
 * Used when "snap to grid" is enabled for move and resize.
 */

import type { IPosition, IDimensions } from '@/types';

/**
 * Rounds a value to the nearest multiple of gridSize.
 * Returns 0 instead of -0 for consistency.
 */
export function snapToGrid(value: number, gridSize: number): number {
  const v = Math.round(value / gridSize) * gridSize;
  return v === 0 ? 0 : v;
}

/**
 * Snaps x and y to grid. Useful for position after drag.
 */
export function snapPositionToGrid(x: number, y: number, gridSize: number): IPosition {
  return {
    x: snapToGrid(x, gridSize),
    y: snapToGrid(y, gridSize),
  };
}

/**
 * Snaps width and height to grid (minimum 1 grid unit to avoid zero).
 * Useful for resize when snap to grid is enabled.
 */
export function snapSizeToGrid(width: number, height: number, gridSize: number): IDimensions {
  const w = Math.max(gridSize, snapToGrid(width, gridSize));
  const h = Math.max(gridSize, snapToGrid(height, gridSize));
  return { width: w, height: h };
}
