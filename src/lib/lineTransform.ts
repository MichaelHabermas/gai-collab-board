const LENGTH_EPSILON = 1e-6;

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export interface IPointsBbox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Returns the axis-aligned bounding box of a flat points array [x0,y0, x1,y1, ...].
 * Returns null if fewer than 2 values.
 */
function getPointsBbox(points: number[]): IPointsBbox | null {
  if (points.length < 2) {
    return null;
  }

  let minX = points[0] ?? 0;
  let maxX = points[0] ?? 0;
  let minY = points[1] ?? 0;
  let maxY = points[1] ?? 0;
  for (let i = 2; i + 1 < points.length; i += 2) {
    const px = points[i] ?? 0;
    const py = points[i + 1] ?? 0;
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Returns the center of the bounding box of a flat points array [x0,y0, x1,y1, ...].
 */
export function getPointsCenter(points: number[]): { x: number; y: number } {
  const bbox = getPointsBbox(points);
  if (!bbox) {
    return { x: 0, y: 0 };
  }

  return {
    x: (bbox.minX + bbox.maxX) / 2,
    y: (bbox.minY + bbox.maxY) / 2,
  };
}

/**
 * Returns axis-aligned width and height for a flat points array [x0,y0, x1,y1, ...].
 * Points are relative to origin (e.g. line position).
 */
export function getWidthHeightFromPoints(points: number[]): { width: number; height: number } {
  const bbox = getPointsBbox(points);
  if (!bbox || points.length < 4) {
    return { width: 0, height: 0 };
  }

  return {
    width: Math.max(0, bbox.maxX - bbox.minX),
    height: Math.max(0, bbox.maxY - bbox.minY),
  };
}

export interface ILineTransformResult {
  points: number[];
  width: number;
  height: number;
}

/**
 * Applies length-only scaling to line points: scale is uniform along the line direction
 * (from the line center), so only length changes, not the perpendicular "width".
 * Given current points and scaleX/scaleY from the transformer, returns new points
 * and their axis-aligned width/height.
 */
export function scaleLinePointsLengthOnly(
  points: number[],
  scaleX: number,
  scaleY: number
): ILineTransformResult {
  if (points.length < 4) {
    const { width, height } = getWidthHeightFromPoints(points);
    return { points: [...points], width, height };
  }

  const x0 = points[0] ?? 0;
  const y0 = points[1] ?? 0;
  const x1 = points[points.length - 2] ?? 0;
  const y1 = points[points.length - 1] ?? 0;

  const oldLength = distance(x0, y0, x1, y1);
  if (oldLength < LENGTH_EPSILON) {
    const { width, height } = getWidthHeightFromPoints(points);
    return { points: [...points], width, height };
  }

  const scaledPoints = points.map((p, i) => (i % 2 === 0 ? p * scaleX : p * scaleY));
  const sx0 = scaledPoints[0] ?? 0;
  const sy0 = scaledPoints[1] ?? 0;
  const sx1 = scaledPoints[scaledPoints.length - 2] ?? 0;
  const sy1 = scaledPoints[scaledPoints.length - 1] ?? 0;
  const newLength = distance(sx0, sy0, sx1, sy1);
  const lengthScale = newLength / oldLength;

  const centerX = (x0 + x1) / 2;
  const centerY = (y0 + y1) / 2;

  const resultPoints: number[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    const px = points[i] ?? 0;
    const py = points[i + 1] ?? 0;
    resultPoints.push(
      centerX + (px - centerX) * lengthScale,
      centerY + (py - centerY) * lengthScale
    );
  }

  const { width, height } = getWidthHeightFromPoints(resultPoints);
  return { points: resultPoints, width, height };
}
