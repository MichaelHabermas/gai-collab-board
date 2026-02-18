import type { IBoardObject, IBounds, IViewportFitResult } from '@/types';

export type { IBounds, IViewportFitResult };

const MIN_POINTS_BOUND_SIZE = 2;

/**
 * Returns axis-aligned bounds for a single object.
 * For line/connector, computes bounds from points (relative to obj.x, obj.y).
 */
export function getObjectBounds(obj: IBoardObject): IBounds {
  if (
    (obj.type === 'line' || obj.type === 'connector') &&
    obj.points != null &&
    obj.points.length >= 4
  ) {
    const pts = obj.points;
    const p0 = pts[0] ?? 0;
    const p1 = pts[1] ?? 0;
    let minX = obj.x + p0;
    let maxX = obj.x + p0;
    let minY = obj.y + p1;
    let maxY = obj.y + p1;
    for (let i = 2; i + 1 < pts.length; i += 2) {
      const px = obj.x + (pts[i] ?? 0);
      const py = obj.y + (pts[i + 1] ?? 0);
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
    if (maxX - minX < MIN_POINTS_BOUND_SIZE) {
      minX -= MIN_POINTS_BOUND_SIZE / 2;
      maxX += MIN_POINTS_BOUND_SIZE / 2;
    }

    if (maxY - minY < MIN_POINTS_BOUND_SIZE) {
      minY -= MIN_POINTS_BOUND_SIZE / 2;
      maxY += MIN_POINTS_BOUND_SIZE / 2;
    }

    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  }

  return {
    x1: obj.x,
    y1: obj.y,
    x2: obj.x + obj.width,
    y2: obj.y + obj.height,
  };
}

/**
 * Returns the axis-aligned bounding box of the selected objects, or null if none selected.
 */
export function getSelectionBounds(objects: IBoardObject[], selectedIds: string[]): IBounds | null {
  if (selectedIds.length === 0) {
    return null;
  }

  const selected = objects.filter((obj) => selectedIds.includes(obj.id));
  if (selected.length === 0) {
    return null;
  }

  const firstObj = selected[0];
  if (!firstObj) {
    return null;
  }

  const first = getObjectBounds(firstObj);
  let minX = first.x1;
  let minY = first.y1;
  let maxX = first.x2;
  let maxY = first.y2;
  for (let i = 1; i < selected.length; i++) {
    const obj = selected[i];
    if (!obj) {
      continue;
    }

    const b = getObjectBounds(obj);
    minX = Math.min(minX, b.x1);
    minY = Math.min(minY, b.y1);
    maxX = Math.max(maxX, b.x2);
    maxY = Math.max(maxY, b.y2);
  }
  return { x1: minX, y1: minY, x2: maxX, y2: maxY };
}

/**
 * Returns the axis-aligned bounding box of all board objects, or null if board is empty.
 */
export function getBoardBounds(objects: IBoardObject[]): IBounds | null {
  if (objects.length === 0) {
    return null;
  }

  const firstObj = objects[0];
  if (!firstObj) {
    return null;
  }

  const first = getObjectBounds(firstObj);
  let minX = first.x1;
  let minY = first.y1;
  let maxX = first.x2;
  let maxY = first.y2;
  for (let i = 1; i < objects.length; i++) {
    const obj = objects[i];
    if (!obj) {
      continue;
    }

    const b = getObjectBounds(obj);
    minX = Math.min(minX, b.x1);
    minY = Math.min(minY, b.y1);
    maxX = Math.max(maxX, b.x2);
    maxY = Math.max(maxY, b.y2);
  }
  return { x1: minX, y1: minY, x2: maxX, y2: maxY };
}

const VIEWPORT_MIN_SCALE = 0.1;
const VIEWPORT_MAX_SCALE = 10;

/**
 * Computes scale and position so that the given bounds fit in the viewport with padding.
 * Center of bounds is placed at center of viewport.
 */
export function computeViewportToFitBounds(
  viewportWidth: number,
  viewportHeight: number,
  bounds: IBounds,
  padding: number = 40
): IViewportFitResult {
  const width = bounds.x2 - bounds.x1;
  const height = bounds.y2 - bounds.y1;
  const paddedWidth = width + 2 * padding;
  const paddedHeight = height + 2 * padding;
  const scaleX = viewportWidth / paddedWidth;
  const scaleY = viewportHeight / paddedHeight;
  const scale = Math.min(
    VIEWPORT_MAX_SCALE,
    Math.max(VIEWPORT_MIN_SCALE, Math.min(scaleX, scaleY))
  );
  const centerX = (bounds.x1 + bounds.x2) / 2;
  const centerY = (bounds.y1 + bounds.y2) / 2;
  const position = {
    x: viewportWidth / 2 - centerX * scale,
    y: viewportHeight / 2 - centerY * scale,
  };
  return { scale, position };
}
