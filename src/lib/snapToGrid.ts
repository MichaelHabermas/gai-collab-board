/**
 * Snap values to grid for consistent layout (e.g. 20px grid).
 * Used when "snap to grid" is enabled for move and resize.
 */

import type { IPosition, IDimensions } from '@/types';

/** Minimal node-like interface for applying snap during drag (testable without Konva). */
export interface IDragSnapNode {
  id(): string;
  getClassName(): string;
  x(): number;
  y(): number;
  position(pos: IPosition): void;
}

/** Minimal object shape for drag snap (width/height for Ellipse center conversion). */
export interface IDragSnapObject {
  width: number;
  height: number;
}

/**
 * Snaps the node's position to the grid and sets it. Used during drag when snap-to-grid is on.
 * Ellipse nodes use center position; we snap the bounding-box top-left and set center.
 */
export function applySnapPositionToNode(
  node: IDragSnapNode,
  objectsById: Map<string, IDragSnapObject>,
  gridSize: number
): void {
  const obj = objectsById.get(node.id());
  if (!obj) {
    return;
  }

  const className = node.getClassName();
  let topLeftX: number;
  let topLeftY: number;

  if (className === 'Ellipse') {
    topLeftX = node.x() - obj.width / 2;
    topLeftY = node.y() - obj.height / 2;
  } else {
    topLeftX = node.x();
    topLeftY = node.y();
  }

  const snapped = snapPositionToGrid(topLeftX, topLeftY, gridSize);

  if (className === 'Ellipse') {
    node.position({ x: snapped.x + obj.width / 2, y: snapped.y + obj.height / 2 });
  } else {
    node.position(snapped);
  }
}

interface IRectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

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

/**
 * Snaps resize result while preserving the opposite edge on each changed axis.
 * This matches edge-based resize behavior (e.g. dragging right edge only snaps right).
 */
export function snapResizeRectToGrid(
  oldRect: IRectBounds,
  nextRect: IRectBounds,
  gridSize: number
): IRectBounds {
  const CHANGE_EPSILON = 0.001;

  const oldLeft = oldRect.x;
  const oldTop = oldRect.y;
  const oldRight = oldRect.x + oldRect.width;
  const oldBottom = oldRect.y + oldRect.height;

  const nextLeft = nextRect.x;
  const nextTop = nextRect.y;
  const nextRight = nextRect.x + nextRect.width;
  const nextBottom = nextRect.y + nextRect.height;

  let finalLeft = nextLeft;
  let finalRight = nextRight;
  let finalTop = nextTop;
  let finalBottom = nextBottom;

  const widthChanged = Math.abs(nextRect.width - oldRect.width) > CHANGE_EPSILON;
  const heightChanged = Math.abs(nextRect.height - oldRect.height) > CHANGE_EPSILON;

  if (widthChanged) {
    const leftDelta = Math.abs(nextLeft - oldLeft);
    const rightDelta = Math.abs(nextRight - oldRight);

    if (leftDelta <= rightDelta) {
      // Left side stayed put; only right side should snap.
      finalLeft = oldLeft;
      finalRight = snapToGrid(nextRight, gridSize);
    } else {
      // Right side stayed put; only left side should snap.
      finalLeft = snapToGrid(nextLeft, gridSize);
      finalRight = oldRight;
    }

    if (finalRight - finalLeft < gridSize) {
      if (leftDelta <= rightDelta) {
        finalRight = finalLeft + gridSize;
      } else {
        finalLeft = finalRight - gridSize;
      }
    }
  }

  if (heightChanged) {
    const topDelta = Math.abs(nextTop - oldTop);
    const bottomDelta = Math.abs(nextBottom - oldBottom);

    if (topDelta <= bottomDelta) {
      // Top side stayed put; only bottom side should snap.
      finalTop = oldTop;
      finalBottom = snapToGrid(nextBottom, gridSize);
    } else {
      // Bottom side stayed put; only top side should snap.
      finalTop = snapToGrid(nextTop, gridSize);
      finalBottom = oldBottom;
    }

    if (finalBottom - finalTop < gridSize) {
      if (topDelta <= bottomDelta) {
        finalBottom = finalTop + gridSize;
      } else {
        finalTop = finalBottom - gridSize;
      }
    }
  }

  return {
    x: finalLeft,
    y: finalTop,
    width: finalRight - finalLeft,
    height: finalBottom - finalTop,
  };
}
