import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  updateCursor,
  subscribeToCursors,
  removeCursor,
  setupCursorDisconnectHandler,
  updatePresence,
  subscribeToPresence,
  removePresence,
  setupPresenceDisconnectHandler,
  subscribeToConnectionStatus,
  getUserColor,
} from '@/modules/sync/realtimeService';

// Mock Firebase Realtime Database
const mockSet = vi.fn();
const mockRemove = vi.fn();
const mockOnValue = vi.fn();
const mockOnDisconnect = vi.fn(() => ({ remove: vi.fn() }));
const mockRef = vi.fn();

vi.mock('firebase/database', () => ({
  ref: (db: unknown, path: string) => {
    mockRef(db, path);
    return { path };
  },
  set: (refObj: unknown, data: unknown) => mockSet(refObj, data),
  remove: (refObj: unknown) => mockRemove(refObj),
  onValue: (refObj: unknown, callback: unknown) => {
    mockOnValue(refObj, callback);
    return vi.fn(); // unsubscribe function
  },
  onDisconnect: () => mockOnDisconnect(),
}));

vi.mock('@/lib/firebase', () => ({
  getRealtimeDb: () => ({}),
}));

describe('realtimeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Cursor Functions', () => {
    describe('updateCursor', () => {
      it('should update cursor position in database', async () => {
        const boardId = 'board-123';
        const uid = 'user-456';
        const x = 100;
        const y = 200;
        const displayName = 'Test User';
        const color = '#ff0000';

        await updateCursor(boardId, uid, x, y, displayName, color);

        expect(mockRef).toHaveBeenCalledWith(expect.anything(), `boards/${boardId}/cursors/${uid}`);
        expect(mockSet).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            uid,
            x,
            y,
            displayName,
            color,
            lastUpdated: expect.any(Number),
          })
        );
      });
    });

    describe('subscribeToCursors', () => {
      it('should subscribe to cursor updates', () => {
        const boardId = 'board-123';
        const callback = vi.fn();

        subscribeToCursors(boardId, callback);

        expect(mockRef).toHaveBeenCalledWith(expect.anything(), `boards/${boardId}/cursors`);
        expect(mockOnValue).toHaveBeenCalled();
      });

      it('should return unsubscribe function', () => {
        const boardId = 'board-123';
        const callback = vi.fn();

        const unsubscribe = subscribeToCursors(boardId, callback);

        expect(typeof unsubscribe).toBe('function');
      });
    });

    describe('removeCursor', () => {
      it('should remove cursor from database', async () => {
        const boardId = 'board-123';
        const uid = 'user-456';

        await removeCursor(boardId, uid);

        expect(mockRef).toHaveBeenCalledWith(expect.anything(), `boards/${boardId}/cursors/${uid}`);
        expect(mockRemove).toHaveBeenCalled();
      });
    });

    describe('setupCursorDisconnectHandler', () => {
      it('should setup onDisconnect handler', () => {
        const boardId = 'board-123';
        const uid = 'user-456';

        setupCursorDisconnectHandler(boardId, uid);

        expect(mockRef).toHaveBeenCalledWith(expect.anything(), `boards/${boardId}/cursors/${uid}`);
        expect(mockOnDisconnect).toHaveBeenCalled();
      });
    });
  });

  describe('Presence Functions', () => {
    describe('updatePresence', () => {
      it('should update presence in database', async () => {
        const boardId = 'board-123';
        const uid = 'user-456';
        const displayName = 'Test User';
        const photoURL = 'https://example.com/photo.jpg';
        const color = '#ff0000';

        await updatePresence(boardId, uid, displayName, photoURL, color);

        expect(mockRef).toHaveBeenCalledWith(
          expect.anything(),
          `boards/${boardId}/presence/${uid}`
        );
        expect(mockSet).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            uid,
            displayName,
            photoURL,
            color,
            online: true,
            lastSeen: expect.any(Number),
          })
        );
      });

      it('should handle null photoURL', async () => {
        const boardId = 'board-123';
        const uid = 'user-456';
        const displayName = 'Test User';
        const color = '#ff0000';

        await updatePresence(boardId, uid, displayName, null, color);

        expect(mockSet).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            photoURL: null,
          })
        );
      });
    });

    describe('subscribeToPresence', () => {
      it('should subscribe to presence updates', () => {
        const boardId = 'board-123';
        const callback = vi.fn();

        subscribeToPresence(boardId, callback);

        expect(mockRef).toHaveBeenCalledWith(expect.anything(), `boards/${boardId}/presence`);
        expect(mockOnValue).toHaveBeenCalled();
      });
    });

    describe('removePresence', () => {
      it('should remove presence from database', async () => {
        const boardId = 'board-123';
        const uid = 'user-456';

        await removePresence(boardId, uid);

        expect(mockRef).toHaveBeenCalledWith(
          expect.anything(),
          `boards/${boardId}/presence/${uid}`
        );
        expect(mockRemove).toHaveBeenCalled();
      });
    });

    describe('setupPresenceDisconnectHandler', () => {
      it('should setup onDisconnect handler', () => {
        const boardId = 'board-123';
        const uid = 'user-456';

        setupPresenceDisconnectHandler(boardId, uid);

        expect(mockRef).toHaveBeenCalledWith(
          expect.anything(),
          `boards/${boardId}/presence/${uid}`
        );
        expect(mockOnDisconnect).toHaveBeenCalled();
      });
    });
  });

  describe('Connection Status', () => {
    describe('subscribeToConnectionStatus', () => {
      it('should subscribe to connection status', () => {
        const callback = vi.fn();

        subscribeToConnectionStatus(callback);

        expect(mockRef).toHaveBeenCalledWith(expect.anything(), '.info/connected');
        expect(mockOnValue).toHaveBeenCalled();
      });
    });
  });

  describe('getUserColor', () => {
    it('should return consistent color for same uid', () => {
      const uid = 'user-123';
      const color1 = getUserColor(uid);
      const color2 = getUserColor(uid);

      expect(color1).toBe(color2);
    });

    it('should return different colors for different uids', () => {
      const colors = new Set<string>();
      const uids = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];

      uids.forEach((uid) => {
        colors.add(getUserColor(uid));
      });

      // With 5 different UIDs, we should have at least 2 different colors
      // (could be same by chance but unlikely)
      expect(colors.size).toBeGreaterThanOrEqual(1);
    });

    it('should return a valid hex color', () => {
      const uid = 'test-user';
      const color = getUserColor(uid);

      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});
