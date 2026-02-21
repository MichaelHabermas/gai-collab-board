import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSet = vi.fn().mockResolvedValue(undefined);
const mockOnValue = vi.fn();
const mockRemove = vi.fn().mockResolvedValue(undefined);
const mockRef = vi.fn((_db: unknown, path: string) => ({ path }));

vi.mock('firebase/database', () => ({
  ref: (db: unknown, path: string) => mockRef(db, path),
  set: (ref: unknown, data: unknown) => mockSet(ref, data),
  onValue: (ref: unknown, callback: (snapshot: unknown) => void) => {
    mockOnValue(ref, callback);

    return vi.fn();
  },
  remove: (ref: unknown) => mockRemove(ref),
}));

vi.mock('@/lib/firebase', () => ({
  getRealtimeDb: () => ({}),
}));

import { createRealtimeSyncRepo } from '@/modules/sync/realtimeSyncRepo';

describe('RealtimeSyncRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('publishDragUpdate', () => {
    it('writes drag position to RTDB with correct path', () => {
      const repo = createRealtimeSyncRepo();
      vi.spyOn(Date, 'now').mockReturnValue(1000);

      repo.publishDragUpdate('board-1', 'obj-1', { x: 100, y: 200 });

      expect(mockRef).toHaveBeenCalledWith(
        expect.anything(),
        'boards/board-1/drags/obj-1'
      );
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'boards/board-1/drags/obj-1' }),
        { objectId: 'obj-1', x: 100, y: 200, timestamp: 1000 }
      );
    });

    it('throttles writes to 50ms minimum interval', () => {
      const repo = createRealtimeSyncRepo();

      repo.publishDragUpdate('board-1', 'obj-1', { x: 10, y: 10 });
      expect(mockSet).toHaveBeenCalledTimes(1);

      repo.publishDragUpdate('board-1', 'obj-1', { x: 20, y: 20 });
      expect(mockSet).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(50);
      expect(mockSet).toHaveBeenCalledTimes(2);
    });

    it('allows immediate call after throttle window expires', () => {
      const repo = createRealtimeSyncRepo();

      repo.publishDragUpdate('board-1', 'obj-1', { x: 10, y: 10 });
      expect(mockSet).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(60);

      repo.publishDragUpdate('board-1', 'obj-1', { x: 30, y: 30 });
      expect(mockSet).toHaveBeenCalledTimes(2);
    });
  });

  describe('subscribeToDragUpdates', () => {
    it('subscribes to RTDB drag path', () => {
      const repo = createRealtimeSyncRepo();
      const callback = vi.fn();

      repo.subscribeToDragUpdates('board-1', callback);

      expect(mockRef).toHaveBeenCalledWith(
        expect.anything(),
        'boards/board-1/drags'
      );
      expect(mockOnValue).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'boards/board-1/drags' }),
        expect.any(Function)
      );
    });

    it('parses drag updates from RTDB snapshot', () => {
      const repo = createRealtimeSyncRepo();
      const callback = vi.fn();
      repo.subscribeToDragUpdates('board-1', callback);

      const onValueCallback = mockOnValue.mock.calls[0]?.[1];
      onValueCallback?.({
        val: () => ({
          'obj-1': { objectId: 'obj-1', x: 100, y: 200, timestamp: 5000 },
          'obj-2': { objectId: 'obj-2', x: 300, y: 400, timestamp: 6000 },
        }),
      });

      expect(callback).toHaveBeenCalledWith([
        { objectId: 'obj-1', position: { x: 100, y: 200 }, timestamp: 5000 },
        { objectId: 'obj-2', position: { x: 300, y: 400 }, timestamp: 6000 },
      ]);
    });

    it('returns empty array for null snapshot', () => {
      const repo = createRealtimeSyncRepo();
      const callback = vi.fn();
      repo.subscribeToDragUpdates('board-1', callback);

      const onValueCallback = mockOnValue.mock.calls[0]?.[1];
      onValueCallback?.({ val: () => null });

      expect(callback).toHaveBeenCalledWith([]);
    });

    it('unsubscribe cleans up RTDB ref', () => {
      const repo = createRealtimeSyncRepo();
      const callback = vi.fn();

      const unsub = repo.subscribeToDragUpdates('board-1', callback);
      unsub();

      expect(mockRemove).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'boards/board-1/drags' })
      );
    });
  });
});
