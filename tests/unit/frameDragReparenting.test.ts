import { describe, it, expect, vi } from 'vitest';
import {
  findContainingFrame,
  reparentObject,
  updateDropTarget,
} from '@/canvas/drag/frameDragReparenting';
import type { IBoardObject } from '@/types';
import { useDragOffsetStore } from '@/stores/dragOffsetStore';

describe('frameDragReparenting', () => {
  const frame1: Partial<IBoardObject> = { id: 'f1', x: 0, y: 0, width: 200, height: 200 };
  const frame2: Partial<IBoardObject> = { id: 'f2', x: 10, y: 10, width: 50, height: 50 }; // smaller, inside f1
  const frames = [frame1 as IBoardObject, frame2 as IBoardObject];

  describe('findContainingFrame', () => {
    it('returns the smallest frame containing the center point', () => {
      // center is at x+w/2 = 25, y+h/2 = 25. Inside both f1 and f2, so f2 (smallest) should win.
      const result = findContainingFrame(15, 15, 20, 20, frames);
      expect(result).toBe('f2');
    });

    it('returns null if not contained in any frame', () => {
      // center is at 300, 300
      const result = findContainingFrame(290, 290, 20, 20, frames);
      expect(result).toBeNull();
    });

    it('excludes the specified frame', () => {
      // center is at 25, 25. normally f2, but excluded. Should return f1.
      const result = findContainingFrame(15, 15, 20, 20, frames, 'f2');
      expect(result).toBe('f1');
    });
  });

  describe('reparentObject', () => {
    it('calls onObjectUpdate if parent changed', () => {
      const updateSpy = vi.fn();
      reparentObject('obj1', 'newParent', 'oldParent', updateSpy);
      expect(updateSpy).toHaveBeenCalledWith('obj1', { parentFrameId: 'newParent' });
    });

    it('uses empty string for null newParentFrameId', () => {
      const updateSpy = vi.fn();
      reparentObject('obj1', null, 'oldParent', updateSpy);
      expect(updateSpy).toHaveBeenCalledWith('obj1', { parentFrameId: '' });
    });

    it('does not call onObjectUpdate if parent is unchanged', () => {
      const updateSpy = vi.fn();
      reparentObject('obj1', 'same', 'same', updateSpy);
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('updateDropTarget', () => {
    it('sets dropTargetFrameId in store and returns it', () => {
      useDragOffsetStore.getState().setDropTargetFrameId(null);
      // Wait for throttle (hacky, let's mock performance.now or just assume it works on first call)
      const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(5000);
      
      const bounds = { x: 15, y: 15, width: 20, height: 20 };
      const excludeIds = new Set<string>();
      
      const result = updateDropTarget(bounds, frames, excludeIds);
      expect(result).toBe('f2');
      expect(useDragOffsetStore.getState().dropTargetFrameId).toBe('f2');
      
      nowSpy.mockRestore();
    });
  });
});
