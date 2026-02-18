/**
 * Layout types: align/distribute and alignment guides.
 * Moved from alignDistribute and alignmentGuides so layout shape types live in types.
 * Replace in: alignDistribute, alignmentGuides, AlignToolbar, AlignmentGuidesLayer, BoardCanvas.
 */

import type { IBounds } from './geometry';

export type AlignOption = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export type DistributeDirection = 'horizontal' | 'vertical';

/** Rect with id for align/distribute (id, position, size). */
export interface ILayoutRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Per-object position delta from align/distribute. */
export interface IPositionUpdate {
  id: string;
  x?: number;
  y?: number;
}

/** Horizontal and vertical guide line positions for alignment. */
export interface IAlignmentGuides {
  horizontal: number[];
  vertical: number[];
}

/** Internal: key positions (v/h arrays) for a bounds. Used by alignmentGuides. */
export interface IAlignmentPositions {
  v: number[];
  h: number[];
}

/** Bounds plus precomputed alignment positions (for drag snap). */
export interface IAlignmentCandidate {
  bounds: IBounds;
  positions: IAlignmentPositions;
}
