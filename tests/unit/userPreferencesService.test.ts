import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserPreferences,
  updateRecentBoardIds,
  toggleFavoriteBoardId,
  removeBoardIdFromPreferences,
  subscribeToUserPreferences,
} from '@/modules/sync/userPreferencesService';

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockOnSnapshot = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_fs: unknown, col: string, id: string) => ({ path: `${col}/${id}` })),
  getDoc: (ref: unknown) => mockGetDoc(ref),
  setDoc: (ref: unknown, data: unknown, opts?: unknown) => mockSetDoc(ref, data, opts),
  onSnapshot: (ref: unknown, callback: (snap: { exists: () => boolean; data: () => unknown }) => void) =>
    mockOnSnapshot(ref, callback),
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
}));

describe('userPreferencesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
  });

  describe('getUserPreferences', () => {
    it('returns default preferences when user doc does not exist', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const result = await getUserPreferences('user-1');

      expect(result).toEqual({
        recentBoardIds: [],
        favoriteBoardIds: [],
      });
    });

    it('returns default preferences when doc has no preferences field', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({}),
      });

      const result = await getUserPreferences('user-1');

      expect(result).toEqual({
        recentBoardIds: [],
        favoriteBoardIds: [],
      });
    });

    it('returns stored preferences when present', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          preferences: {
            recentBoardIds: ['b1', 'b2'],
            favoriteBoardIds: ['b1'],
          },
        }),
      });

      const result = await getUserPreferences('user-1');

      expect(result).toEqual({
        recentBoardIds: ['b1', 'b2'],
        favoriteBoardIds: ['b1'],
      });
    });

    it('returns deduped favoriteBoardIds when Firestore has duplicates', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          preferences: {
            recentBoardIds: ['b1'],
            favoriteBoardIds: ['b1', 'b1', 'b2', 'b2'],
          },
        }),
      });

      const result = await getUserPreferences('user-1');

      expect(result.favoriteBoardIds).toEqual(['b1', 'b2']);
    });
  });

  describe('updateRecentBoardIds', () => {
    it('appends new board id and trims to max 10', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          preferences: {
            recentBoardIds: ['old1', 'old2'],
            favoriteBoardIds: [],
          },
        }),
      });

      await updateRecentBoardIds('user-1', 'new-board');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          preferences: {
            recentBoardIds: ['new-board', 'old1', 'old2'],
            favoriteBoardIds: [],
          },
        },
        { merge: true }
      );
    });

    it('moves existing board to front and dedupes', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          preferences: {
            recentBoardIds: ['a', 'b', 'c'],
            favoriteBoardIds: [],
          },
        }),
      });

      await updateRecentBoardIds('user-1', 'b');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          preferences: {
            recentBoardIds: ['b', 'a', 'c'],
            favoriteBoardIds: [],
          },
        },
        { merge: true }
      );
    });

    it('trims to 10 when over max', async () => {
      const ids = Array.from({ length: 12 }, (_, i) => `board-${i}`);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          preferences: {
            recentBoardIds: ids,
            favoriteBoardIds: [],
          },
        }),
      });

      await updateRecentBoardIds('user-1', 'new-first');

      const call = mockSetDoc.mock.calls[0];
      const sentRecent = (call?.[1] as { preferences: { recentBoardIds: string[] } })?.preferences
        ?.recentBoardIds ?? [];
      expect(sentRecent).toHaveLength(10);
      expect(sentRecent[0]).toBe('new-first');
    });
  });

  describe('toggleFavoriteBoardId', () => {
    it('adds board to favorites when not present', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          preferences: {
            recentBoardIds: [],
            favoriteBoardIds: [],
          },
        }),
      });

      await toggleFavoriteBoardId('user-1', 'board-x');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          preferences: {
            recentBoardIds: [],
            favoriteBoardIds: ['board-x'],
          },
        },
        { merge: true }
      );
    });

    it('removes board from favorites when present', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          preferences: {
            recentBoardIds: [],
            favoriteBoardIds: ['board-x', 'board-y'],
          },
        }),
      });

      await toggleFavoriteBoardId('user-1', 'board-x');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          preferences: {
            recentBoardIds: [],
            favoriteBoardIds: ['board-y'],
          },
        },
        { merge: true }
      );
    });
  });

  describe('removeBoardIdFromPreferences', () => {
    it('removes board id from recentBoardIds and favoriteBoardIds', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          preferences: {
            recentBoardIds: ['b1', 'b2', 'b3'],
            favoriteBoardIds: ['b1', 'b2'],
          },
        }),
      });

      await removeBoardIdFromPreferences('user-1', 'b2');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          preferences: {
            recentBoardIds: ['b1', 'b3'],
            favoriteBoardIds: ['b1'],
          },
        },
        { merge: true }
      );
    });
  });

  describe('subscribeToUserPreferences', () => {
    it('calls callback with default prefs when doc does not exist', () => {
      mockOnSnapshot.mockImplementation((_ref: unknown, callback: (snap: { exists: () => boolean }) => void) => {
        callback({ exists: () => false });
        return vi.fn();
      });

      const cb = vi.fn();
      subscribeToUserPreferences('user-1', cb);

      expect(cb).toHaveBeenCalledWith({
        recentBoardIds: [],
        favoriteBoardIds: [],
      });
    });

    it('calls callback with stored preferences when doc exists', () => {
      mockOnSnapshot.mockImplementation(
        (_ref: unknown, callback: (snap: { exists: () => boolean; data: () => unknown }) => void) => {
          callback({
            exists: () => true,
            data: () => ({
              preferences: {
                recentBoardIds: ['r1'],
                favoriteBoardIds: ['f1'],
              },
            }),
          });
          return vi.fn();
        }
      );

      const cb = vi.fn();
      subscribeToUserPreferences('user-1', cb);

      expect(cb).toHaveBeenCalledWith({
        recentBoardIds: ['r1'],
        favoriteBoardIds: ['f1'],
      });
    });

    it('calls callback with deduped favoriteBoardIds when doc has duplicates', () => {
      mockOnSnapshot.mockImplementation(
        (_ref: unknown, callback: (snap: { exists: () => boolean; data: () => unknown }) => void) => {
          callback({
            exists: () => true,
            data: () => ({
              preferences: {
                recentBoardIds: ['r1', 'r1'],
                favoriteBoardIds: ['f1', 'f1', 'f2'],
              },
            }),
          });
          return vi.fn();
        }
      );

      const cb = vi.fn();
      subscribeToUserPreferences('user-1', cb);

      expect(cb).toHaveBeenCalledWith({
        recentBoardIds: ['r1'],
        favoriteBoardIds: ['f1', 'f2'],
      });
    });

    it('returns unsubscribe function', () => {
      const unsub = vi.fn();
      mockOnSnapshot.mockReturnValue(unsub);

      const result = subscribeToUserPreferences('user-1', vi.fn());

      expect(typeof result).toBe('function');
      result();
      expect(unsub).toHaveBeenCalledTimes(1);
    });
  });
});
