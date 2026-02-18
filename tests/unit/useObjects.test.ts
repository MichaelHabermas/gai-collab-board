import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { IBoardObject } from '@/types';
import { useObjects } from '@/hooks/useObjects';

const mockCreateObject = vi.fn();
const mockUpdateObject = vi.fn();
const mockDeleteObject = vi.fn();
const mockSubscribeToObjects = vi.fn();
const mockMergeObjectUpdates = vi.fn();

vi.mock('@/modules/sync/objectService', () => ({
  createObject: (...args: unknown[]) => mockCreateObject(...args),
  updateObject: (...args: unknown[]) => mockUpdateObject(...args),
  deleteObject: (...args: unknown[]) => mockDeleteObject(...args),
  subscribeToObjects: (...args: unknown[]) => mockSubscribeToObjects(...args),
  mergeObjectUpdates: (...args: unknown[]) => mockMergeObjectUpdates(...args),
}));

const createTimestamp = (millis: number) =>
  ({
    toMillis: () => millis,
  }) as IBoardObject['updatedAt'];

const createBoardObject = (overrides: Partial<IBoardObject> = {}): IBoardObject => ({
  id: overrides.id ?? 'obj-1',
  type: overrides.type ?? 'sticky',
  x: overrides.x ?? 100,
  y: overrides.y ?? 100,
  width: overrides.width ?? 200,
  height: overrides.height ?? 200,
  rotation: overrides.rotation ?? 0,
  fill: overrides.fill ?? '#fef08a',
  text: overrides.text ?? 'hello',
  createdBy: overrides.createdBy ?? 'user-1',
  createdAt: overrides.createdAt ?? createTimestamp(1000),
  updatedAt: overrides.updatedAt ?? createTimestamp(1000),
  stroke: overrides.stroke,
  strokeWidth: overrides.strokeWidth,
  textFill: overrides.textFill,
  fontSize: overrides.fontSize,
  opacity: overrides.opacity,
  points: overrides.points,
  fromObjectId: overrides.fromObjectId,
  toObjectId: overrides.toObjectId,
  fromAnchor: overrides.fromAnchor,
  toAnchor: overrides.toAnchor,
});

const createUser = (uid: string = 'user-1'): User =>
  ({
    uid,
    email: `${uid}@example.com`,
    displayName: uid,
  }) as User;

describe('useObjects', () => {
  let subscriptionCallback: ((objects: IBoardObject[]) => void) | null = null;
  let unsubscribeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionCallback = null;
    unsubscribeSpy = vi.fn();

    mockSubscribeToObjects.mockImplementation((_boardId: string, callback: (objects: IBoardObject[]) => void) => {
      subscriptionCallback = callback;
      return unsubscribeSpy;
    });

    mockMergeObjectUpdates.mockImplementation((local: IBoardObject, remote: IBoardObject) => {
      const localMillis = local.updatedAt?.toMillis?.() ?? 0;
      const remoteMillis = remote.updatedAt?.toMillis?.() ?? 0;
      return remoteMillis > localMillis ? remote : local;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('subscribes to board objects and clears loading after first callback', () => {
    const { result, unmount } = renderHook(() =>
      useObjects({
        boardId: 'board-1',
        user: createUser(),
      })
    );

    expect(result.current.loading).toBe(true);
    expect(mockSubscribeToObjects).toHaveBeenCalledWith('board-1', expect.any(Function));

    const remoteObjects = [createBoardObject()];
    act(() => {
      subscriptionCallback?.(remoteObjects);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.objects).toEqual(remoteObjects);
    expect(result.current.error).toBe('');

    unmount();
    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('returns an error when createObject is called without board connection', async () => {
    const { result } = renderHook(() =>
      useObjects({
        boardId: null,
        user: createUser(),
      })
    );

    let createdObject: IBoardObject | null = null;
    await act(async () => {
      createdObject = await result.current.createObject({
        type: 'sticky',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        fill: '#fef08a',
        text: 'A',
      });
    });

    expect(createdObject).toBeNull();
    expect(result.current.error).toBe('Cannot create object: not connected to board');
  });

  it('rolls back optimistic update when updateObject fails', async () => {
    const baseObject = createBoardObject({ id: 'obj-update', x: 10, y: 20, updatedAt: createTimestamp(1000) });
    mockUpdateObject.mockRejectedValueOnce(new Error('update failed'));

    const { result } = renderHook(() =>
      useObjects({
        boardId: 'board-1',
        user: createUser(),
      })
    );

    act(() => {
      subscriptionCallback?.([baseObject]);
    });

    await act(async () => {
      await result.current.updateObject('obj-update', { x: 200, y: 300 });
    });

    expect(mockUpdateObject).toHaveBeenCalledWith('board-1', 'obj-update', { x: 200, y: 300 });
    expect(result.current.objects[0]?.x).toBe(10);
    expect(result.current.objects[0]?.y).toBe(20);
    expect(result.current.error).toBe('update failed');
  });

  it('rolls back optimistic delete when deleteObject fails', async () => {
    const baseObject = createBoardObject({ id: 'obj-delete' });
    mockDeleteObject.mockRejectedValueOnce(new Error('delete failed'));

    const { result } = renderHook(() =>
      useObjects({
        boardId: 'board-1',
        user: createUser(),
      })
    );

    act(() => {
      subscriptionCallback?.([baseObject]);
    });

    await act(async () => {
      await result.current.deleteObject('obj-delete');
    });

    expect(mockDeleteObject).toHaveBeenCalledWith('board-1', 'obj-delete');
    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0]?.id).toBe('obj-delete');
    expect(result.current.error).toBe('delete failed');
  });

  it('merges remote updates against pending local changes while update is in flight', async () => {
    const originalObject = createBoardObject({
      id: 'obj-merge',
      text: 'original',
      updatedAt: createTimestamp(1000),
    });
    const remoteObject = createBoardObject({
      id: 'obj-merge',
      text: 'remote',
      updatedAt: createTimestamp(3000),
    });

    let resolveUpdatePromise: (() => void) | null = null;
    mockUpdateObject.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdatePromise = resolve;
        })
    );

    const mergedObject = createBoardObject({
      id: 'obj-merge',
      text: 'merged-value',
      updatedAt: createTimestamp(4000),
    });
    mockMergeObjectUpdates.mockReturnValueOnce(mergedObject);

    const { result } = renderHook(() =>
      useObjects({
        boardId: 'board-1',
        user: createUser(),
      })
    );

    act(() => {
      subscriptionCallback?.([originalObject]);
    });

    act(() => {
      void result.current.updateObject('obj-merge', { text: 'local-edit' });
    });

    act(() => {
      subscriptionCallback?.([remoteObject]);
    });

    expect(mockMergeObjectUpdates).toHaveBeenCalledTimes(1);
    expect(result.current.objects[0]?.text).toBe('merged-value');

    if (resolveUpdatePromise) {
      resolveUpdatePromise();
    }
    await act(async () => {
      await Promise.resolve();
    });
  });
});
