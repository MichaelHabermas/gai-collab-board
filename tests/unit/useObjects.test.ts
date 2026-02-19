import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { IBoardObject } from '@/types';
import { useObjects } from '@/hooks/useObjects';

const mockCreateObject = vi.fn();
const mockUpdateObject = vi.fn();
const mockUpdateObjectsBatch = vi.fn();
const mockDeleteObject = vi.fn();
const mockDeleteObjectsBatch = vi.fn();
const mockSubscribeToObjectsWithChanges = vi.fn();
const mockMergeObjectUpdates = vi.fn();

vi.mock('@/modules/sync/objectService', () => ({
  createObject: (...args: unknown[]) => mockCreateObject(...args),
  updateObject: (...args: unknown[]) => mockUpdateObject(...args),
  updateObjectsBatch: (...args: unknown[]) => mockUpdateObjectsBatch(...args),
  deleteObject: (...args: unknown[]) => mockDeleteObject(...args),
  deleteObjectsBatch: (...args: unknown[]) => mockDeleteObjectsBatch(...args),
  subscribeToObjectsWithChanges: (...args: unknown[]) => mockSubscribeToObjectsWithChanges(...args),
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
  let subscriptionCallback:
    | ((update: {
        objects: IBoardObject[];
        changes: Array<{ type: 'added' | 'modified' | 'removed'; object: IBoardObject }>;
        isInitialSnapshot: boolean;
      }) => void)
    | null = null;
  let unsubscribeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionCallback = null;
    unsubscribeSpy = vi.fn();

    mockSubscribeToObjectsWithChanges.mockImplementation(
      (
        _boardId: string,
        callback: (update: {
          objects: IBoardObject[];
          changes: Array<{ type: 'added' | 'modified' | 'removed'; object: IBoardObject }>;
          isInitialSnapshot: boolean;
        }) => void
      ) => {
        subscriptionCallback = callback;
        return unsubscribeSpy;
      }
    );

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
    expect(mockSubscribeToObjectsWithChanges).toHaveBeenCalledWith('board-1', expect.any(Function));

    const remoteObjects = [createBoardObject()];
    act(() => {
      subscriptionCallback?.({
        objects: remoteObjects,
        changes: [{ type: 'added', object: remoteObjects[0] as IBoardObject }],
        isInitialSnapshot: true,
      });
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
      subscriptionCallback?.({
        objects: [baseObject],
        changes: [{ type: 'added', object: baseObject }],
        isInitialSnapshot: true,
      });
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
      subscriptionCallback?.({
        objects: [baseObject],
        changes: [{ type: 'added', object: baseObject }],
        isInitialSnapshot: true,
      });
    });

    await act(async () => {
      await result.current.deleteObject('obj-delete');
    });

    expect(mockDeleteObject).toHaveBeenCalledWith('board-1', 'obj-delete');
    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0]?.id).toBe('obj-delete');
    expect(result.current.error).toBe('delete failed');
  });

  it('updateObjects calls updateObjectsBatch once and applies optimistic updates', async () => {
    const objA = createBoardObject({ id: 'a', x: 10, y: 20 });
    const objB = createBoardObject({ id: 'b', x: 100, y: 100 });
    mockUpdateObjectsBatch.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useObjects({
        boardId: 'board-1',
        user: createUser(),
      })
    );

    act(() => {
      subscriptionCallback?.({
        objects: [objA, objB],
        changes: [
          { type: 'added', object: objA },
          { type: 'added', object: objB },
        ],
        isInitialSnapshot: true,
      });
    });

    await act(async () => {
      await result.current.updateObjects([
        { objectId: 'a', updates: { x: 50, y: 60 } },
        { objectId: 'b', updates: { x: 200, y: 200 } },
      ]);
    });

    expect(mockUpdateObjectsBatch).toHaveBeenCalledTimes(1);
    expect(mockUpdateObjectsBatch).toHaveBeenCalledWith('board-1', [
      { objectId: 'a', updates: { x: 50, y: 60 } },
      { objectId: 'b', updates: { x: 200, y: 200 } },
    ]);
    expect(result.current.objects.find((o) => o.id === 'a')).toMatchObject({ x: 50, y: 60 });
    expect(result.current.objects.find((o) => o.id === 'b')).toMatchObject({ x: 200, y: 200 });
  });

  it('rolls back optimistic update when updateObjectsBatch fails', async () => {
    const objA = createBoardObject({ id: 'a', x: 10, y: 20 });
    const objB = createBoardObject({ id: 'b', x: 100, y: 100 });
    mockUpdateObjectsBatch.mockRejectedValueOnce(new Error('batch failed'));

    const { result } = renderHook(() =>
      useObjects({
        boardId: 'board-1',
        user: createUser(),
      })
    );

    act(() => {
      subscriptionCallback?.({
        objects: [objA, objB],
        changes: [
          { type: 'added', object: objA },
          { type: 'added', object: objB },
        ],
        isInitialSnapshot: true,
      });
    });

    await act(async () => {
      await result.current.updateObjects([
        { objectId: 'a', updates: { x: 50, y: 60 } },
        { objectId: 'b', updates: { x: 200, y: 200 } },
      ]);
    });

    expect(mockUpdateObjectsBatch).toHaveBeenCalledWith('board-1', [
      { objectId: 'a', updates: { x: 50, y: 60 } },
      { objectId: 'b', updates: { x: 200, y: 200 } },
    ]);
    expect(result.current.objects.find((o) => o.id === 'a')).toMatchObject({ x: 10, y: 20 });
    expect(result.current.objects.find((o) => o.id === 'b')).toMatchObject({ x: 100, y: 100 });
    expect(result.current.error).toBe('batch failed');
  });

  it('deleteObjects calls deleteObjectsBatch once with boardId and all ids', async () => {
    const objA = createBoardObject({ id: 'a' });
    const objB = createBoardObject({ id: 'b' });
    mockDeleteObjectsBatch.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useObjects({
        boardId: 'board-1',
        user: createUser(),
      })
    );

    act(() => {
      subscriptionCallback?.({
        objects: [objA, objB],
        changes: [
          { type: 'added', object: objA },
          { type: 'added', object: objB },
        ],
        isInitialSnapshot: true,
      });
    });

    await act(async () => {
      await result.current.deleteObjects(['a', 'b']);
    });

    expect(mockDeleteObjectsBatch).toHaveBeenCalledTimes(1);
    expect(mockDeleteObjectsBatch).toHaveBeenCalledWith('board-1', ['a', 'b']);
    expect(result.current.objects).toHaveLength(0);
    expect(mockDeleteObject).not.toHaveBeenCalled();
  });

  it('on deleteObjectsBatch failure objects remain unchanged and error is set', async () => {
    const objA = createBoardObject({ id: 'a' });
    const objB = createBoardObject({ id: 'b' });
    mockDeleteObjectsBatch.mockRejectedValueOnce(new Error('batch failed'));

    const { result } = renderHook(() =>
      useObjects({
        boardId: 'board-1',
        user: createUser(),
      })
    );

    act(() => {
      subscriptionCallback?.({
        objects: [objA, objB],
        changes: [
          { type: 'added', object: objA },
          { type: 'added', object: objB },
        ],
        isInitialSnapshot: true,
      });
    });

    await act(async () => {
      await result.current.deleteObjects(['a', 'b']);
    });

    expect(mockDeleteObjectsBatch).toHaveBeenCalledWith('board-1', ['a', 'b']);
    expect(result.current.objects).toHaveLength(2);
    expect(result.current.error).toBe('batch failed');
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

    let resolveUpdatePromise: () => void = () => undefined;
    mockUpdateObject.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdatePromise = () => {
            resolve();
          };
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
      subscriptionCallback?.({
        objects: [originalObject],
        changes: [{ type: 'added', object: originalObject }],
        isInitialSnapshot: true,
      });
    });

    act(() => {
      void result.current.updateObject('obj-merge', { text: 'local-edit' });
    });

    act(() => {
      subscriptionCallback?.({
        objects: [remoteObject],
        changes: [{ type: 'modified', object: remoteObject }],
        isInitialSnapshot: false,
      });
    });

    expect(mockMergeObjectUpdates).toHaveBeenCalledTimes(1);
    expect(result.current.objects[0]?.text).toBe('merged-value');

    resolveUpdatePromise();
    await act(async () => {
      await Promise.resolve();
    });
  });

  it('keeps object references stable when a snapshot has no changes', () => {
    const baseObject = createBoardObject({ id: 'stable-1', updatedAt: createTimestamp(1000) });

    const { result } = renderHook(() =>
      useObjects({
        boardId: 'board-1',
        user: createUser(),
      })
    );

    act(() => {
      subscriptionCallback?.({
        objects: [baseObject],
        changes: [{ type: 'added', object: baseObject }],
        isInitialSnapshot: true,
      });
    });

    const firstReference = result.current.objects[0];
    expect(firstReference).toBeDefined();

    const freshSnapshotObject = createBoardObject({
      id: 'stable-1',
      updatedAt: createTimestamp(1000),
      text: 'same-version',
    });
    act(() => {
      subscriptionCallback?.({
        objects: [freshSnapshotObject],
        changes: [],
        isInitialSnapshot: false,
      });
    });

    expect(result.current.objects[0]).toBe(firstReference);
  });

  it('updates only changed objects for incremental snapshot changes', () => {
    const objectA = createBoardObject({ id: 'obj-a', text: 'A', updatedAt: createTimestamp(1000) });
    const objectB = createBoardObject({ id: 'obj-b', text: 'B', updatedAt: createTimestamp(1000) });

    const { result } = renderHook(() =>
      useObjects({
        boardId: 'board-1',
        user: createUser(),
      })
    );

    act(() => {
      subscriptionCallback?.({
        objects: [objectA, objectB],
        changes: [
          { type: 'added', object: objectA },
          { type: 'added', object: objectB },
        ],
        isInitialSnapshot: true,
      });
    });

    const firstA = result.current.objects[0];
    const firstB = result.current.objects[1];

    const updatedB = createBoardObject({ id: 'obj-b', text: 'B2', updatedAt: createTimestamp(2000) });
    act(() => {
      subscriptionCallback?.({
        objects: [objectA, updatedB],
        changes: [{ type: 'modified', object: updatedB }],
        isInitialSnapshot: false,
      });
    });

    expect(result.current.objects[0]).toBe(firstA);
    expect(result.current.objects[1]).not.toBe(firstB);
    expect(result.current.objects[1]?.text).toBe('B2');
  });
});

// ─── Group drag: same delta applied via single batch write ───────────────────

describe('useObjects – updateObjects for group drag', () => {
  let subscriptionCallback:
    | ((update: {
        objects: IBoardObject[];
        changes: Array<{ type: 'added' | 'modified' | 'removed'; object: IBoardObject }>;
        isInitialSnapshot: boolean;
      }) => void)
    | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionCallback = null;
    const unsubSpy = vi.fn();
    mockSubscribeToObjectsWithChanges.mockImplementation(
      (
        _boardId: string,
        cb: (update: {
          objects: IBoardObject[];
          changes: Array<{ type: 'added' | 'modified' | 'removed'; object: IBoardObject }>;
          isInitialSnapshot: boolean;
        }) => void
      ) => {
        subscriptionCallback = cb;
        return unsubSpy;
      }
    );
    mockUpdateObjectsBatch.mockResolvedValue(undefined);
  });

  it('moving 2+ selected objects applies same delta to all and uses one batch write', async () => {
    const objA = createBoardObject({ id: 'a', x: 10, y: 20 });
    const objB = createBoardObject({ id: 'b', x: 50, y: 80 });
    const { result } = renderHook(() =>
      useObjects({ boardId: 'board-1', user: createUser() })
    );

    act(() => {
      subscriptionCallback?.({
        objects: [objA, objB],
        changes: [
          { type: 'added', object: objA },
          { type: 'added', object: objB },
        ],
        isInitialSnapshot: true,
      });
    });

    // Simulate dragging obj A from (10,20) to (30,40) → delta (+20, +20)
    const dx = 20;
    const dy = 20;
    await act(async () => {
      await result.current.updateObjects([
        { objectId: 'a', updates: { x: objA.x + dx, y: objA.y + dy } },
        { objectId: 'b', updates: { x: objB.x + dx, y: objB.y + dy } },
      ]);
    });

    // Single batch write, not two separate writes
    expect(mockUpdateObjectsBatch).toHaveBeenCalledTimes(1);
    expect(mockUpdateObjectsBatch).toHaveBeenCalledWith('board-1', [
      { objectId: 'a', updates: { x: 30, y: 40 } },
      { objectId: 'b', updates: { x: 70, y: 100 } },
    ]);
    // Optimistic state reflects the delta
    expect(result.current.objects.find((o) => o.id === 'a')).toMatchObject({ x: 30, y: 40 });
    expect(result.current.objects.find((o) => o.id === 'b')).toMatchObject({ x: 70, y: 100 });
  });

  it('batch delete of 50+ objects calls deleteObjectsBatch once (not per-object)', async () => {
    const ids = Array.from({ length: 50 }, (_, i) => `obj-bulk-${i}`);
    const objects = ids.map((id) => createBoardObject({ id }));
    mockDeleteObjectsBatch.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useObjects({ boardId: 'board-1', user: createUser() })
    );

    act(() => {
      subscriptionCallback?.({
        objects,
        changes: objects.map((o) => ({ type: 'added' as const, object: o })),
        isInitialSnapshot: true,
      });
    });

    await act(async () => {
      await result.current.deleteObjects(ids);
    });

    expect(mockDeleteObjectsBatch).toHaveBeenCalledTimes(1);
    expect(mockDeleteObjectsBatch).toHaveBeenCalledWith('board-1', ids);
    expect(mockDeleteObject).not.toHaveBeenCalled();
    expect(result.current.objects).toHaveLength(0);
  });

  it('batch delete updates state only after deleteObjectsBatch resolves', async () => {
    const objA = createBoardObject({ id: 'a' });
    const objB = createBoardObject({ id: 'b' });
    let resolveBatch: () => void = () => undefined;
    mockDeleteObjectsBatch.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveBatch = resolve;
        })
    );

    const { result } = renderHook(() =>
      useObjects({ boardId: 'board-1', user: createUser() })
    );

    act(() => {
      subscriptionCallback?.({
        objects: [objA, objB],
        changes: [
          { type: 'added', object: objA },
          { type: 'added', object: objB },
        ],
        isInitialSnapshot: true,
      });
    });

    act(() => {
      void result.current.deleteObjects(['a', 'b']);
    });

    expect(result.current.objects).toHaveLength(2);

    await act(async () => {
      resolveBatch();
    });

    expect(result.current.objects).toHaveLength(0);
  });
});
