import { describe, it, expect, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { useObjectsStore } from '@/stores/objectsStore';
import { selectFrameChildren, selectFrames } from '@/stores/objectsStore';
import type { IBoardObject } from '@/types';

const ts = Timestamp.now();

const makeObj = (overrides: Partial<IBoardObject>): IBoardObject => ({
  id: 'obj-1',
  type: 'sticky',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  fill: '#fef08a',
  createdBy: 'user-1',
  createdAt: ts,
  updatedAt: ts,
  ...overrides,
});

describe('objectsStore selectors — frame', () => {
  beforeEach(() => {
    useObjectsStore.getState().clear();
  });

  describe('selectFrameChildren', () => {
    it('returns only objects whose parentFrameId matches the given frame', () => {
      const frame = makeObj({ id: 'frame-1', type: 'frame', width: 300, height: 200 });
      const child1 = makeObj({ id: 'child-1', parentFrameId: 'frame-1' });
      const child2 = makeObj({ id: 'child-2', parentFrameId: 'frame-1' });
      const orphan = makeObj({ id: 'orphan', parentFrameId: undefined });
      const otherChild = makeObj({ id: 'other-child', parentFrameId: 'frame-2' });

      useObjectsStore.getState().setAll([frame, child1, child2, orphan, otherChild]);

      const state = useObjectsStore.getState();
      const children = selectFrameChildren('frame-1')(state);

      expect(children).toHaveLength(2);
      expect(children.map((c) => c.id).sort()).toEqual(['child-1', 'child-2']);
    });

    it('excludes objects with parentFrameId empty string when frameId is valid', () => {
      const frame = makeObj({ id: 'frame-1', type: 'frame' });
      const emptyParent = makeObj({ id: 'empty-parent', parentFrameId: '' });

      useObjectsStore.getState().setAll([frame, emptyParent]);

      const state = useObjectsStore.getState();
      expect(selectFrameChildren('frame-1')(state)).toHaveLength(0);
    });

    it('excludes objects with parentFrameId undefined', () => {
      const frame = makeObj({ id: 'frame-1', type: 'frame' });
      const noParent = makeObj({ id: 'no-parent' });

      useObjectsStore.getState().setAll([frame, noParent]);

      const state = useObjectsStore.getState();
      expect(selectFrameChildren('frame-1')(state)).toHaveLength(0);
    });

    it('returns empty array when frame has no children', () => {
      const frame = makeObj({ id: 'frame-1', type: 'frame' });
      useObjectsStore.getState().setAll([frame]);

      const state = useObjectsStore.getState();
      expect(selectFrameChildren('frame-1')(state)).toHaveLength(0);
    });

    it('returns empty array when store is empty', () => {
      const state = useObjectsStore.getState();
      expect(selectFrameChildren('frame-1')(state)).toHaveLength(0);
    });

    it('returns empty array when frameId is empty string', () => {
      const child = makeObj({ id: 'child-1', parentFrameId: 'frame-1' });
      useObjectsStore.getState().setAll([child]);

      const state = useObjectsStore.getState();
      expect(selectFrameChildren('')(state)).toHaveLength(0);
    });
  });

  describe('selectFrames', () => {
    it('returns only objects with type frame', () => {
      const frame1 = makeObj({ id: 'frame-1', type: 'frame' });
      const frame2 = makeObj({ id: 'frame-2', type: 'frame' });
      const sticky = makeObj({ id: 'sticky-1', type: 'sticky' });
      const rect = makeObj({ id: 'rect-1', type: 'rectangle' });

      useObjectsStore.getState().setAll([frame1, frame2, sticky, rect]);

      const state = useObjectsStore.getState();
      const frames = selectFrames(state);

      expect(frames).toHaveLength(2);
      expect(frames.map((f) => f.id).sort()).toEqual(['frame-1', 'frame-2']);
    });

    it('returns empty array when there are no frames', () => {
      const sticky = makeObj({ id: 'sticky-1', type: 'sticky' });
      useObjectsStore.getState().setAll([sticky]);

      const state = useObjectsStore.getState();
      expect(selectFrames(state)).toHaveLength(0);
    });

    it('returns empty array when store is empty', () => {
      const state = useObjectsStore.getState();
      expect(selectFrames(state)).toHaveLength(0);
    });
  });
});
