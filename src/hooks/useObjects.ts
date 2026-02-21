import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User } from 'firebase/auth';
import type {
  IBoardObject,
  IDeltaCursor,
  IObjectChange,
  IObjectsSnapshotUpdate,
  ICreateObjectParams,
  IUpdateObjectParams,
} from '@/types';
import { mergeObjectUpdates } from '@/modules/sync/objectService';
import { getBoardRepository } from '@/lib/repositoryProvider';
import { useObjectsStore, type IApplyChangesChangeset } from '@/stores/objectsStore';
import { consumePrefetchedObjects } from '@/lib/boardPrefetch';
import {
  setWriteQueueBoard,
  queueObjectUpdate as canonicalQueueObjectUpdate,
  flush as flushWriteQueue,
} from '@/lib/writeQueue';

// ============================================================================
// Pure functions — extracted for testability (S4)
// ============================================================================

export function shallowArrayEqual(a?: number[], b?: number[]): boolean {
  if (a === b) return true;

  if (!a || !b || a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Returns true when two objects have identical visual fields. */
export function isObjectDataUnchanged(a: IBoardObject, b: IBoardObject): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.rotation === b.rotation &&
    a.text === b.text &&
    a.fill === b.fill &&
    a.stroke === b.stroke &&
    a.strokeWidth === b.strokeWidth &&
    a.opacity === b.opacity &&
    a.fontSize === b.fontSize &&
    a.parentFrameId === b.parentFrameId &&
    // points is an array — compare by value, not reference
    shallowArrayEqual(a.points, b.points)
  );
}

interface IApplyIncrementalResult {
  nextById: Map<string, IBoardObject>;
  didChange: boolean;
}

/**
 * Apply incremental Firestore changes to the working object map.
 * Uses copy-on-write: defers O(n) map clone until first mutation detected.
 * Returns the (possibly new) map and a flag indicating whether anything changed.
 *
 * Complexity: O(k) when nothing changed, O(n + k) when mutations occur
 * (one map clone + one change iteration). Eliminates the O(n*k) `.some()`
 * scan from the previous implementation.
 */
export function applyIncrementalChanges(
  objectsById: Map<string, IBoardObject>,
  changes: IObjectChange[],
  comparator: (a: IBoardObject, b: IBoardObject) => boolean
): IApplyIncrementalResult {
  if (changes.length === 0) {
    return { nextById: objectsById, didChange: false };
  }

  let didMutate = false;
  let workingById: Map<string, IBoardObject> | null = null;

  for (const change of changes) {
    const remote = change.object;
    const existing = objectsById.get(remote.id);

    if (change.type === 'removed') {
      if (existing) {
        if (!workingById) workingById = new Map(objectsById);

        workingById.delete(remote.id);
        didMutate = true;
      }

      continue;
    }

    // Use visual field comparison: only mutate if the remote object differs
    // from what we already have. Suppresses spurious re-renders from
    // Firestore echoes with new server timestamps but identical data.
    if (!existing || !comparator(existing, remote)) {
      if (!workingById) workingById = new Map(objectsById);

      workingById.set(remote.id, remote);
      didMutate = true;
    }
  }

  if (!didMutate) {
    return { nextById: objectsById, didChange: false };
  }

  return { nextById: workingById!, didChange: true };
}

/** Board size threshold: boards with more objects use paginated initial load (Article XIV). */
export const PAGINATION_THRESHOLD = 500;

/**
 * Find the maximum updatedAt timestamp across all objects in the map.
 * Used as the delta cursor for subscribeToDeltaUpdates after paginated load.
 */
export function findMaxUpdatedAt(objectsById: Map<string, IBoardObject>): IDeltaCursor | null {
  let maxSeconds = 0;
  let maxNanos = 0;

  for (const obj of objectsById.values()) {
    const ts = obj.updatedAt;
    if (!ts) continue;

    const s = typeof ts.seconds === 'number' ? ts.seconds : 0;
    const n = typeof ts.nanoseconds === 'number' ? ts.nanoseconds : 0;

    if (s > maxSeconds || (s === maxSeconds && n > maxNanos)) {
      maxSeconds = s;
      maxNanos = n;
    }
  }

  if (maxSeconds === 0 && maxNanos === 0) return null;

  return { seconds: maxSeconds, nanoseconds: maxNanos };
}

// ============================================================================
// Hook
// ============================================================================

interface IUseObjectsParams {
  boardId: string | null;
  user: User | null;
}

export type IObjectUpdateEntry = { objectId: string; updates: IUpdateObjectParams };

interface IUseObjectsReturn {
  objects: IBoardObject[];
  loading: boolean;
  error: string | null;
  createObject: (params: Omit<ICreateObjectParams, 'createdBy'>) => Promise<IBoardObject | null>;
  updateObject: (objectId: string, updates: IUpdateObjectParams) => Promise<void>;
  updateObjects: (updates: IObjectUpdateEntry[]) => Promise<void>;
  deleteObject: (objectId: string) => Promise<void>;
  deleteObjects: (objectIds: string[]) => Promise<void>;
  queueObjectUpdate: (objectId: string, updates: IUpdateObjectParams) => void;
  flushWrites: () => Promise<void>;
}

/**
 * Hook for managing board objects with optimistic updates and rollback.
 * Provides real-time synchronization with Firestore.
 */
export const useObjects = ({ boardId, user }: IUseObjectsParams): IUseObjectsReturn => {
  const objectsRecord = useObjectsStore((s) => s.objects);
  const objects = useMemo(
    () => Object.values(objectsRecord).filter((obj): obj is IBoardObject => Boolean(obj)),
    [objectsRecord]
  );
  const [loading, setLoading] = useState<boolean>(!boardId ? false : true);
  const [error, setError] = useState<string>('');

  // Keep track of pending updates for rollback
  const pendingUpdatesRef = useRef<Map<string, IBoardObject>>(new Map());
  const pendingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const objectsByIdRef = useRef<Map<string, IBoardObject>>(new Map());
  // Track if this is the first callback after subscription to handle reset
  const isFirstCallbackRef = useRef<boolean>(true);
  // IDs with in-flight Firestore writes — echoes for these are self-echoes and can be skipped.
  const inFlightIdsRef = useRef<Set<string>>(new Set());

  const PENDING_TIMEOUT_MS = 30_000;

  const setPending = useCallback((id: string, obj: IBoardObject) => {
    pendingUpdatesRef.current.set(id, obj);
    const prev = pendingTimeoutsRef.current.get(id);
    if (prev) clearTimeout(prev);

    pendingTimeoutsRef.current.set(
      id,
      setTimeout(() => {
        pendingUpdatesRef.current.delete(id);
        pendingTimeoutsRef.current.delete(id);
      }, PENDING_TIMEOUT_MS)
    );
  }, []);

  const clearPending = useCallback((id: string) => {
    pendingUpdatesRef.current.delete(id);
    const t = pendingTimeoutsRef.current.get(id);
    if (t) {
      clearTimeout(t);
      pendingTimeoutsRef.current.delete(id);
    }
  }, []);

  const applySnapshotUpdate = useCallback(
    (prevObjects: IBoardObject[], update: IObjectsSnapshotUpdate): IBoardObject[] => {
      if (update.isInitialSnapshot) {
        const initialObjects = update.objects.map((remoteObject) => {
          const pendingLocalObject = pendingUpdatesRef.current.get(remoteObject.id);

          return pendingLocalObject
            ? mergeObjectUpdates(pendingLocalObject, remoteObject)
            : remoteObject;
        });
        objectsByIdRef.current = new Map(initialObjects.map((object) => [object.id, object]));

        return initialObjects;
      }

      // S4: use extracted pure function with copy-on-write map
      const { nextById, didChange } = applyIncrementalChanges(
        objectsByIdRef.current,
        update.changes,
        isObjectDataUnchanged
      );

      if (!didChange) {
        // Fallback: if incremental changes didn't mutate the map but the server
        // snapshot has a different count, a change was missed (e.g. a deletion not
        // captured in the change stream). Do a full refresh from the snapshot.
        if (update.objects.length !== prevObjects.length) {
          const refreshedObjects = update.objects.map((remoteObject) => {
            const pendingLocalObject = pendingUpdatesRef.current.get(remoteObject.id);

            return pendingLocalObject
              ? mergeObjectUpdates(pendingLocalObject, remoteObject)
              : remoteObject;
          });
          objectsByIdRef.current = new Map(refreshedObjects.map((object) => [object.id, object]));

          return refreshedObjects;
        }

        return prevObjects;
      }

      objectsByIdRef.current = nextById;

      return Array.from(nextById.values());
    },
    []
  );

  const prevBoardIdRef = useRef(boardId);

  // Consume prefetched board data when boardId changes (ref-based to avoid setState in effect).
  useEffect(() => {
    if (boardId === prevBoardIdRef.current) {
      return;
    }

    prevBoardIdRef.current = boardId;
    if (boardId) {
      const prefetched = consumePrefetchedObjects(boardId);
      if (prefetched) {
        useObjectsStore.getState().setAll(prefetched);
        queueMicrotask(() => setLoading(false));
      } else {
        queueMicrotask(() => setLoading(true));
      }
    } else {
      useObjectsStore.getState().clear();
      queueMicrotask(() => setLoading(false));
    }
  }, [boardId]);

  // Subscribe to objects for real-time updates from Firestore.
  // S3: branches on board size — small boards use full subscription,
  // large boards use paginated initial load + delta subscription.
  useEffect(() => {
    if (!boardId) {
      setWriteQueueBoard(null);
      objectsByIdRef.current.clear();
      const timeouts = pendingTimeoutsRef.current;
      const pending = pendingUpdatesRef.current;

      return () => {
        useObjectsStore.getState().clear();
        for (const t of timeouts.values()) clearTimeout(t);
        timeouts.clear();
        pending.clear();
      };
    }

    setWriteQueueBoard(boardId);
    isFirstCallbackRef.current = true;

    const timeouts = pendingTimeoutsRef.current;
    const pending = pendingUpdatesRef.current;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    const repo = getBoardRepository();

    // Shared update handler — used by both subscription strategies.
    const handleUpdate = (update: IObjectsSnapshotUpdate): void => {
      if (cancelled) return;

      if (isFirstCallbackRef.current) {
        isFirstCallbackRef.current = false;
        setError('');
      }

      // Pre-filter: skip changes for objects with in-flight Firestore writes.
      if (!update.isInitialSnapshot && inFlightIdsRef.current.size > 0) {
        const filtered = update.changes.filter((c) => !inFlightIdsRef.current.has(c.object.id));

        if (filtered.length === 0) return;

        if (filtered.length < update.changes.length) {
          update = { ...update, changes: filtered };
        }
      }

      if (update.isInitialSnapshot) {
        const store = useObjectsStore.getState();
        const prevObjects = Object.values(store.objects);
        const nextObjects = applySnapshotUpdate(prevObjects, update);
        store.setAll(nextObjects);
      } else {
        const store = useObjectsStore.getState();
        const prevObjects = Object.values(store.objects);
        const nextObjects = applySnapshotUpdate(prevObjects, update);

        const changeset: IApplyChangesChangeset = {
          add: update.changes.filter((c) => c.type === 'added').map((c) => c.object),
          update: update.changes
            .filter((c) => c.type === 'modified')
            .map((c) => ({ id: c.object.id, updates: c.object })),
          delete: update.changes.filter((c) => c.type === 'removed').map((c) => c.object.id),
        };

        const hasChangesetWork =
          changeset.add.length > 0 || changeset.update.length > 0 || changeset.delete.length > 0;

        if (hasChangesetWork) {
          store.applyChanges(changeset);
        } else if (nextObjects.length !== prevObjects.length) {
          // Fallback path: full snapshot refresh (e.g. missed deletion in change stream)
          store.setAll(nextObjects);
        }
      }

      setLoading(false);
    };

    // Attach the appropriate subscription based on board size.
    // Probe first to decide: small boards get full subscription,
    // large boards get paginated initial load + delta subscription.
    const setupSubscription = async (): Promise<void> => {
      const probe = await repo.fetchObjectsBatch(boardId, PAGINATION_THRESHOLD + 1);
      if (cancelled) return;

      if (probe.length <= PAGINATION_THRESHOLD) {
        // Small board: use full subscription (current behavior).
        unsubscribe = repo.subscribeToObjects(boardId, handleUpdate);
      } else {
        // Large board: paginated initial load + delta subscription.
        const allObjects = await repo.fetchObjectsPaginated(boardId);
        if (cancelled) return;

        const byId = new Map(allObjects.map((o) => [o.id, o]));
        objectsByIdRef.current = byId;
        useObjectsStore.getState().setAll(allObjects);
        setLoading(false);

        const cursor = findMaxUpdatedAt(byId);
        if (cursor && !cancelled) {
          unsubscribe = repo.subscribeToDeltaUpdates(boardId, cursor, handleUpdate);
        }
      }
    };

    setupSubscription().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Failed to load board');
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      flushWriteQueue();
      if (unsubscribe) unsubscribe();

      useObjectsStore.getState().clear();
      for (const t of timeouts.values()) clearTimeout(t);
      timeouts.clear();
      pending.clear();
    };
  }, [applySnapshotUpdate, boardId]);

  // Create object with optimistic update
  const handleCreateObject = useCallback(
    async (params: Omit<ICreateObjectParams, 'createdBy'>): Promise<IBoardObject | null> => {
      if (!boardId || !user) {
        const errorMsg = 'Cannot create object: not connected to board';
        setError(errorMsg);
        return null;
      }

      try {
        setError('');
        const repo = getBoardRepository();
        const createParams = { ...params, createdBy: user.uid };
        const newObject = await repo.createObject(boardId, createParams);

        return newObject;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create object';
        setError(errorMessage);
        return null;
      }
    },
    [boardId, user]
  );

  // Update object with optimistic update and rollback
  const handleUpdateObject = useCallback(
    async (objectId: string, updates: IUpdateObjectParams): Promise<void> => {
      if (!boardId) {
        setError('Cannot update object: not connected to board');
        return;
      }

      const store = useObjectsStore.getState();
      const currentObject = store.objects[objectId];
      if (!currentObject) {
        setError('Object not found');
        return;
      }

      setPending(objectId, currentObject);
      inFlightIdsRef.current.add(objectId);

      store.updateObject(objectId, updates);

      try {
        setError('');
        const repo = getBoardRepository();
        await repo.updateObject(boardId, objectId, updates);
        clearPending(objectId);
        inFlightIdsRef.current.delete(objectId);
      } catch (err) {
        inFlightIdsRef.current.delete(objectId);
        const original = pendingUpdatesRef.current.get(objectId);
        if (original) {
          useObjectsStore.getState().setObject(original);
          clearPending(objectId);
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to update object';
        setError(errorMessage);
      }
    },
    [boardId, setPending, clearPending]
  );

  // Delete object with optimistic update and rollback
  const handleDeleteObject = useCallback(
    async (objectId: string): Promise<void> => {
      if (!boardId) {
        setError('Cannot delete object: not connected to board');
        return;
      }

      const store = useObjectsStore.getState();
      const currentObject = store.objects[objectId];
      if (!currentObject) {
        setError('Object not found');
        return;
      }

      setPending(objectId, currentObject);
      store.deleteObject(objectId);

      try {
        setError('');
        const repo = getBoardRepository();
        await repo.deleteObject(boardId, objectId);
        clearPending(objectId);
      } catch (err) {
        const original = pendingUpdatesRef.current.get(objectId);
        if (original) {
          useObjectsStore.getState().setObject(original);
          clearPending(objectId);
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to delete object';
        setError(errorMessage);
      }
    },
    [boardId, setPending, clearPending]
  );

  // Update multiple objects in one batch (optimistic update + rollback)
  const handleUpdateObjects = useCallback(
    async (updates: IObjectUpdateEntry[]): Promise<void> => {
      if (!boardId) {
        setError('Cannot update objects: not connected to board');
        return;
      }

      if (updates.length === 0) {
        return;
      }

      const store = useObjectsStore.getState();
      const objectIds = updates.map((u) => u.objectId);
      const originals = objectIds
        .map((id) => store.objects[id])
        .filter((obj): obj is IBoardObject => Boolean(obj));

      for (const obj of originals) {
        setPending(obj.id, obj);
      }

      for (const id of objectIds) {
        inFlightIdsRef.current.add(id);
      }

      const nextObjects = Object.values(store.objects).map((obj) => {
        const entry = updates.find((u) => u.objectId === obj.id);

        return entry ? { ...obj, ...entry.updates } : obj;
      });
      objectsByIdRef.current = new Map(nextObjects.map((o) => [o.id, o]));
      store.setObjects(nextObjects);

      try {
        setError('');
        const repo = getBoardRepository();
        await repo.updateObjectsBatch(boardId, updates);

        for (const id of objectIds) {
          clearPending(id);
          inFlightIdsRef.current.delete(id);
        }
      } catch (err) {
        for (const original of originals) {
          useObjectsStore.getState().setObject(original);
          clearPending(original.id);
        }

        for (const id of objectIds) {
          inFlightIdsRef.current.delete(id);
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to update objects';
        setError(errorMessage);
      }
    },
    [boardId, setPending, clearPending]
  );

  // Delete multiple objects in one batch (defer state update until batch resolves)
  const handleDeleteObjects = useCallback(
    async (objectIds: string[]): Promise<void> => {
      if (!boardId) {
        setError('Cannot delete objects: not connected to board');
        return;
      }

      if (objectIds.length === 0) {
        return;
      }

      const store = useObjectsStore.getState();
      const toRemove = objectIds
        .map((id) => store.objects[id])
        .filter((obj): obj is IBoardObject => Boolean(obj));
      for (const obj of toRemove) {
        setPending(obj.id, obj);
      }

      try {
        setError('');
        const repo = getBoardRepository();
        await repo.deleteObjectsBatch(boardId, objectIds);
        store.deleteObjects(objectIds);
        for (const id of objectIds) {
          clearPending(id);
        }
      } catch (err) {
        for (const original of toRemove) {
          useObjectsStore.getState().setObject(original);
        }
        for (const id of objectIds) {
          clearPending(id);
        }
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete objects';
        setError(errorMessage);
      }
    },
    [boardId, setPending, clearPending]
  );

  // Queue a debounced Firestore write with immediate optimistic update.
  // Use for high-frequency property changes (color picker, text edits).
  const queueObjectUpdate = useCallback(
    (objectId: string, updates: IUpdateObjectParams): void => {
      if (!boardId) return;

      canonicalQueueObjectUpdate(objectId, updates);
    },
    [boardId]
  );

  return {
    objects,
    loading,
    error,
    createObject: handleCreateObject,
    updateObject: handleUpdateObject,
    updateObjects: handleUpdateObjects,
    deleteObject: handleDeleteObject,
    deleteObjects: handleDeleteObjects,
    queueObjectUpdate,
    flushWrites: flushWriteQueue,
  };
};
