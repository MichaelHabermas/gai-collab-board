import type { IBoardObject } from '@/types';
import type { IBounds } from '@/types/geometry';
import { getObjectBounds } from '@/lib/canvasBounds';

// ── Pure helpers ─────────────────────────────────────────────────────

/**
 * Returns true when the center of `objectBounds` falls inside `frameBounds`.
 */
export const isInsideFrame = (objectBounds: IBounds, frameBounds: IBounds): boolean => {
  const cx = (objectBounds.x1 + objectBounds.x2) / 2;
  const cy = (objectBounds.y1 + objectBounds.y2) / 2;
  return (
    cx >= frameBounds.x1 && cx <= frameBounds.x2 && cy >= frameBounds.y1 && cy <= frameBounds.y2
  );
};

/**
 * Finds the smallest frame whose bounds contain the center of `objectBounds`.
 * Returns the frame ID, or undefined if no frame contains the object.
 *
 * Rules:
 * - A frame cannot parent itself (`excludeId`).
 * - When multiple frames overlap, the smallest (by area) wins.
 */
export const findContainingFrame = (
  objectBounds: IBounds,
  frames: IBoardObject[],
  excludeId?: string
): string | undefined => {
  let bestId: string | undefined;
  let bestArea = Infinity;

  for (const frame of frames) {
    if (frame.id === excludeId) continue;

    const fb = getObjectBounds(frame);
    if (!isInsideFrame(objectBounds, fb)) continue;

    const area = frame.width * frame.height;
    if (area < bestArea) {
      bestArea = area;
      bestId = frame.id;
    }
  }

  return bestId;
};

/** Returns true if the object has a valid (non-empty) parentFrameId. */
export const hasParentFrame = (obj: IBoardObject): boolean =>
  obj.parentFrameId != null && obj.parentFrameId !== '';

/**
 * Returns all direct children of a frame.
 */
export const getFrameChildren = (frameId: string, objects: IBoardObject[]): IBoardObject[] =>
  objects.filter((o) => o.parentFrameId === frameId);

/**
 * Resolves the `parentFrameId` an object should have after being dropped
 * at `objectBounds`. Returns `undefined` when the object should be top-level,
 * or a frame ID when it should be parented.
 *
 * Connectors and frames are never parented — returns `undefined` for them.
 */
export const resolveParentFrameId = (
  obj: IBoardObject,
  objectBounds: IBounds,
  allObjects: IBoardObject[]
): string | undefined => {
  if (obj.type === 'frame' || obj.type === 'connector') return undefined;

  const frames = allObjects.filter((o) => o.type === 'frame');
  return findContainingFrame(objectBounds, frames, obj.id);
};
