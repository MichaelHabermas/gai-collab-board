/**
 * Alignment guides: detect when dragged object aligns with others (edges/centers)
 * and return guide line positions plus optional snap position.
 */

import type {
  IBounds,
  IPosition,
  IAlignmentGuides,
  IAlignmentPositions,
  IAlignmentCandidate,
} from '@/types';

export type { IAlignmentGuides, IAlignmentCandidate };

const DEFAULT_THRESHOLD = 4;

/**
 * Key positions for alignment: left edge, center x, right edge, top edge, center y, bottom edge.
 */
export function getAlignmentPositions(b: IBounds): IAlignmentPositions {
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
  const candidates: IAlignmentCandidate[] = others.map((bounds) => ({
    bounds,
    positions: getAlignmentPositions(bounds),
  }));
  return computeAlignmentGuidesWithCandidates(dragged, candidates, threshold);
}

export function computeAlignmentGuidesWithCandidates(
  dragged: IBounds,
  others: IAlignmentCandidate[],
  threshold: number = DEFAULT_THRESHOLD
): IAlignmentGuides {
  const horizontalSet = new Set<number>();
  const verticalSet = new Set<number>();
  const draggedPos = getAlignmentPositions(dragged);

  for (const other of others) {
    const otherPos = other.positions;
    for (const v of draggedPos.v) {
      for (const ov of otherPos.v) {
        if (withinThreshold(v, ov, threshold)) {
          verticalSet.add(ov);
        }
      }
    }
    for (const h of draggedPos.h) {
      for (const oh of otherPos.h) {
        if (withinThreshold(h, oh, threshold)) {
          horizontalSet.add(oh);
        }
      }
    }
  }

  return {
    horizontal: Array.from(horizontalSet),
    vertical: Array.from(verticalSet),
  };
}

/**
 * Snaps position from precomputed guides. Useful for drag handlers that already
 * computed guides for rendering, so we avoid recalculating them for snapping.
 */
export function computeSnappedPositionFromGuides(
  guides: IAlignmentGuides,
  pos: IPosition,
  width: number,
  height: number,
  threshold: number = DEFAULT_THRESHOLD
): IPosition {
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

/**
 * Snaps position so that the dragged rect (with given width/height) aligns
 * to the nearest guide from other bounds. Snaps x to vertical guides and y to horizontal guides.
 */
export function computeSnappedPosition(
  dragged: IBounds,
  others: IBounds[],
  pos: IPosition,
  width: number,
  height: number,
  threshold: number = DEFAULT_THRESHOLD
): IPosition {
  const guides = computeAlignmentGuides(dragged, others, threshold);
  return computeSnappedPositionFromGuides(guides, pos, width, height, threshold);
}
