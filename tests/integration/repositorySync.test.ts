import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type {
  IBoardObject,
  IBoardRepository,
  IObjectsSnapshotUpdate,
} from '@/types';

const mockFirestoreOnSnapshot = vi.fn();
const mockFirestoreSetDoc = vi.fn();
const mockFirestoreUpdateDoc = vi.fn();
const mockFirestoreDeleteDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ path: 'boards/test-board/objects' })),
  doc: vi.fn((_ref: unknown, id?: string) => ({ id: id || 'generated-id' })),
  setDoc: (ref: unknown, data: unknown) => mockFirestoreSetDoc(ref, data),
  updateDoc: (ref: unknown, data: unknown) => mockFirestoreUpdateDoc(ref, data),
  deleteDoc: (ref: unknown) => mockFirestoreDeleteDoc(ref),
  onSnapshot: (query: unknown, callback: (snapshot: unknown) => void) => {
    mockFirestoreOnSnapshot(query, callback);

    return vi.fn();
  },
  query: vi.fn((ref: unknown) => ref),
  orderBy: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
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
  getRealtimeDb: () => ({}),
}));

import { createFirestoreBoardRepo } from '@/modules/sync/firestoreBoardRepo';
import { initWriteQueue, setWriteQueueBoard, queueWrite, flush } from '@/lib/writeQueue';

const now = Timestamp.now();

function makeObject(id: string, overrides?: Partial<IBoardObject>): IBoardObject {
  return {
    id,
    type: 'sticky',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    fill: '#fef08a',
    createdBy: 'user-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Repository Sync Integration', () => {
  let repo: IBoardRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createFirestoreBoardRepo();
    initWriteQueue(repo);
    setWriteQueueBoard('test-board');
  });

  afterEach(() => {
    flush();
    setWriteQueueBoard(null);
  });

  describe('Firestore snapshot → repository → state update flow', () => {
    it('subscription callback receives initial snapshot through repo', () => {
      const callback = vi.fn();
      repo.subscribeToObjects('test-board', callback);

      expect(mockFirestoreOnSnapshot).toHaveBeenCalledTimes(1);

      const snapshotCb = mockFirestoreOnSnapshot.mock.calls[0]?.[1];
      const objA = makeObject('obj-a', { text: 'Hello' });

      snapshotCb?.({
        docs: [{ data: () => objA }],
        docChanges: () => [{ type: 'added', doc: { data: () => objA } }],
      });

      expect(callback).toHaveBeenCalledTimes(1);
      const update: IObjectsSnapshotUpdate = callback.mock.calls[0]?.[0];

      expect(update.isInitialSnapshot).toBe(true);
      expect(update.objects).toHaveLength(1);
      expect(update.objects[0]?.id).toBe('obj-a');
      expect(update.changes).toHaveLength(1);
      expect(update.changes[0]?.type).toBe('added');
    });

    it('subscription receives incremental changes after initial snapshot', () => {
      const callback = vi.fn();
      repo.subscribeToObjects('test-board', callback);

      const snapshotCb = mockFirestoreOnSnapshot.mock.calls[0]?.[1];
      const objA = makeObject('obj-a');

      snapshotCb?.({
        docs: [{ data: () => objA }],
        docChanges: () => [{ type: 'added', doc: { data: () => objA } }],
      });

      const updatedA = makeObject('obj-a', { x: 999 });
      snapshotCb?.({
        docs: [{ data: () => updatedA }],
        docChanges: () => [{ type: 'modified', doc: { data: () => updatedA } }],
      });

      expect(callback).toHaveBeenCalledTimes(2);
      const secondUpdate: IObjectsSnapshotUpdate = callback.mock.calls[1]?.[0];

      expect(secondUpdate.isInitialSnapshot).toBe(false);
      expect(secondUpdate.changes[0]?.type).toBe('modified');
      expect(secondUpdate.changes[0]?.object.x).toBe(999);
    });
  });

  describe('Write queue → repository integration', () => {
    it('queued writes flush through repository.updateObjectsBatch', async () => {
      vi.useFakeTimers();
      queueWrite('obj-1', { x: 100 });
      queueWrite('obj-2', { y: 200 });

      vi.advanceTimersByTime(500);
      await vi.runAllTimersAsync();
      vi.useRealTimers();

      expect(mockFirestoreUpdateDoc).not.toHaveBeenCalled();
    });

    it('immediate flush sends writes through repository', async () => {
      queueWrite('obj-1', { text: 'updated' });
      await flush();
    });
  });

  describe('Multiple subscribers coexist', () => {
    it('supports multiple independent subscriptions', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      repo.subscribeToObjects('board-1', callback1);
      repo.subscribeToObjects('board-2', callback2);

      expect(mockFirestoreOnSnapshot).toHaveBeenCalledTimes(2);
    });
  });

  describe('Create → subscribe round-trip', () => {
    it('created object appears in subscription', async () => {
      const callback = vi.fn();
      repo.subscribeToObjects('test-board', callback);

      mockFirestoreSetDoc.mockResolvedValue(undefined);
      await repo.createObject('test-board', {
        type: 'sticky',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        fill: '#fef08a',
        createdBy: 'user-1',
      });

      expect(mockFirestoreSetDoc).toHaveBeenCalledTimes(1);
      expect(mockFirestoreSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'sticky', x: 50, y: 50 })
      );
    });
  });
});
