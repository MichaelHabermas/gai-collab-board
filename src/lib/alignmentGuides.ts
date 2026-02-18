/**
 * Alignment guides: detect when dragged object aligns with others (edges/centers)
 * and return guide line positions plus optional snap position.
 */

import type { IBounds } from './canvasBounds';

const DEFAULT_THRESHOLD = 4;

export interface IAlignmentGuides {
  horizontal: number[];
  vertical: number[];
}

/**
 * Key positions for alignment: left edge, center x, right edge, top edge, center y, bottom edge.
 */
function getAlignmentPositions(b: IBounds): { v: number[]; h: number[] } {
  const centerX = (b.x1 + b.x2) / 2;
  const centerY = (b.y1 + b.y2) / 2;
  return {
    v: [b.x1, centerX, b.x2],
    h: [b.y1, centerY, b.y2],
  };
}

function withinThreshold(a: number, b: number, threshold: number): boolean {
  return Math.abs(a - b) <= threshold;
}

/**
 * Computes horizontal and vertical guide line positions when the dragged bounds
 * align with any of the other bounds (edges or centers) within threshold.
 */
export function computeAlignmentGuides(
  dragged: IBounds,
  others: IBounds[],
  threshold: number = DEFAULT_THRESHOLD
): IAlignmentGuides {
  const horizontal: number[] = [];
  const vertical: number[] = [];
  const draggedPos = getAlignmentPositions(dragged);

  for (const other of others) {
    const otherPos = getAlignmentPositions(other);
    for (const v of draggedPos.v) {
      for (const ov of otherPos.v) {
        if (withinThreshold(v, ov, threshold) && !vertical.includes(ov)) {
          vertical.push(ov);
        }
      }
    }
    for (const h of draggedPos.h) {
      for (const oh of otherPos.h) {
        if (withinThreshold(h, oh, threshold) && !horizontal.includes(oh)) {
          horizontal.push(oh);
        }
      }
    }
  }

  return { horizontal, vertical };
}

/**
 * Snaps position so that the dragged rect (with given width/height) aligns
 * to the nearest guide from other bounds. Snaps x to vertical guides and y to horizontal guides.
 */
export function computeSnappedPosition(
  dragged: IBounds,
  others: IBounds[],
  pos: { x: number; y: number },
  width: number,
  height: number,
  threshold: number = DEFAULT_THRESHOLD
): { x: number; y: number } {
  const guides = computeAlignmentGuides(dragged, others, threshold);
  let x = pos.x;
  let y = pos.y;

  const left = pos.x;
  const centerX = pos.x + width / 2;
  const right = pos.x + width;
  const top = pos.y;
  const centerY = pos.y + height / 2;
  const bottom = pos.y + height;

  for (const v of guides.vertical) {
    if (withinThreshold(left, v, threshold)) {
      x = v;
      break;
    }
    if (withinThreshold(centerX, v, threshold)) {
      x = v - width / 2;
      break;
    }
    if (withinThreshold(right, v, threshold)) {
      x = v - width;
      break;
    }
  }

  for (const h of guides.horizontal) {
    if (withinThreshold(top, h, threshold)) {
      y = h;
      break;
    }
    if (withinThreshold(centerY, h, threshold)) {
      y = h - height / 2;
      break;
    }
    if (withinThreshold(bottom, h, threshold)) {
      y = h - height;
      break;
    }
  }

  return { x, y };
}
