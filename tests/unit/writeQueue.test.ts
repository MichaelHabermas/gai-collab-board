import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IBoardRepository } from '@/types';

vi.mock('@/modules/sync/objectService', () => ({}));
vi.mock('@/lib/firebase', () => ({ firestore: {} }));

import {
  initWriteQueue,
  setWriteQueueBoard,
  queueWrite,
  queueObjectUpdate,
  flush,
  pendingCount,
  getWriteQueueStats,
} from '@/lib/writeQueue';
import { useObjectsStore } from '@/stores/objectsStore';
import type { IBoardObject } from '@/types';
import { Timestamp } from 'firebase/firestore';

function createMockRepo(): IBoardRepository {
  return {
    createObject: vi.fn(),
    createObjectsBatch: vi.fn(),
    updateObject: vi.fn(),
    updateObjectsBatch: vi.fn().mockResolvedValue(undefined),
    deleteObject: vi.fn(),
    deleteObjectsBatch: vi.fn(),
    subscribeToObjects: vi.fn(),
    fetchObjectsBatch: vi.fn().mockResolvedValue([]),
    fetchObjectsPaginated: vi.fn().mockResolvedValue([]),
    subscribeToDeltaUpdates: vi.fn().mockReturnValue(() => {}),
  };
}

describe('writeQueue', () => {
  let mockRepo: IBoardRepository;

  beforeEach(() => {
    vi.useFakeTimers();
    mockRepo = createMockRepo();
    initWriteQueue(mockRepo);
    setWriteQueueBoard('board-1');
  });

  afterEach(() => {
    flush();
    setWriteQueueBoard(null);
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('queues a write and flushes after debounce', async () => {
    queueWrite('obj-1', { x: 100 });

    expect(pendingCount()).toBe(1);
    expect(mockRepo.updateObjectsBatch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(mockRepo.updateObjectsBatch).toHaveBeenCalledWith('board-1', [
      { objectId: 'obj-1', updates: { x: 100 } },
    ]);
  });

  it('coalesces multiple writes for the same object', async () => {
    queueWrite('obj-1', { x: 100 });
    queueWrite('obj-1', { y: 200 });
    queueWrite('obj-1', { fill: '#ff0000' });

    expect(pendingCount()).toBe(1);

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(mockRepo.updateObjectsBatch).toHaveBeenCalledWith('board-1', [
      { objectId: 'obj-1', updates: { x: 100, y: 200, fill: '#ff0000' } },
    ]);
  });

  it('batches writes for different objects', async () => {
    queueWrite('obj-1', { x: 100 });
    queueWrite('obj-2', { x: 200 });

    expect(pendingCount()).toBe(2);

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(mockRepo.updateObjectsBatch).toHaveBeenCalledWith(
      'board-1',
      expect.arrayContaining([
        { objectId: 'obj-1', updates: { x: 100 } },
        { objectId: 'obj-2', updates: { x: 200 } },
      ])
    );
  });

  it('flush() sends immediately without waiting for debounce', async () => {
    queueWrite('obj-1', { x: 100 });
    await flush();

    expect(mockRepo.updateObjectsBatch).toHaveBeenCalledTimes(1);
    expect(pendingCount()).toBe(0);
  });

  it('does nothing when no board is set', async () => {
    setWriteQueueBoard(null);
    queueWrite('obj-1', { x: 100 });

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(mockRepo.updateObjectsBatch).not.toHaveBeenCalled();
  });

  it('does nothing when no repo is initialized', async () => {
    initWriteQueue(null as unknown as IBoardRepository);
    queueWrite('obj-1', { x: 100 });

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(mockRepo.updateObjectsBatch).not.toHaveBeenCalled();
  });

  it('re-queues on failure and retries', async () => {
    (mockRepo.updateObjectsBatch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined);

    queueWrite('obj-1', { x: 100 });
    await flush();

    expect(pendingCount()).toBe(1);

    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    expect(mockRepo.updateObjectsBatch).toHaveBeenCalledTimes(2);
  });

  it('getWriteQueueStats returns correct stats', async () => {
    queueWrite('obj-1', { x: 100 });

    const stats = getWriteQueueStats();

    expect(stats.pending).toBe(1);
  });

  it('flushes pending writes when switching boards', () => {
    queueWrite('obj-1', { x: 100 });
    setWriteQueueBoard('board-2');

    expect(mockRepo.updateObjectsBatch).toHaveBeenCalledWith('board-1', [
      { objectId: 'obj-1', updates: { x: 100 } },
    ]);
  });
});

function createBoardObject(overrides: Partial<IBoardObject> & { id: string }): IBoardObject {
  return {
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    rotation: 0,
    fill: '#000',
    createdBy: 'u1',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

describe('queueObjectUpdate', () => {
  let mockRepo: IBoardRepository;

  beforeEach(() => {
    vi.useFakeTimers();
    mockRepo = createMockRepo();
    initWriteQueue(mockRepo);
    setWriteQueueBoard('board-1');
    useObjectsStore.getState().clear();
  });

  afterEach(() => {
    flush();
    setWriteQueueBoard(null);
    useObjectsStore.getState().clear();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('atomically updates Zustand store and enqueues write', () => {
    useObjectsStore.getState().setAll([createBoardObject({ id: 'obj-1' })]);

    queueObjectUpdate('obj-1', { x: 42 });

    // (a) Zustand updated synchronously
    expect(useObjectsStore.getState().objects['obj-1']?.x).toBe(42);
    // (b) Write queued
    expect(pendingCount()).toBe(1);
  });

  it('queued write flushes to repo after debounce', async () => {
    useObjectsStore.getState().setAll([createBoardObject({ id: 'obj-1' })]);

    queueObjectUpdate('obj-1', { fill: '#ff0000' });

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(mockRepo.updateObjectsBatch).toHaveBeenCalledWith('board-1', [
      { objectId: 'obj-1', updates: { fill: '#ff0000' } },
    ]);
  });

  it('coalesces multiple queueObjectUpdate calls', async () => {
    useObjectsStore.getState().setAll([createBoardObject({ id: 'obj-1' })]);

    queueObjectUpdate('obj-1', { x: 10 });
    queueObjectUpdate('obj-1', { y: 20 });

    expect(useObjectsStore.getState().objects['obj-1']?.x).toBe(10);
    expect(useObjectsStore.getState().objects['obj-1']?.y).toBe(20);
    expect(pendingCount()).toBe(1);

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(mockRepo.updateObjectsBatch).toHaveBeenCalledWith('board-1', [
      { objectId: 'obj-1', updates: { x: 10, y: 20 } },
    ]);
  });
});
