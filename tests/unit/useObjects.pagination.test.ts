/**
 * S3: Unit tests for pagination logic in useObjects.
 *
 * Tests the subscription branching: small boards get full subscription,
 * large boards get paginated load + delta subscription.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { IBoardObject, IDeltaCursor } from '@/types';
import { useObjects, PAGINATION_THRESHOLD, findMaxUpdatedAt } from '@/hooks/useObjects';

const mockCreateObject = vi.fn();
const mockUpdateObject = vi.fn();
const mockUpdateObjectsBatch = vi.fn();
const mockDeleteObject = vi.fn();
const mockDeleteObjectsBatch = vi.fn();
const mockSubscribeToObjects = vi.fn();
const mockFetchObjectsBatch = vi.fn();
const mockFetchObjectsPaginated = vi.fn();
const mockSubscribeToDeltaUpdates = vi.fn();

vi.mock('@/lib/repositoryProvider', () => ({
  getBoardRepository: () => ({
    createObject: (...args: unknown[]) => mockCreateObject(...args),
    updateObject: (...args: unknown[]) => mockUpdateObject(...args),
    updateObjectsBatch: (...args: unknown[]) => mockUpdateObjectsBatch(...args),
    deleteObject: (...args: unknown[]) => mockDeleteObject(...args),
    deleteObjectsBatch: (...args: unknown[]) => mockDeleteObjectsBatch(...args),
    subscribeToObjects: (...args: unknown[]) => mockSubscribeToObjects(...args),
    fetchObjectsBatch: (...args: unknown[]) => mockFetchObjectsBatch(...args),
    fetchObjectsPaginated: (...args: unknown[]) => mockFetchObjectsPaginated(...args),
    subscribeToDeltaUpdates: (...args: unknown[]) => mockSubscribeToDeltaUpdates(...args),
  }),
}));

vi.mock('@/modules/sync/objectService', () => ({
  mergeObjectUpdates: (local: IBoardObject, remote: IBoardObject) => {
    const localMillis = local.updatedAt?.toMillis?.() ?? 0;
    const remoteMillis = remote.updatedAt?.toMillis?.() ?? 0;

    return remoteMillis > localMillis ? remote : local;
  },
}));

vi.mock('@/lib/boardPrefetch', () => ({
  consumePrefetchedObjects: () => null,
}));

vi.mock('@/lib/writeQueue', () => ({
  setWriteQueueBoard: vi.fn(),
  queueObjectUpdate: vi.fn(),
  flush: vi.fn().mockResolvedValue(undefined),
}));

let mockObjectsRecord: Record<string, IBoardObject> = {};
const mockStoreState = {
  setAll: vi.fn((list: IBoardObject[]) => {
    mockObjectsRecord = list.reduce<Record<string, IBoardObject>>((acc, o) => {
      acc[o.id] = o;

      return acc;
    }, {});
  }),
  clear: vi.fn(() => {
    mockObjectsRecord = {};
  }),
  setObjects: vi.fn(),
  deleteObjects: vi.fn(),
  applyChanges: vi.fn(),
  get objects() {
    return mockObjectsRecord;
  },
};
vi.mock('@/stores/objectsStore', () => ({
  useObjectsStore: Object.assign(
    (selector: (s: typeof mockStoreState) => unknown) => selector(mockStoreState),
    { getState: () => mockStoreState }
  ),
  selectAllObjects: (state: { objects: Record<string, unknown> }) => Object.values(state.objects),
}));

const createTimestamp = (seconds: number, nanoseconds = 0) =>
  ({
    seconds,
    nanoseconds,
    toMillis: () => seconds * 1000 + Math.floor(nanoseconds / 1_000_000),
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
  createdAt: overrides.createdAt ?? createTimestamp(1),
  updatedAt: overrides.updatedAt ?? createTimestamp(1),
});

const createUser = (uid = 'user-1'): User =>
  ({ uid, email: `${uid}@example.com`, displayName: uid }) as User;

/** Generate N board objects with incrementing timestamps. */
const generateObjects = (count: number): IBoardObject[] =>
  Array.from({ length: count }, (_, i) =>
    createBoardObject({
      id: `obj-${i}`,
      updatedAt: createTimestamp(1000 + i, i * 100),
    })
  );

describe('useObjects – S3 pagination branching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: small board (probe returns ≤ threshold objects)
    mockFetchObjectsBatch.mockResolvedValue([]);
    mockFetchObjectsPaginated.mockResolvedValue([]);
    mockSubscribeToObjects.mockReturnValue(vi.fn());
    mockSubscribeToDeltaUpdates.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('small board (≤ threshold): calls subscribeToObjects, not subscribeToDeltaUpdates', async () => {
    const smallProbe = generateObjects(100);
    mockFetchObjectsBatch.mockResolvedValue(smallProbe);

    renderHook(() => useObjects({ boardId: 'board-small', user: createUser() }));
    await act(async () => {});

    expect(mockFetchObjectsBatch).toHaveBeenCalledWith('board-small', PAGINATION_THRESHOLD + 1);
    expect(mockSubscribeToObjects).toHaveBeenCalledWith('board-small', expect.any(Function));
    expect(mockFetchObjectsPaginated).not.toHaveBeenCalled();
    expect(mockSubscribeToDeltaUpdates).not.toHaveBeenCalled();
  });

  it('large board (> threshold): calls fetchObjectsPaginated then subscribeToDeltaUpdates', async () => {
    // Probe returns MORE than threshold → triggers pagination path
    const probeResult = generateObjects(PAGINATION_THRESHOLD + 1);
    const allObjects = generateObjects(PAGINATION_THRESHOLD + 200);
    mockFetchObjectsBatch.mockResolvedValue(probeResult);
    mockFetchObjectsPaginated.mockResolvedValue(allObjects);

    renderHook(() => useObjects({ boardId: 'board-large', user: createUser() }));
    await act(async () => {});

    expect(mockFetchObjectsBatch).toHaveBeenCalledWith('board-large', PAGINATION_THRESHOLD + 1);
    expect(mockFetchObjectsPaginated).toHaveBeenCalledWith('board-large');
    expect(mockSubscribeToDeltaUpdates).toHaveBeenCalledWith(
      'board-large',
      expect.objectContaining({ seconds: expect.any(Number), nanoseconds: expect.any(Number) }),
      expect.any(Function)
    );
    // Should NOT use full subscription for large boards
    expect(mockSubscribeToObjects).not.toHaveBeenCalled();
  });

  it('delta cursor uses max updatedAt from paginated result', async () => {
    const probeResult = generateObjects(PAGINATION_THRESHOLD + 1);
    const allObjects = generateObjects(600);
    // Last object has the highest timestamp
    const maxObj = allObjects[allObjects.length - 1]!;
    mockFetchObjectsBatch.mockResolvedValue(probeResult);
    mockFetchObjectsPaginated.mockResolvedValue(allObjects);

    renderHook(() => useObjects({ boardId: 'board-cursor', user: createUser() }));
    await act(async () => {});

    // The delta cursor should be the max updatedAt from all paginated objects
    const expectedCursor: IDeltaCursor = {
      seconds: (maxObj.updatedAt as { seconds: number }).seconds,
      nanoseconds: (maxObj.updatedAt as { nanoseconds: number }).nanoseconds,
    };

    expect(mockSubscribeToDeltaUpdates).toHaveBeenCalledWith(
      'board-cursor',
      expectedCursor,
      expect.any(Function)
    );
  });

  it('loading state: true during init, false after paginated load completes', async () => {
    let resolvePaginated!: (objects: IBoardObject[]) => void;
    const paginatedPromise = new Promise<IBoardObject[]>((resolve) => {
      resolvePaginated = resolve;
    });

    const probeResult = generateObjects(PAGINATION_THRESHOLD + 1);
    mockFetchObjectsBatch.mockResolvedValue(probeResult);
    mockFetchObjectsPaginated.mockReturnValue(paginatedPromise);

    const { result } = renderHook(() =>
      useObjects({ boardId: 'board-loading', user: createUser() })
    );

    // Loading should be true while waiting
    expect(result.current.loading).toBe(true);

    // Resolve the paginated fetch
    const allObjects = generateObjects(600);
    await act(async () => {
      resolvePaginated(allObjects);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.objects).toHaveLength(600);
  });

  it('cleanup on unmount during async pagination prevents state updates', async () => {
    let resolvePaginated!: (objects: IBoardObject[]) => void;
    const paginatedPromise = new Promise<IBoardObject[]>((resolve) => {
      resolvePaginated = resolve;
    });

    const probeResult = generateObjects(PAGINATION_THRESHOLD + 1);
    mockFetchObjectsBatch.mockResolvedValue(probeResult);
    mockFetchObjectsPaginated.mockReturnValue(paginatedPromise);

    const { result, unmount } = renderHook(() =>
      useObjects({ boardId: 'board-unmount', user: createUser() })
    );

    // Unmount while paginated fetch is still pending
    await act(async () => {});
    unmount();

    // Resolve AFTER unmount — should not throw or update state
    await act(async () => {
      resolvePaginated(generateObjects(600));
    });

    // No delta subscription should have been set up
    expect(mockSubscribeToDeltaUpdates).not.toHaveBeenCalled();
    // Objects should still be empty (no post-unmount state update)
    expect(result.current.objects).toHaveLength(0);
  });

  it('error during pagination sets error state and clears loading', async () => {
    const probeResult = generateObjects(PAGINATION_THRESHOLD + 1);
    mockFetchObjectsBatch.mockResolvedValue(probeResult);
    mockFetchObjectsPaginated.mockRejectedValue(new Error('Firestore timeout'));

    const { result } = renderHook(() =>
      useObjects({ boardId: 'board-error', user: createUser() })
    );

    await act(async () => {});

    expect(result.current.error).toBe('Firestore timeout');
    expect(result.current.loading).toBe(false);
  });

  it('error during probe sets error state', async () => {
    mockFetchObjectsBatch.mockRejectedValue(new Error('probe failed'));

    const { result } = renderHook(() =>
      useObjects({ boardId: 'board-probe-err', user: createUser() })
    );

    await act(async () => {});

    expect(result.current.error).toBe('probe failed');
    expect(result.current.loading).toBe(false);
  });

  it('null boardId skips probe entirely', async () => {
    const { result } = renderHook(() =>
      useObjects({ boardId: null, user: createUser() })
    );

    await act(async () => {});

    expect(mockFetchObjectsBatch).not.toHaveBeenCalled();
    expect(mockSubscribeToObjects).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.objects).toEqual([]);
  });
});

describe('findMaxUpdatedAt', () => {
  it('returns null for empty map', () => {
    const result = findMaxUpdatedAt(new Map());

    expect(result).toBeNull();
  });

  it('returns null when no objects have updatedAt', () => {
    const obj = createBoardObject({ id: 'a' });
    // Force updatedAt to be undefined-like
    const objNoTs = { ...obj, updatedAt: undefined } as unknown as IBoardObject;
    const map = new Map([['a', objNoTs]]);

    const result = findMaxUpdatedAt(map);

    expect(result).toBeNull();
  });

  it('returns the max timestamp from multiple objects', () => {
    const objA = createBoardObject({ id: 'a', updatedAt: createTimestamp(100, 500) });
    const objB = createBoardObject({ id: 'b', updatedAt: createTimestamp(200, 300) });
    const objC = createBoardObject({ id: 'c', updatedAt: createTimestamp(200, 100) });
    const map = new Map([
      ['a', objA],
      ['b', objB],
      ['c', objC],
    ]);

    const result = findMaxUpdatedAt(map);

    expect(result).toEqual({ seconds: 200, nanoseconds: 300 });
  });

  it('breaks ties using nanoseconds', () => {
    const objA = createBoardObject({ id: 'a', updatedAt: createTimestamp(100, 999) });
    const objB = createBoardObject({ id: 'b', updatedAt: createTimestamp(100, 1000) });
    const map = new Map([
      ['a', objA],
      ['b', objB],
    ]);

    const result = findMaxUpdatedAt(map);

    expect(result).toEqual({ seconds: 100, nanoseconds: 1000 });
  });

  it('handles single-element map', () => {
    const obj = createBoardObject({ id: 'only', updatedAt: createTimestamp(42, 7) });
    const map = new Map([['only', obj]]);

    const result = findMaxUpdatedAt(map);

    expect(result).toEqual({ seconds: 42, nanoseconds: 7 });
  });
});

describe('PAGINATION_THRESHOLD', () => {
  it('is exported and equals 500 (Article XIV)', () => {
    expect(PAGINATION_THRESHOLD).toBe(500);
  });
});
