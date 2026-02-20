import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { IBoardObject } from '@/types';

// Mock Firebase services
const mockFirestoreOnSnapshot = vi.fn();
const mockRealtimeOnValue = vi.fn();
const mockFirestoreSetDoc = vi.fn();
const mockFirestoreUpdateDoc = vi.fn();
const mockFirestoreDeleteDoc = vi.fn();
const mockRealtimeSet = vi.fn();
const mockRealtimeRemove = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ path: 'boards/test-board/objects' })),
  doc: vi.fn(() => ({ id: 'test-object-id' })),
  setDoc: (ref: unknown, data: unknown) => mockFirestoreSetDoc(ref, data),
  updateDoc: (ref: unknown, data: unknown) => mockFirestoreUpdateDoc(ref, data),
  deleteDoc: (ref: unknown) => mockFirestoreDeleteDoc(ref),
  onSnapshot: (query: unknown, callback: (snapshot: unknown) => void) => {
    mockFirestoreOnSnapshot(query, callback);
    return vi.fn(); // unsubscribe
  },
  query: vi.fn((ref) => ref),
  orderBy: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(),
  })),
  Timestamp: {
    now: () => ({
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
      toMillis: () => Date.now(),
    }),
  },
}));

vi.mock('firebase/database', () => ({
  ref: vi.fn(() => ({ path: 'test-path' })),
  set: (ref: unknown, data: unknown) => mockRealtimeSet(ref, data),
  remove: (ref: unknown) => mockRealtimeRemove(ref),
  onValue: (ref: unknown, callback: (snapshot: unknown) => void) => {
    mockRealtimeOnValue(ref, callback);
    return vi.fn(); // unsubscribe
  },
  onDisconnect: vi.fn(() => ({ remove: vi.fn() })),
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
  getRealtimeDb: () => ({}),
}));

describe('Sync Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Multi-user cursor synchronization', () => {
    it('should broadcast cursor updates to all subscribers', async () => {
      const { updateCursor, subscribeToCursors } = await import('@/modules/sync/realtimeService');

      const boardId = 'test-board';
      const user1 = { uid: 'user-1', displayName: 'User One', color: '#ff0000' };

      // User 2 subscribes to cursors
      const cursorCallback = vi.fn();
      subscribeToCursors(boardId, cursorCallback);

      // User 1 updates their cursor
      await updateCursor(boardId, user1.uid, 100, 200, user1.displayName, user1.color);

      // Verify the update was sent
      expect(mockRealtimeSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          uid: user1.uid,
          x: 100,
          y: 200,
          displayName: user1.displayName,
          color: user1.color,
        })
      );
    });

    it('should handle multiple cursors simultaneously', async () => {
      const { updateCursor } = await import('@/modules/sync/realtimeService');

      const boardId = 'test-board';

      // Multiple users update cursors
      await Promise.all([
        updateCursor(boardId, 'user-1', 100, 100, 'User 1', '#ff0000'),
        updateCursor(boardId, 'user-2', 200, 200, 'User 2', '#00ff00'),
        updateCursor(boardId, 'user-3', 300, 300, 'User 3', '#0000ff'),
      ]);

      // All updates should have been sent
      expect(mockRealtimeSet).toHaveBeenCalledTimes(3);
    });
  });

  describe('Multi-user presence synchronization', () => {
    it('should track user presence on a board', async () => {
      const { updatePresence, subscribeToPresence } =
        await import('@/modules/sync/realtimeService');

      const boardId = 'test-board';
      const user = {
        uid: 'user-1',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        color: '#ff0000',
      };

      // Subscribe to presence
      const presenceCallback = vi.fn();
      subscribeToPresence(boardId, presenceCallback);

      // User joins the board
      await updatePresence(boardId, user.uid, user.displayName, user.photoURL, user.color);

      // Verify presence was updated
      expect(mockRealtimeSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          uid: user.uid,
          displayName: user.displayName,
          online: true,
        })
      );
    });
  });

  describe('Object synchronization', () => {
    it('should sync object creation across users', async () => {
      const { createObject } = await import('@/modules/sync/objectService');

      const boardId = 'test-board';
      const objectParams = {
        type: 'sticky' as const,
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        fill: '#fef08a',
        text: 'Test sticky note',
        createdBy: 'user-1',
      };

      await createObject(boardId, objectParams);

      // Verify object was created
      expect(mockFirestoreSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'sticky',
          x: 100,
          y: 100,
          text: 'Test sticky note',
        })
      );
    });

    it('should sync object updates across users', async () => {
      const { updateObject } = await import('@/modules/sync/objectService');

      const boardId = 'test-board';
      const objectId = 'object-1';
      const updates = {
        x: 150,
        y: 150,
        text: 'Updated text',
      };

      await updateObject(boardId, objectId, updates);

      // Verify update was sent
      expect(mockFirestoreUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          x: 150,
          y: 150,
          text: 'Updated text',
        })
      );
    });

    it('should sync object deletion across users', async () => {
      const { deleteObject } = await import('@/modules/sync/objectService');

      const boardId = 'test-board';
      const objectId = 'object-1';

      await deleteObject(boardId, objectId);

      // Verify deletion was sent
      expect(mockFirestoreDeleteDoc).toHaveBeenCalled();
    });
  });

  describe('Conflict resolution', () => {
    it('should resolve conflicts using last-write-wins', async () => {
      const { mergeObjectUpdates } = await import('@/modules/sync/objectService');

      const localObject: IBoardObject = {
        id: 'obj-1',
        type: 'sticky',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        rotation: 0,
        fill: '#fef08a',
        text: 'Local version',
        createdBy: 'user-1',
        createdAt: { toMillis: () => 1000 } as Timestamp,
        updatedAt: { toMillis: () => 2000 } as Timestamp,
      };

      const remoteObject: IBoardObject = {
        id: 'obj-1',
        type: 'sticky',
        x: 150,
        y: 150,
        width: 200,
        height: 200,
        rotation: 0,
        fill: '#fef08a',
        text: 'Remote version',
        createdBy: 'user-1',
        createdAt: { toMillis: () => 1000 } as Timestamp,
        updatedAt: { toMillis: () => 3000 } as Timestamp, // Newer
      };

      const merged = mergeObjectUpdates(localObject, remoteObject);

      // Remote should win because it has a newer timestamp
      expect(merged.text).toBe('Remote version');
      expect(merged.x).toBe(150);
    });
  });

  describe('Rapid operations handling', () => {
    it('should handle rapid cursor updates', async () => {
      const { updateCursor } = await import('@/modules/sync/realtimeService');

      const boardId = 'test-board';
      const uid = 'user-1';

      // Simulate rapid cursor movements
      const updates = Array.from({ length: 10 }, (_, i) => ({
        x: i * 10,
        y: i * 10,
      }));

      await Promise.all(
        updates.map(({ x, y }) => updateCursor(boardId, uid, x, y, 'User', '#ff0000'))
      );

      // All updates should be processed
      expect(mockRealtimeSet).toHaveBeenCalledTimes(10);
    });

    it('should handle rapid object updates', async () => {
      const { updateObject } = await import('@/modules/sync/objectService');

      const boardId = 'test-board';
      const objectId = 'object-1';

      // Simulate rapid position updates (like dragging)
      const updates = Array.from({ length: 5 }, (_, i) => ({
        x: i * 20,
        y: i * 20,
      }));

      await Promise.all(updates.map((update) => updateObject(boardId, objectId, update)));

      // All updates should be processed
      expect(mockFirestoreUpdateDoc).toHaveBeenCalledTimes(5);
    });
  });

  describe('Connection state handling', () => {
    it('should subscribe to connection status', async () => {
      const { subscribeToConnectionStatus } = await import('@/modules/sync/realtimeService');

      const callback = vi.fn();
      subscribeToConnectionStatus(callback);

      // Verify subscription was set up
      expect(mockRealtimeOnValue).toHaveBeenCalled();
    });
  });
});
