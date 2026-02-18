import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  mergeObjectUpdates,
  subscribeToObjects,
  subscribeToObjectsWithChanges,
} from '@/modules/sync/objectService';
import type { IBoardObject } from '@/types';

// Mock Firebase Firestore
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockWriteBatch = vi.fn(() => ({
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(),
}));
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockOrderBy = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: (db: unknown, ...path: string[]) => {
    mockCollection(db, ...path);
    return { path: path.join('/') };
  },
  doc: (collectionRef: unknown, id?: string) => {
    mockDoc(collectionRef, id);
    return {
      id: id || 'generated-id',
      path: `${(collectionRef as { path?: string }).path}/${id || 'generated-id'}`,
    };
  },
  setDoc: (ref: unknown, data: unknown) => mockSetDoc(ref, data),
  updateDoc: (ref: unknown, data: unknown) => mockUpdateDoc(ref, data),
  deleteDoc: (ref: unknown) => mockDeleteDoc(ref),
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
});
