import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  selectObject,
  commitDragEnd,
  handleSelectionDragStart,
  handleSelectionDragMove,
  handleSelectionDragEnd,
} from '@/canvas/drag/dragCommit';
import { useSelectionStore } from '@/stores/selectionStore';
import { useDragOffsetStore } from '@/stores/dragOffsetStore';
import { spatialIndex } from '@/stores/objectsStore';
import * as writeQueue from '@/lib/writeQueue';
import type { IBoardObject } from '@/types';
import Konva from 'konva';

vi.mock('@/lib/writeQueue', () => ({
  queueObjectUpdate: vi.fn(),
}));

describe('dragCommit', () => {
  const objectsRecord: Record<string, IBoardObject> = {
    obj1: {
      id: 'obj1',
      type: 'rectangle',
      x: 10,
      y: 10,
      width: 50,
      height: 50,
    } as IBoardObject,
    obj2: {
      id: 'obj2',
      type: 'circle',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    } as IBoardObject,
    frame1: {
      id: 'frame1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
    } as IBoardObject,
  };

  const frames = [objectsRecord.frame1 as IBoardObject];
  const childIndex = new Map<string, Set<string>>();

  beforeEach(() => {
    vi.clearAllMocks();
    useSelectionStore.getState().clearSelection();
    useDragOffsetStore.getState().clearDragState();
    spatialIndex.clearDragging();
  });

  describe('selectObject', () => {
    it('sets selectedIds to just the object if not metaKey', () => {
      selectObject('obj1', false);
      expect(Array.from(useSelectionStore.getState().selectedIds)).toEqual(['obj1']);
    });

    it('toggles selectedIds if metaKey is true', () => {
      useSelectionStore.getState().setSelectedIds(['obj1']);
      selectObject('obj2', true);
      expect(Array.from(useSelectionStore.getState().selectedIds).sort()).toEqual(
        ['obj1', 'obj2'].sort()
      );
      selectObject('obj1', true);
      expect(Array.from(useSelectionStore.getState().selectedIds)).toEqual(['obj2']);
    });
  });

  describe('commitDragEnd', () => {
    it('queues updates for single object drag', () => {
      const config = { snapToGridEnabled: () => false };
      commitDragEnd('obj1', 20, 20, config, objectsRecord, frames, childIndex);

      expect(writeQueue.queueObjectUpdate).toHaveBeenCalledWith('obj1', {
        x: 20,
        y: 20,
        parentFrameId: 'frame1', // 20, 20 is inside frame1
      });
      // We know clearDragging is called because we spy on it or spatialIndex handles it
    });

    it('queues updates for multi object drag', () => {
      useSelectionStore.getState().setSelectedIds(['obj1', 'obj2']);
      const config = { snapToGridEnabled: () => false };
      
      // obj1 dragged to (20, 20), dx=10, dy=10
      commitDragEnd('obj1', 20, 20, config, objectsRecord, frames, childIndex);

      expect(writeQueue.queueObjectUpdate).toHaveBeenCalledWith('obj1', {
        x: 20,
        y: 20,
        parentFrameId: 'frame1',
      });
      expect(writeQueue.queueObjectUpdate).toHaveBeenCalledWith('obj2', {
        x: 110,
        y: 110,
        parentFrameId: 'frame1',
      });
    });
  });

  describe('handleSelectionDragStart/Move/End', () => {
    it('handles the full lifecycle', () => {
      useSelectionStore.getState().setSelectedIds(['obj1', 'obj2']);
      const bounds = { x1: 10, y1: 10, x2: 150, y2: 150 };

      // Start
      const setDraggingSpy = vi.spyOn(spatialIndex, 'setDragging');
      handleSelectionDragStart(bounds, objectsRecord, childIndex);
      expect(setDraggingSpy).toHaveBeenCalled();

      // Move
      const moveEvent = {
        target: { x: () => 20, y: () => 30 } as unknown as Konva.Node,
      } as Konva.KonvaEventObject<DragEvent>;
      handleSelectionDragMove(moveEvent, bounds);
      expect(useDragOffsetStore.getState().groupDragOffset).toEqual({ dx: 10, dy: 20 });

      // End
      const config = { snapToGridEnabled: () => false };
      handleSelectionDragEnd(bounds, config, objectsRecord, frames, childIndex);

      expect(writeQueue.queueObjectUpdate).toHaveBeenCalledWith('obj1', {
        x: 20,
        y: 30,
        parentFrameId: 'frame1',
      });
      expect(writeQueue.queueObjectUpdate).toHaveBeenCalledWith('obj2', {
        x: 110,
        y: 120,
        parentFrameId: 'frame1',
      });
      expect(useDragOffsetStore.getState().groupDragOffset).toBeNull();
      // Test clears dragging implicitly via handleSelectionDragEnd
    });
  });
});
