/**
 * Frame containment: determines parent-child relationships between objects and frames.
 *
 * Coordinate system:
 * - All positions are in world (canvas) space, not screen space.
 * - `IBounds { x1, y1, x2, y2 }` represents axis-aligned bounding boxes.
 * - Containment uses **center-point** check: an object belongs to a frame if
 *   its center `((x1+x2)/2, (y1+y2)/2)` falls inside the frame's bounds.
 *
 * Parenting model:
 * - Each `IBoardObject` has an optional `parentFrameId` field.
 * - Only one level of nesting: frames cannot be nested inside other frames.
 * - Connectors are never parented (they float independently).
 * - When multiple frames overlap, the **smallest by area** wins (most specific container).
 * - The `objectsStore` maintains a `frameChildrenIndex: Map<string, Set<string>>`
 *   for O(1) child lookups, updated automatically on every mutation.
 */
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
 * Returns the bounding box of all direct children of a frame,
 * or null if the frame has no children.
 */
export const getChildrenBounds = (
  frameId: string,
  allObjects: IBoardObject[]
): { x: number; y: number; width: number; height: number } | null => {
  const children = getFrameChildren(frameId, allObjects);
  if (children.length === 0) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const child of children) {
    const bounds = getObjectBounds(child);
    if (bounds.x1 < minX) minX = bounds.x1;

    if (bounds.y1 < minY) minY = bounds.y1;

    if (bounds.x2 > maxX) maxX = bounds.x2;

    if (bounds.y2 > maxY) maxY = bounds.y2;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

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

/**
 * Same as `resolveParentFrameId` but takes a pre-filtered frames array.
 * Use this in hot loops where the frames list is computed once outside the loop
 * to avoid O(n) `allObjects.filter(type=frame)` on every call.
 */
export const resolveParentFrameIdFromFrames = (
  obj: IBoardObject,
  objectBounds: IBounds,
  frames: IBoardObject[]
): string | undefined => {
  if (obj.type === 'frame' || obj.type === 'connector') return undefined;

  return findContainingFrame(objectBounds, frames, obj.id);
};
