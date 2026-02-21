import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prefetchBoard, cancelPrefetch, consumePrefetchedObjects } from '@/lib/boardPrefetch';

// Mock the repository provider
const mockUnsubscribe = vi.fn();
const mockSubscribeToObjects = vi.fn();

vi.mock('@/lib/repositoryProvider', () => ({
  getBoardRepository: () => ({
    subscribeToObjects: mockSubscribeToObjects,
  }),
}));

describe('boardPrefetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSubscribeToObjects.mockReturnValue(mockUnsubscribe);
    // Cancel any stale cache entries from prior tests
    cancelPrefetch('board-1');
    cancelPrefetch('board-2');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('prefetchBoard', () => {
    it('subscribes to board objects on first call', () => {
      prefetchBoard('board-1');
      expect(mockSubscribeToObjects).toHaveBeenCalledWith('board-1', expect.any(Function));
    });

    it('does not subscribe again if already prefetching (cache hit)', () => {
      prefetchBoard('board-1');
      prefetchBoard('board-1');
      expect(mockSubscribeToObjects).toHaveBeenCalledTimes(1);
    });

    it('caches objects on initial snapshot callback', () => {
      prefetchBoard('board-1');
      const callback = mockSubscribeToObjects.mock.calls[0]?.[1];
      expect(callback).toBeDefined();

      const fakeObjects = [{ id: 'obj-1' }, { id: 'obj-2' }];
      callback?.({ isInitialSnapshot: true, objects: fakeObjects });

      const result = consumePrefetchedObjects('board-1');
      expect(result).toEqual(fakeObjects);
    });

    it('auto-cancels after TTL timeout', () => {
      prefetchBoard('board-1');

      // Advance past the 10s TTL
      vi.advanceTimersByTime(11_000);

      // After TTL, consume should return null
      const result = consumePrefetchedObjects('board-1');
      expect(result).toBeNull();
    });
  });

  describe('cancelPrefetch', () => {
    it('cleans up subscription and cache entry', () => {
      prefetchBoard('board-1');
      cancelPrefetch('board-1');

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(consumePrefetchedObjects('board-1')).toBeNull();
    });

    it('is a no-op for boards not in cache', () => {
      // Should not throw
      cancelPrefetch('nonexistent');
    });
  });

  describe('consumePrefetchedObjects', () => {
    it('returns null when board was never prefetched', () => {
      expect(consumePrefetchedObjects('unknown')).toBeNull();
    });

    it('returns null when prefetch started but snapshot not yet received', () => {
      prefetchBoard('board-1');
      // Don't trigger the callback — objects are still null
      expect(consumePrefetchedObjects('board-1')).toBeNull();
    });

    it('returns objects and removes cache entry (single consume)', () => {
      prefetchBoard('board-1');
      const callback = mockSubscribeToObjects.mock.calls[0]?.[1];
      expect(callback).toBeDefined();
      callback?.({ isInitialSnapshot: true, objects: [{ id: 'a' }] });

      const first = consumePrefetchedObjects('board-1');
      expect(first).toEqual([{ id: 'a' }]);

      // Second consume should return null (entry removed)
      const second = consumePrefetchedObjects('board-1');
      expect(second).toBeNull();
    });
  });
});
