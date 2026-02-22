import type { IBoardObject } from '@/types';
import { useDragOffsetStore } from '@/stores/dragOffsetStore';

let lastDropTargetCheck = 0;

export function findContainingFrame(
  x: number,
  y: number,
  width: number,
  height: number,
  frames: IBoardObject[],
  excludeId?: string
): string | null {
  const cx = x + width / 2;
  const cy = y + height / 2;

  let bestId: string | null = null;
  let bestArea = Infinity;

  for (const frame of frames) {
    if (frame.id === excludeId) continue;

    if (
      cx >= frame.x &&
      cx <= frame.x + frame.width &&
      cy >= frame.y &&
      cy <= frame.y + frame.height
    ) {
      const area = frame.width * frame.height;
      if (area < bestArea) {
        bestArea = area;
        bestId = frame.id;
      }
    }
  }

  return bestId;
}

export function reparentObject(
  objectId: string,
  newParentFrameId: string | null,
  oldParentFrameId: string | null,
  onObjectUpdate: (id: string, updates: Partial<IBoardObject>) => void
): void {
  if (newParentFrameId !== oldParentFrameId) {
    onObjectUpdate(objectId, { parentFrameId: newParentFrameId ?? '' });
  }
}

export function updateDropTarget(
  draggedBounds: { x: number; y: number; width: number; height: number },
  frames: IBoardObject[],
  excludeIds: Set<string>
): string | null {
  const now = performance.now();
  if (now - lastDropTargetCheck < 100) {
    return useDragOffsetStore.getState().dropTargetFrameId;
  }

  lastDropTargetCheck = now;

  let bestId: string | null = null;
  let bestArea = Infinity;

  const cx = draggedBounds.x + draggedBounds.width / 2;
  const cy = draggedBounds.y + draggedBounds.height / 2;

  for (const frame of frames) {
    if (excludeIds.has(frame.id)) continue;

    if (
      cx >= frame.x &&
      cx <= frame.x + frame.width &&
      cy >= frame.y &&
      cy <= frame.y + frame.height
    ) {
      const area = frame.width * frame.height;
      if (area < bestArea) {
        bestArea = area;
        bestId = frame.id;
      }
    }
  }

  const currentDropTarget = useDragOffsetStore.getState().dropTargetFrameId;
  if (currentDropTarget !== bestId) {
    useDragOffsetStore.getState().setDropTargetFrameId(bestId);
  }

  return bestId;
}
