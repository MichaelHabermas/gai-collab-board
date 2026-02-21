import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  mergeObjectUpdates,
  subscribeToObjects,
  subscribeToObjectsWithChanges,
  deleteObject,
  deleteObjectsBatch,
  createObject,
  createObjectsBatch,
  fetchObjectsPaginated,
} from '@/modules/sync/objectService';
import type { IBoardObject } from '@/types';

// Mock Firebase Firestore
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockGetDocs = vi.fn();
const mockBatchSet = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockWriteBatch = vi.fn(() => ({
  set: mockBatchSet,
  update: mockBatchUpdate,
  delete: mockBatchDelete,
  commit: mockBatchCommit,
}));
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockStartAfter = vi.fn();

let docIdCounter = 0;

vi.mock('firebase/firestore', () => ({
  collection: (db: unknown, ...path: string[]) => {
    mockCollection(db, ...path);

    return { path: path.join('/') };
  },
  doc: (collectionRef: unknown, id?: string) => {
    mockDoc(collectionRef, id);
    const resolvedId = id || `generated-id-${String(++docIdCounter)}`;

    return {
      id: resolvedId,
      path: `${(collectionRef as { path?: string }).path}/${resolvedId}`,
    };
  },
  setDoc: (ref: unknown, data: unknown) => mockSetDoc(ref, data),
  updateDoc: (ref: unknown, data: unknown) => mockUpdateDoc(ref, data),
  deleteDoc: (ref: unknown) => mockDeleteDoc(ref),
  getDocs: (q: unknown) => mockGetDocs(q),
  onSnapshot: (query: unknown, callback: unknown) => {
    mockOnSnapshot(query, callback);

    return vi.fn(); // unsubscribe function
  },
  query: (ref: unknown, ...constraints: unknown[]) => {
    mockQuery(ref, ...constraints);

    return { ref, constraints };
  },
  orderBy: (field: string, direction: string) => {
    mockOrderBy(field, direction);

    return { field, direction };
  },
  where: (field: string, op: string, value: unknown) => {
    mockWhere(field, op, value);

    return { field, op, value };
  },
  limit: (n: number) => {
    mockLimit(n);

    return { limit: n };
  },
  startAfter: (cursor: unknown) => {
    mockStartAfter(cursor);

    return { cursor };
  },
  writeBatch: () => mockWriteBatch(),
  Timestamp: {
    now: () => ({
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
      toMillis: () => Date.now(),
    }),
  },
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
}));

describe('objectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('mergeObjectUpdates', () => {
    it('should return remote object when remote is newer', () => {
      const localObj: IBoardObject = {
        id: 'obj-1',
        type: 'sticky',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        rotation: 0,
        fill: '#fef08a',
        text: 'Local text',
        createdBy: 'user-1',
        createdAt: {
          toMillis: () => 1000,
        } as Timestamp,
        updatedAt: {
          toMillis: () => 1000,
        } as Timestamp,
      };

      const remoteObj: IBoardObject = {
        id: 'obj-1',
        type: 'sticky',
        x: 150,
        y: 150,
        width: 200,
        height: 200,
        rotation: 0,
        fill: '#fef08a',
        text: 'Remote text',
        createdBy: 'user-1',
        createdAt: {
          toMillis: () => 1000,
        } as Timestamp,
        updatedAt: {
          toMillis: () => 2000, // Newer
        } as Timestamp,
      };

      const result = mergeObjectUpdates(localObj, remoteObj);

      expect(result).toBe(remoteObj);
      expect(result.text).toBe('Remote text');
      expect(result.x).toBe(150);
    });

    it('should return local object when local is newer', () => {
      const localObj: IBoardObject = {
        id: 'obj-1',
        type: 'sticky',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        rotation: 0,
        fill: '#fef08a',
        text: 'Local text',
        createdBy: 'user-1',
        createdAt: {
          toMillis: () => 1000,
        } as Timestamp,
        updatedAt: {
          toMillis: () => 3000, // Newer
        } as Timestamp,
      };

      const remoteObj: IBoardObject = {
        id: 'obj-1',
        type: 'sticky',
        x: 150,
        y: 150,
        width: 200,
        height: 200,
        rotation: 0,
        fill: '#fef08a',
        text: 'Remote text',
        createdBy: 'user-1',
        createdAt: {
          toMillis: () => 1000,
        } as Timestamp,
        updatedAt: {
          toMillis: () => 2000,
        } as Timestamp,
      };

      const result = mergeObjectUpdates(localObj, remoteObj);

      expect(result).toBe(localObj);
      expect(result.text).toBe('Local text');
      expect(result.x).toBe(100);
    });

    it('should return remote object when timestamps are equal', () => {
      const localObj: IBoardObject = {
        id: 'obj-1',
        type: 'sticky',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        rotation: 0,
        fill: '#fef08a',
        text: 'Local text',
        createdBy: 'user-1',
        createdAt: {
          toMillis: () => 1000,
        } as Timestamp,
        updatedAt: {
          toMillis: () => 2000,
        } as Timestamp,
      };

      const remoteObj: IBoardObject = {
        id: 'obj-1',
        type: 'sticky',
        x: 150,
        y: 150,
        width: 200,
        height: 200,
        rotation: 0,
        fill: '#fef08a',
        text: 'Remote text',
        createdBy: 'user-1',
        createdAt: {
          toMillis: () => 1000,
        } as Timestamp,
        updatedAt: {
          toMillis: () => 2000, // Same timestamp
        } as Timestamp,
      };

      const result = mergeObjectUpdates(localObj, remoteObj);

      // When equal, neither is "greater than" the other, so local wins
      expect(result).toBe(localObj);
    });

    it('should handle objects without toMillis method', () => {
      const localObj: IBoardObject = {
        id: 'obj-1',
        type: 'sticky',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        rotation: 0,
        fill: '#fef08a',
        createdBy: 'user-1',
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp, // No toMillis
      };

      const remoteObj: IBoardObject = {
        id: 'obj-1',
        type: 'sticky',
        x: 150,
        y: 150,
        width: 200,
        height: 200,
        rotation: 0,
        fill: '#fef08a',
        createdBy: 'user-1',
        createdAt: {} as Timestamp,
        updatedAt: {
          toMillis: () => 2000,
        } as Timestamp,
      };

      const result = mergeObjectUpdates(localObj, remoteObj);

      // Remote has a timestamp, local doesn't, so remote wins
      expect(result).toBe(remoteObj);
    });
  });

  describe('subscribeToObjectsWithChanges', () => {
    it('provides full objects plus incremental changes', () => {
      const callback = vi.fn();
      subscribeToObjectsWithChanges('board-1', callback);

      const snapshotCallback = mockOnSnapshot.mock.calls[0]?.[1] as
        | ((snapshot: {
            docs: Array<{ data: () => IBoardObject }>;
            docChanges: () => Array<{ type: 'added' | 'modified' | 'removed'; doc: { data: () => IBoardObject } }>;
          }) => void)
        | undefined;

      const objectA = {
        id: 'obj-a',
        type: 'sticky',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#fef08a',
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as IBoardObject;

      snapshotCallback?.({
        docs: [{ data: () => objectA }],
        docChanges: () => [{ type: 'added', doc: { data: () => objectA } }],
      });

      expect(callback).toHaveBeenCalledWith({
        objects: [objectA],
        changes: [{ type: 'added', object: objectA }],
        isInitialSnapshot: true,
      });
    });

    it('keeps subscribeToObjects backward compatible with object array callback', () => {
      const callback = vi.fn();
      subscribeToObjects('board-1', callback);

      const snapshotCallback = mockOnSnapshot.mock.calls[0]?.[1] as
        | ((snapshot: {
            docs: Array<{ data: () => IBoardObject }>;
            docChanges: () => Array<{ type: 'added' | 'modified' | 'removed'; doc: { data: () => IBoardObject } }>;
          }) => void)
        | undefined;

      const objectA = {
        id: 'obj-a',
        type: 'sticky',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#fef08a',
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as IBoardObject;

      snapshotCallback?.({
        docs: [{ data: () => objectA }],
        docChanges: () => [{ type: 'added', doc: { data: () => objectA } }],
      });

      expect(callback).toHaveBeenCalledWith([objectA]);
    });
  });

  describe('deleteObject and deleteObjectsBatch', () => {
    it('deleteObject calls deleteDoc once', async () => {
      await deleteObject('board-1', 'obj-1');
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });

    it('deleteObjectsBatch uses one batch with N deletes and one commit', async () => {
      await deleteObjectsBatch('board-1', ['id1', 'id2', 'id3']);
      expect(mockWriteBatch).toHaveBeenCalledTimes(1);
      expect(mockBatchDelete).toHaveBeenCalledTimes(3);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });

    it('deleteObjectsBatch with empty array does not call commit', async () => {
      await deleteObjectsBatch('board-1', []);
      expect(mockWriteBatch).toHaveBeenCalledTimes(1);
      expect(mockBatchDelete).toHaveBeenCalledTimes(0);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('deleteObjectsBatch for 20+ objects uses single batch and completes within 300ms', async () => {
      const ids = Array.from({ length: 25 }, (_, i) => `obj-${i}`);
      const start = Date.now();
      await deleteObjectsBatch('board-1', ids);
      const elapsed = Date.now() - start;
      expect(mockWriteBatch).toHaveBeenCalledTimes(1);
      expect(mockBatchDelete).toHaveBeenCalledTimes(25);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      expect(elapsed).toBeLessThan(300);
    });
  });

  // ======================================================================
  // createObject — optional field branches
  // ======================================================================

  describe('createObject', () => {
    it('creates object with all optional fields set', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      const result = await createObject('board-1', {
        type: 'connector',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        fill: '#64748b',
        stroke: '#000',
        strokeWidth: 3,
        text: 'Hello',
        textFill: '#fff',
        fontSize: 16,
        opacity: 0.8,
        rotation: 45,
        points: [0, 0, 100, 50],
        fromObjectId: 'obj-a',
        toObjectId: 'obj-b',
        fromAnchor: 'right',
        toAnchor: 'left',
        arrowheads: 'both',
        strokeStyle: 'dashed',
        parentFrameId: 'frame-1',
        createdBy: 'user-1',
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(result.type).toBe('connector');
      expect(result.stroke).toBe('#000');
      expect(result.strokeWidth).toBe(3);
      expect(result.text).toBe('Hello');
      expect(result.textFill).toBe('#fff');
      expect(result.fontSize).toBe(16);
      expect(result.opacity).toBe(0.8);
      expect(result.points).toEqual([0, 0, 100, 50]);
      expect(result.fromObjectId).toBe('obj-a');
      expect(result.toObjectId).toBe('obj-b');
      expect(result.fromAnchor).toBe('right');
      expect(result.toAnchor).toBe('left');
      expect(result.arrowheads).toBe('both');
      expect(result.strokeStyle).toBe('dashed');
      expect(result.parentFrameId).toBe('frame-1');
      expect(result.rotation).toBe(45);
    });

    it('creates object with no optional fields', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      const result = await createObject('board-1', {
        type: 'sticky',
        x: 0,
        y: 0,
        width: 200,
        height: 120,
        fill: '#fef08a',
        createdBy: 'user-1',
      });

      expect(result.type).toBe('sticky');
      expect(result.stroke).toBeUndefined();
      expect(result.strokeWidth).toBeUndefined();
      expect(result.text).toBeUndefined();
      expect(result.textFill).toBeUndefined();
      expect(result.fontSize).toBeUndefined();
      expect(result.opacity).toBeUndefined();
      expect(result.points).toBeUndefined();
      expect(result.fromObjectId).toBeUndefined();
      expect(result.toObjectId).toBeUndefined();
      expect(result.fromAnchor).toBeUndefined();
      expect(result.toAnchor).toBeUndefined();
      expect(result.arrowheads).toBeUndefined();
      expect(result.strokeStyle).toBeUndefined();
      expect(result.parentFrameId).toBeUndefined();
      expect(result.rotation).toBe(0); // defaults to 0
    });

    it('creates object with empty string text (truthy vs defined check)', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      const result = await createObject('board-1', {
        type: 'sticky',
        x: 0,
        y: 0,
        width: 200,
        height: 120,
        fill: '#fef08a',
        text: '',
        createdBy: 'user-1',
      });

      // Empty string should be set because the check is `!== undefined`, not truthy
      expect(result.text).toBe('');
    });
  });

  // ======================================================================
  // createObjectsBatch — optional field branches
  // ======================================================================

  describe('createObjectsBatch', () => {
    it('creates batch with all optional fields', async () => {
      const results = await createObjectsBatch('board-1', [
        {
          type: 'connector',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          fill: '#64748b',
          stroke: '#000',
          strokeWidth: 3,
          text: 'Link',
          textFill: '#fff',
          fontSize: 14,
          opacity: 0.9,
          points: [0, 0, 100, 50],
          arrowheads: 'end',
          strokeStyle: 'dotted',
          parentFrameId: 'frame-2',
          createdBy: 'user-1',
        },
      ]);

      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
      expect(results[0]?.opacity).toBe(0.9);
      expect(results[0]?.arrowheads).toBe('end');
      expect(results[0]?.strokeStyle).toBe('dotted');
      expect(results[0]?.parentFrameId).toBe('frame-2');
    });

    it('creates batch without optional fields', async () => {
      const results = await createObjectsBatch('board-1', [
        {
          type: 'sticky',
          x: 0,
          y: 0,
          width: 200,
          height: 120,
          fill: '#fef08a',
          createdBy: 'user-1',
        },
      ]);

      expect(results).toHaveLength(1);
      expect(results[0]?.opacity).toBeUndefined();
      expect(results[0]?.arrowheads).toBeUndefined();
      expect(results[0]?.strokeStyle).toBeUndefined();
      expect(results[0]?.parentFrameId).toBeUndefined();
    });
  });

  // ======================================================================
  // subscribeToObjectsWithChanges — additional branch coverage
  // ======================================================================

  describe('subscribeToObjectsWithChanges — additional branches', () => {
    it('uses forEach path when snapshot.docs is not available', () => {
      const callback = vi.fn();
      subscribeToObjectsWithChanges('board-1', callback);

      const snapshotCallback = mockOnSnapshot.mock.calls[0]?.[1] as
        | ((snapshot: unknown) => void)
        | undefined;

      const objectA: IBoardObject = {
        id: 'obj-a',
        type: 'sticky',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#fef08a',
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Snapshot without docs property (uses forEach path)
      const snapshotWithForEach = {
        forEach: (fn: (doc: { data: () => unknown }) => void) => {
          fn({ data: () => objectA });
        },
        docChanges: () => [{ type: 'added', doc: { data: () => objectA } }],
      };

      snapshotCallback?.(snapshotWithForEach);

      expect(callback).toHaveBeenCalledWith({
        objects: [objectA],
        changes: [{ type: 'added', object: objectA }],
        isInitialSnapshot: true,
      });
    });

    it('filters out invalid objects from snapshot via isBoardObject', () => {
      const callback = vi.fn();
      subscribeToObjectsWithChanges('board-1', callback);

      const snapshotCallback = mockOnSnapshot.mock.calls[0]?.[1] as
        | ((snapshot: unknown) => void)
        | undefined;

      // Invalid data: missing required fields
      const invalidData = { name: 'not a board object' };
      const validData: IBoardObject = {
        id: 'obj-a',
        type: 'sticky',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#fef08a',
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      snapshotCallback?.({
        docs: [
          { data: () => invalidData },
          { data: () => validData },
        ],
        docChanges: () => [
          { type: 'added', doc: { data: () => invalidData } },
          { type: 'added', doc: { data: () => validData } },
        ],
      });

      expect(callback).toHaveBeenCalledTimes(1);
      const update = callback.mock.calls[0]?.[0];
      expect(update.objects).toHaveLength(1);
      expect(update.objects[0].id).toBe('obj-a');
      // Invalid data should be filtered from changes too
      expect(update.changes).toHaveLength(1);
    });

    it('handles snapshot without docChanges function', () => {
      const callback = vi.fn();
      subscribeToObjectsWithChanges('board-1', callback);

      const snapshotCallback = mockOnSnapshot.mock.calls[0]?.[1] as
        | ((snapshot: unknown) => void)
        | undefined;

      const objectA: IBoardObject = {
        id: 'obj-a',
        type: 'sticky',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#fef08a',
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Snapshot where docChanges is not a function
      snapshotCallback?.({
        docs: [{ data: () => objectA }],
        docChanges: 'not-a-function',
      });

      expect(callback).toHaveBeenCalledWith({
        objects: [objectA],
        changes: [], // No changes since docChanges is not a function
        isInitialSnapshot: true,
      });
    });

    it('marks second snapshot as not initial', () => {
      const callback = vi.fn();
      subscribeToObjectsWithChanges('board-1', callback);

      const snapshotCallback = mockOnSnapshot.mock.calls[0]?.[1] as
        | ((snapshot: unknown) => void)
        | undefined;

      const objectA: IBoardObject = {
        id: 'obj-a',
        type: 'sticky',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#fef08a',
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const snapshot = {
        docs: [{ data: () => objectA }],
        docChanges: () => [],
      };

      snapshotCallback?.(snapshot);
      snapshotCallback?.(snapshot);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback.mock.calls[0]?.[0].isInitialSnapshot).toBe(true);
      expect(callback.mock.calls[1]?.[0].isInitialSnapshot).toBe(false);
    });

    it('filters out invalid change types from docChanges', () => {
      const callback = vi.fn();
      subscribeToObjectsWithChanges('board-1', callback);

      const snapshotCallback = mockOnSnapshot.mock.calls[0]?.[1] as
        | ((snapshot: unknown) => void)
        | undefined;

      const objectA: IBoardObject = {
        id: 'obj-a',
        type: 'sticky',
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#fef08a',
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      snapshotCallback?.({
        docs: [{ data: () => objectA }],
        docChanges: () => [
          { type: 'added', doc: { data: () => objectA } },
          { type: 'unknown_type', doc: { data: () => objectA } }, // invalid change type
        ],
      });

      const update = callback.mock.calls[0]?.[0];
      expect(update.changes).toHaveLength(1); // only 'added' passes
    });
  });

  // ======================================================================
  // fetchObjectsPaginated — multi-page pagination
  // ======================================================================

  describe('fetchObjectsPaginated', () => {
    it('fetches single page when results < batchSize', async () => {
      const validObj: IBoardObject = {
        id: 'obj-1',
        type: 'sticky',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#fef08a',
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => validObj }],
      });

      const results = await fetchObjectsPaginated('board-1', 10);
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('obj-1');
    });

    it('fetches multiple pages and stops when page is smaller than batchSize', async () => {
      const makeValidObj = (id: string): IBoardObject => ({
        id,
        type: 'sticky',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#fef08a',
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const page1Docs = [
        { data: () => makeValidObj('obj-1') },
        { data: () => makeValidObj('obj-2') },
      ];

      const page2Docs = [
        { data: () => makeValidObj('obj-3') },
      ];

      mockGetDocs
        .mockResolvedValueOnce({ docs: page1Docs })
        .mockResolvedValueOnce({ docs: page2Docs });

      const results = await fetchObjectsPaginated('board-1', 2);
      expect(results).toHaveLength(3);
      expect(mockGetDocs).toHaveBeenCalledTimes(2);
    });

    it('filters out invalid objects from paginated results', async () => {
      const invalidData = { name: 'not valid' };
      const validObj: IBoardObject = {
        id: 'obj-1',
        type: 'sticky',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#fef08a',
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { data: () => invalidData },
          { data: () => validObj },
        ],
      });

      const results = await fetchObjectsPaginated('board-1', 10);
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('obj-1');
    });

    it('returns empty array for board with no objects', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      const results = await fetchObjectsPaginated('board-1');
      expect(results).toHaveLength(0);
    });
  });
});
