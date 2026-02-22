import Konva from 'konva';
import type { IBoardObject } from '@/types';
import { useSelectionStore } from '@/stores/selectionStore';
import { useDragOffsetStore } from '@/stores/dragOffsetStore';
import { spatialIndex } from '@/stores/objectsStore';
import { queueObjectUpdate } from '@/lib/writeQueue';
import { snapPositionToGrid } from '@/lib/snapToGrid';
import { resolveParentFrameIdFromFrames } from '@/hooks/useFrameContainment';
import type { IDragConfig } from './dragBounds';

const GRID_SIZE = 20;

export function selectObject(objectId: string, metaKey: boolean): void {
  const { selectedIds, setSelectedIds, toggleSelectedId } = useSelectionStore.getState();
  if (metaKey) {
    toggleSelectedId(objectId);
  } else if (!selectedIds.has(objectId)) {
    setSelectedIds([objectId]);
  }
}

export function commitDragEnd(
  objectId: string,
  x: number,
  y: number,
  config: IDragConfig,
  objectsRecord: Record<string, IBoardObject>,
  frames: IBoardObject[],
  childIndex: Map<string, Set<string>>
): void {
  const { selectedIds } = useSelectionStore.getState();
  const draggedObj = objectsRecord[objectId];
  if (!draggedObj) return;

  const snapToGridEnabled = config.snapToGridEnabled();
  const multiSelected = selectedIds.size > 1 && selectedIds.has(objectId);

  if (multiSelected) {
    const dx = x - draggedObj.x;
    const dy = y - draggedObj.y;
    const movedIds = new Set<string>(selectedIds);

    for (const id of selectedIds) {
      const obj = objectsRecord[id];
      if (!obj) continue;

      let newX = obj.x + dx;
      let newY = obj.y + dy;
      if (snapToGridEnabled) {
        const snapped = snapPositionToGrid(newX, newY, GRID_SIZE);
        newX = snapped.x;
        newY = snapped.y;
      }

      const objUpdates: Partial<IBoardObject> = { x: newX, y: newY };

      if (obj.type === 'frame') {
        const childIds = childIndex.get(obj.id);
        if (childIds) {
          for (const childId of childIds) {
            if (movedIds.has(childId)) continue;

            const child = objectsRecord[childId];
            if (!child) continue;

            let cx = child.x + dx;
            let cy = child.y + dy;
            if (snapToGridEnabled) {
              const snapped = snapPositionToGrid(cx, cy, GRID_SIZE);
              cx = snapped.x;
              cy = snapped.y;
            }

            queueObjectUpdate(childId, { x: cx, y: cy });
            movedIds.add(childId);
          }
        }
      }

      if (obj.type !== 'frame' && obj.type !== 'connector') {
        const newBounds = {
          x1: newX,
          y1: newY,
          x2: newX + obj.width,
          y2: newY + obj.height,
        };
        const newParent = resolveParentFrameIdFromFrames(obj, newBounds, frames);
        if (newParent !== obj.parentFrameId) {
          objUpdates.parentFrameId = newParent ?? '';
        }
      }

      queueObjectUpdate(id, objUpdates);
    }

    spatialIndex.clearDragging();
    return;
  }

  // Single object drag
  let finalX = x;
  let finalY = y;
  if (snapToGridEnabled) {
    const snapped = snapPositionToGrid(x, y, GRID_SIZE);
    finalX = snapped.x;
    finalY = snapped.y;
  }

  const singleUpdates: Partial<IBoardObject> = { x: finalX, y: finalY };

  if (draggedObj.type === 'frame') {
    const dx = finalX - draggedObj.x;
    const dy = finalY - draggedObj.y;
    const childIds = childIndex.get(draggedObj.id);
    if (childIds && childIds.size > 0) {
      for (const childId of childIds) {
        const child = objectsRecord[childId];
        if (!child) continue;

        let cx = child.x + dx;
        let cy = child.y + dy;
        if (snapToGridEnabled) {
          const snapped = snapPositionToGrid(cx, cy, GRID_SIZE);
          cx = snapped.x;
          cy = snapped.y;
        }

        queueObjectUpdate(childId, { x: cx, y: cy });
      }
    }

    queueObjectUpdate(objectId, singleUpdates);
    spatialIndex.clearDragging();
    return;
  }

  if (draggedObj.type !== 'connector') {
    const newBounds = {
      x1: finalX,
      y1: finalY,
      x2: finalX + draggedObj.width,
      y2: finalY + draggedObj.height,
    };
    const newParent = resolveParentFrameIdFromFrames(draggedObj, newBounds, frames);
    if (newParent !== draggedObj.parentFrameId) {
      singleUpdates.parentFrameId = newParent ?? '';
    }

    const targetFrameId = newParent ?? draggedObj.parentFrameId;
    if (targetFrameId) {
      const frame = objectsRecord[targetFrameId];
      if (frame) {
        const PADDING = 20;
        const TITLE_HEIGHT = 32;
        const childRight = finalX + draggedObj.width + PADDING;
        const childBottom = finalY + draggedObj.height + PADDING;
        const childLeft = finalX - PADDING;
        const childTop = finalY - PADDING;
        const frameRight = frame.x + frame.width;
        const frameBottom = frame.y + frame.height;
        const frameContentTop = frame.y + TITLE_HEIGHT;

        if (
          childRight > frameRight ||
          childBottom > frameBottom ||
          childLeft < frame.x ||
          childTop < frameContentTop
        ) {
          const newFrameX = Math.min(frame.x, childLeft);
          const newFrameY = Math.min(frame.y, childTop - TITLE_HEIGHT);
          const newFrameRight = Math.max(frameRight, childRight);
          const newFrameBottom = Math.max(frameBottom, childBottom);

          queueObjectUpdate(objectId, singleUpdates);
          queueObjectUpdate(targetFrameId, {
            x: newFrameX,
            y: newFrameY,
            width: newFrameRight - newFrameX,
            height: newFrameBottom - newFrameY,
          });
          spatialIndex.clearDragging();
          return;
        }
      }
    }
  }

  queueObjectUpdate(objectId, singleUpdates);
  spatialIndex.clearDragging();
}

export function handleSelectionDragStart(
  _bounds: { x1: number; y1: number; x2: number; y2: number },
  objectsRecord: Record<string, IBoardObject>,
  childIndex: Map<string, Set<string>>
): void {
  const { selectedIds } = useSelectionStore.getState();
  const dragIds = new Set<string>(selectedIds);

  for (const sid of selectedIds) {
    const obj = objectsRecord[sid];
    if (obj?.type === 'frame') {
      const children = childIndex.get(sid);
      if (children) {
        for (const cid of children) {
          dragIds.add(cid);
        }
      }
    }
  }

  spatialIndex.setDragging(dragIds);
}

export function handleSelectionDragMove(
  e: Konva.KonvaEventObject<DragEvent>,
  initialBounds: { x1: number; y1: number; x2: number; y2: number }
): void {
  const offset = {
    dx: e.target.x() - initialBounds.x1,
    dy: e.target.y() - initialBounds.y1,
  };
  useDragOffsetStore.getState().setGroupDragOffset(offset);
}

export function handleSelectionDragEnd(
  initialBounds: { x1: number; y1: number; x2: number; y2: number },
  config: IDragConfig,
  objectsRecord: Record<string, IBoardObject>,
  frames: IBoardObject[],
  childIndex: Map<string, Set<string>>
): void {
  const { selectedIds } = useSelectionStore.getState();
  const { groupDragOffset } = useDragOffsetStore.getState();

  if (!groupDragOffset) {
    spatialIndex.clearDragging();
    return;
  }

  const { dx, dy } = groupDragOffset;
  const movedIds = new Set(selectedIds);
  const snapToGridEnabled = config.snapToGridEnabled();

  const groupNewLeft = initialBounds.x1 + dx;
  const groupNewTop = initialBounds.y1 + dy;
  const snappedGroup = snapToGridEnabled
    ? snapPositionToGrid(groupNewLeft, groupNewTop, GRID_SIZE)
    : { x: groupNewLeft, y: groupNewTop };
  const snapOffsetX = snappedGroup.x - groupNewLeft;
  const snapOffsetY = snappedGroup.y - groupNewTop;

  for (const id of selectedIds) {
    const obj = objectsRecord[id];
    if (!obj) continue;

    const newX = obj.x + dx + snapOffsetX;
    const newY = obj.y + dy + snapOffsetY;

    const objUpdates: Partial<IBoardObject> = { x: newX, y: newY };

    if (obj.type === 'frame') {
      const childIds = childIndex.get(obj.id);
      if (childIds) {
        for (const childId of childIds) {
          if (movedIds.has(childId)) continue;

          const child = objectsRecord[childId];
          if (!child) continue;

          const cx = child.x + dx + snapOffsetX;
          const cy = child.y + dy + snapOffsetY;

          queueObjectUpdate(childId, { x: cx, y: cy });
          movedIds.add(childId);
        }
      }
    }

    if (obj.type !== 'frame' && obj.type !== 'connector') {
      const newBounds = {
        x1: newX,
        y1: newY,
        x2: newX + obj.width,
        y2: newY + obj.height,
      };
      const newParent = resolveParentFrameIdFromFrames(obj, newBounds, frames);
      if (newParent !== obj.parentFrameId) {
        objUpdates.parentFrameId = newParent ?? '';
      }
    }

    queueObjectUpdate(id, objUpdates);
  }

  useDragOffsetStore.getState().setGroupDragOffset(null);
  spatialIndex.clearDragging();
}
