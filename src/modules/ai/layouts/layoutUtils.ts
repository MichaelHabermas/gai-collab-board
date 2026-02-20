import type { IBoardObject, ICreateObjectParams } from '@/types';

/** Sticky note color palette — matches canvas STICKY_COLORS. */
const STICKY_COLORS: Record<string, string> = {
  yellow: '#fef08a',
  pink: '#fda4af',
  blue: '#93c5fd',
  green: '#86efac',
  purple: '#d8b4fe',
  orange: '#fed7aa',
  red: '#fca5a5',
};

const DEFAULT_FILL = '#fef08a';
const DEFAULT_STICKY_WIDTH = 200;
const DEFAULT_STICKY_HEIGHT = 120;
const DEFAULT_FRAME_PADDING = 30;

/** Sentinel ID for frames in layout results. Replaced with real Firestore ID by compoundExecutor. */
const FRAME_PLACEHOLDER_ID = '__frame__';

type BoundedObject = Pick<IBoardObject, 'x' | 'y' | 'width' | 'height'>;

/** Standard layout result returned by all layout engines. */
interface ILayoutResult {
  objects: ICreateObjectParams[];
  /** Placeholder frame ID — real ID assigned after batch creation. */
  frameId: string;
}

/** Resolves a named color or hex string to a hex color. Falls back to yellow. */
function resolveStickyColor(input?: string): string {
  if (!input) {
    return DEFAULT_FILL;
  }

  const lower = input.toLowerCase();
  const named = STICKY_COLORS[lower];

  if (named) {
    return named;
  }

  if (input.startsWith('#')) {
    return input;
  }

  return DEFAULT_FILL;
}

/** Computes the axis-aligned bounding box of a set of objects. */
function computeBoundingBox(objects: BoundedObject[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (objects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + obj.width);
    maxY = Math.max(maxY, obj.y + obj.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Finds open canvas space by placing content to the right of existing objects.
 * Returns top-left coordinate for the requested dimensions.
 */
function findOpenSpace(
  objects: BoundedObject[],
  _width: number,
  _height: number,
  padding = 60
): { x: number; y: number } {
  if (objects.length === 0) {
    return { x: 100, y: 100 };
  }

  const bbox = computeBoundingBox(objects);

  return { x: bbox.x + bbox.width + padding, y: bbox.y };
}

export {
  STICKY_COLORS,
  DEFAULT_FILL,
  DEFAULT_STICKY_WIDTH,
  DEFAULT_STICKY_HEIGHT,
  DEFAULT_FRAME_PADDING,
  FRAME_PLACEHOLDER_ID,
  resolveStickyColor,
  computeBoundingBox,
  findOpenSpace,
};

export type { BoundedObject, ILayoutResult };
