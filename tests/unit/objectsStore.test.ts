import { describe, it, expect, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  useObjectsStore,
  type IApplyChangesChangeset,
  selectFrameChildren,
  selectFrames,
  selectObject,
  selectAllObjects,
  selectObjectIds,
  selectFrameChildCount,
  selectConnectorsForObject,
} from '@/stores/objectsStore';
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

// ---------------------------------------------------------------------------
// Index management — setObject / updateObject / deleteObject branch coverage
// ---------------------------------------------------------------------------

describe('objectsStore — index management', () => {
  beforeEach(() => {
    useObjectsStore.getState().clear();
  });

  describe('setObject', () => {
    it('builds index on new insert (no existing object)', () => {
      const obj = makeObj({ id: 'c1', parentFrameId: 'frame-1' });
      useObjectsStore.getState().setObject(obj);

      const state = useObjectsStore.getState();
      expect(state.frameChildrenIndex.get('frame-1')?.has('c1')).toBe(true);
    });

    it('skips index rebuild when parentFrameId unchanged', () => {
      const obj = makeObj({ id: 'c1', parentFrameId: 'frame-1' });
      useObjectsStore.getState().setObject(obj);

      // Update same object with different x but same parentFrameId
      const updated = { ...obj, x: 99 };
      useObjectsStore.getState().setObject(updated);

      const state = useObjectsStore.getState();
      expect(state.objects['c1']?.x).toBe(99);
      expect(state.frameChildrenIndex.get('frame-1')?.has('c1')).toBe(true);
    });

    it('rebuilds index when parentFrameId changes', () => {
      const obj = makeObj({ id: 'c1', parentFrameId: 'frame-1' });
      useObjectsStore.getState().setObject(obj);

      const reparented = { ...obj, parentFrameId: 'frame-2' };
      useObjectsStore.getState().setObject(reparented);

      const state = useObjectsStore.getState();
      expect(state.frameChildrenIndex.get('frame-1')?.has('c1')).toBeFalsy();
      expect(state.frameChildrenIndex.get('frame-2')?.has('c1')).toBe(true);
    });

    it('builds connector index on new connector insert', () => {
      const conn = makeObj({
        id: 'conn-1',
        type: 'connector',
        fromObjectId: 'a',
        toObjectId: 'b',
      });
      useObjectsStore.getState().setObject(conn);

      const state = useObjectsStore.getState();
      expect(state.connectorsByEndpoint.get('a')?.has('conn-1')).toBe(true);
      expect(state.connectorsByEndpoint.get('b')?.has('conn-1')).toBe(true);
    });

    it('skips index rebuild when connector endpoints unchanged', () => {
      const conn = makeObj({
        id: 'conn-1',
        type: 'connector',
        fromObjectId: 'a',
        toObjectId: 'b',
      });
      useObjectsStore.getState().setObject(conn);

      // Same endpoints, different position
      const moved = { ...conn, x: 50 };
      useObjectsStore.getState().setObject(moved);

      const state = useObjectsStore.getState();
      expect(state.connectorsByEndpoint.get('a')?.has('conn-1')).toBe(true);
    });

    it('rebuilds index when connector endpoints change', () => {
      const conn = makeObj({
        id: 'conn-1',
        type: 'connector',
        fromObjectId: 'a',
        toObjectId: 'b',
      });
      useObjectsStore.getState().setObject(conn);

      const repointed = { ...conn, toObjectId: 'c' };
      useObjectsStore.getState().setObject(repointed);

      const state = useObjectsStore.getState();
      expect(state.connectorsByEndpoint.get('c')?.has('conn-1')).toBe(true);
    });
  });

  describe('setObjects (batch)', () => {
    it('skips index rebuild when no relationships change', () => {
      const a = makeObj({ id: 'a' });
      const b = makeObj({ id: 'b' });
      useObjectsStore.getState().setAll([a, b]);

      // Update with same relationships
      useObjectsStore.getState().setObjects([
        { ...a, x: 10 },
        { ...b, x: 20 },
      ]);

      const state = useObjectsStore.getState();
      expect(state.objects['a']?.x).toBe(10);
    });

    it('rebuilds index when a new object is added in batch', () => {
      const a = makeObj({ id: 'a' });
      useObjectsStore.getState().setAll([a]);

      // Add new object with parentFrameId
      const newChild = makeObj({ id: 'new', parentFrameId: 'frame-1' });
      useObjectsStore.getState().setObjects([newChild]);

      const state = useObjectsStore.getState();
      expect(state.frameChildrenIndex.get('frame-1')?.has('new')).toBe(true);
    });

    it('rebuilds index when parentFrameId changes in batch', () => {
      const child = makeObj({ id: 'c1', parentFrameId: 'frame-1' });
      useObjectsStore.getState().setAll([child]);

      useObjectsStore.getState().setObjects([{ ...child, parentFrameId: 'frame-2' }]);

      const state = useObjectsStore.getState();
      expect(state.frameChildrenIndex.get('frame-2')?.has('c1')).toBe(true);
    });

    it('rebuilds index when connector endpoints change in batch', () => {
      const conn = makeObj({
        id: 'conn-1',
        type: 'connector',
        fromObjectId: 'a',
        toObjectId: 'b',
      });
      useObjectsStore.getState().setAll([conn]);

      useObjectsStore.getState().setObjects([{ ...conn, fromObjectId: 'c' }]);

      const state = useObjectsStore.getState();
      expect(state.connectorsByEndpoint.get('c')?.has('conn-1')).toBe(true);
    });
  });

  describe('updateObject', () => {
    it('returns state unchanged when ID does not exist', () => {
      const before = useObjectsStore.getState();
      useObjectsStore.getState().updateObject('nonexistent', { x: 10 });
      const after = useObjectsStore.getState();
      expect(after.objects).toEqual(before.objects);
    });

    it('skips index rebuild on position-only update', () => {
      const obj = makeObj({ id: 'a', parentFrameId: 'frame-1' });
      useObjectsStore.getState().setAll([obj]);

      useObjectsStore.getState().updateObject('a', { x: 50, y: 50 });

      const state = useObjectsStore.getState();
      expect(state.objects['a']?.x).toBe(50);
      expect(state.frameChildrenIndex.get('frame-1')?.has('a')).toBe(true);
    });

    it('rebuilds index when parentFrameId changes via update', () => {
      const obj = makeObj({ id: 'a', parentFrameId: 'frame-1' });
      useObjectsStore.getState().setAll([obj]);

      useObjectsStore.getState().updateObject('a', { parentFrameId: 'frame-2' });

      const state = useObjectsStore.getState();
      expect(state.frameChildrenIndex.get('frame-2')?.has('a')).toBe(true);
    });

    it('rebuilds index when fromObjectId changes via update', () => {
      const conn = makeObj({
        id: 'conn-1',
        type: 'connector',
        fromObjectId: 'a',
        toObjectId: 'b',
      });
      useObjectsStore.getState().setAll([conn]);

      useObjectsStore.getState().updateObject('conn-1', { fromObjectId: 'c' });

      const state = useObjectsStore.getState();
      expect(state.connectorsByEndpoint.get('c')?.has('conn-1')).toBe(true);
    });

    it('rebuilds index when toObjectId changes via update', () => {
      const conn = makeObj({
        id: 'conn-1',
        type: 'connector',
        fromObjectId: 'a',
        toObjectId: 'b',
      });
      useObjectsStore.getState().setAll([conn]);

      useObjectsStore.getState().updateObject('conn-1', { toObjectId: 'd' });

      const state = useObjectsStore.getState();
      expect(state.connectorsByEndpoint.get('d')?.has('conn-1')).toBe(true);
    });
  });

  describe('deleteObject', () => {
    it('removes object and rebuilds indexes', () => {
      const child = makeObj({ id: 'c1', parentFrameId: 'frame-1' });
      useObjectsStore.getState().setAll([child]);

      useObjectsStore.getState().deleteObject('c1');

      const state = useObjectsStore.getState();
      expect(state.objects['c1']).toBeUndefined();
      expect(state.frameChildrenIndex.get('frame-1')?.has('c1')).toBeFalsy();
    });
  });

  describe('deleteObjects (batch)', () => {
    it('removes multiple objects and rebuilds indexes', () => {
      const a = makeObj({ id: 'a', parentFrameId: 'frame-1' });
      const b = makeObj({ id: 'b', parentFrameId: 'frame-1' });
      useObjectsStore.getState().setAll([a, b]);

      useObjectsStore.getState().deleteObjects(['a', 'b']);

      const state = useObjectsStore.getState();
      expect(Object.keys(state.objects)).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('resets everything', () => {
      useObjectsStore.getState().setAll([
        makeObj({ id: 'a', parentFrameId: 'f1' }),
      ]);

      useObjectsStore.getState().clear();

      const state = useObjectsStore.getState();
      expect(Object.keys(state.objects)).toHaveLength(0);
      expect(state.frameChildrenIndex.size).toBe(0);
      expect(state.connectorsByEndpoint.size).toBe(0);
    });
  });

  describe('applyChanges (Article XV)', () => {
    it('produces exactly one subscriber notification for mixed add/update/delete', () => {
      useObjectsStore.getState().clear();
      const a = makeObj({ id: 'a', text: 'A' });
      const b = makeObj({ id: 'b', text: 'B' });
      const c = makeObj({ id: 'c', text: 'C' });
      const d = makeObj({ id: 'd', text: 'D' });
      const e = makeObj({ id: 'e', text: 'E' });
      useObjectsStore.getState().setAll([a, b, c, d, e]);

      let subscriberCallCount = 0;
      const unsub = useObjectsStore.subscribe(() => {
        subscriberCallCount += 1;
      });

      const changeset: IApplyChangesChangeset = {
        add: [
          makeObj({ id: 'add1', text: 'Add1' }),
          makeObj({ id: 'add2', text: 'Add2' }),
          makeObj({ id: 'add3', text: 'Add3' }),
          makeObj({ id: 'add4', text: 'Add4' }),
          makeObj({ id: 'add5', text: 'Add5' }),
        ],
        update: [
          { id: 'a', updates: { text: 'A-updated' } },
          { id: 'b', updates: { text: 'B-updated' } },
          { id: 'c', updates: { text: 'C-updated' } },
        ],
        delete: ['d', 'e'],
      };

      useObjectsStore.getState().applyChanges(changeset);

      unsub();
      expect(subscriberCallCount).toBe(1);
    });

    it('applies adds, updates, and deletes correctly in one call', () => {
      useObjectsStore.getState().clear();
      const a = makeObj({ id: 'a', text: 'A' });
      const b = makeObj({ id: 'b', text: 'B' });
      useObjectsStore.getState().setAll([a, b]);

      const changeset: IApplyChangesChangeset = {
        add: [makeObj({ id: 'new1', text: 'New1' })],
        update: [{ id: 'a', updates: { text: 'A-updated', x: 10 } }],
        delete: ['b'],
      };

      useObjectsStore.getState().applyChanges(changeset);

      const state = useObjectsStore.getState();
      expect(state.objects['a']?.text).toBe('A-updated');
      expect(state.objects['a']?.x).toBe(10);
      expect(state.objects['new1']?.text).toBe('New1');
      expect(state.objects['b']).toBeUndefined();
      expect(Object.keys(state.objects).sort()).toEqual(['a', 'new1']);
    });
  });
});

// ---------------------------------------------------------------------------
// Additional selectors — branch coverage
// ---------------------------------------------------------------------------

describe('objectsStore — additional selectors', () => {
  beforeEach(() => {
    useObjectsStore.getState().clear();
  });

  describe('selectObject', () => {
    it('returns the object when it exists', () => {
      const obj = makeObj({ id: 'a' });
      useObjectsStore.getState().setAll([obj]);
      expect(selectObject('a')(useObjectsStore.getState())?.id).toBe('a');
    });

    it('returns undefined when object does not exist', () => {
      expect(selectObject('missing')(useObjectsStore.getState())).toBeUndefined();
    });
  });

  describe('selectAllObjects', () => {
    it('returns all objects as array', () => {
      useObjectsStore.getState().setAll([makeObj({ id: 'a' }), makeObj({ id: 'b' })]);
      expect(selectAllObjects(useObjectsStore.getState())).toHaveLength(2);
    });

    it('returns empty array when store is empty', () => {
      expect(selectAllObjects(useObjectsStore.getState())).toHaveLength(0);
    });
  });

  describe('selectObjectIds', () => {
    it('returns all object IDs', () => {
      useObjectsStore.getState().setAll([makeObj({ id: 'a' }), makeObj({ id: 'b' })]);
      expect(selectObjectIds(useObjectsStore.getState()).sort()).toEqual(['a', 'b']);
    });
  });

  describe('selectFrameChildCount', () => {
    it('returns 0 for empty frameId', () => {
      expect(selectFrameChildCount('')(useObjectsStore.getState())).toBe(0);
    });

    it('returns 0 for frame with no children', () => {
      useObjectsStore.getState().setAll([makeObj({ id: 'frame-1', type: 'frame' })]);
      expect(selectFrameChildCount('frame-1')(useObjectsStore.getState())).toBe(0);
    });

    it('returns correct count for frame with children', () => {
      useObjectsStore.getState().setAll([
        makeObj({ id: 'c1', parentFrameId: 'frame-1' }),
        makeObj({ id: 'c2', parentFrameId: 'frame-1' }),
        makeObj({ id: 'c3', parentFrameId: 'frame-2' }),
      ]);
      expect(selectFrameChildCount('frame-1')(useObjectsStore.getState())).toBe(2);
    });
  });

  describe('selectConnectorsForObject', () => {
    it('returns empty set for object with no connectors', () => {
      useObjectsStore.getState().setAll([makeObj({ id: 'a' })]);
      const result = selectConnectorsForObject('a')(useObjectsStore.getState());
      expect(result.size).toBe(0);
    });

    it('returns connector IDs referencing the object', () => {
      useObjectsStore.getState().setAll([
        makeObj({ id: 'a' }),
        makeObj({ id: 'b' }),
        makeObj({ id: 'conn-1', type: 'connector', fromObjectId: 'a', toObjectId: 'b' }),
        makeObj({ id: 'conn-2', type: 'connector', fromObjectId: 'a', toObjectId: 'c' }),
      ]);
      const result = selectConnectorsForObject('a')(useObjectsStore.getState());
      expect(result.size).toBe(2);
      expect(result.has('conn-1')).toBe(true);
      expect(result.has('conn-2')).toBe(true);
    });
  });
});
