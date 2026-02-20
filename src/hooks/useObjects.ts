import { useState, useEffect, useCallback, useRef, type SetStateAction } from 'react';
import { User } from 'firebase/auth';
import type { IBoardObject } from '@/types';
import {
  createObject,
  updateObject,
  updateObjectsBatch,
  deleteObject,
  deleteObjectsBatch,
  subscribeToObjectsWithChanges,
  mergeObjectUpdates,
  type IObjectChange,
  type IObjectsSnapshotUpdate,
  type ICreateObjectParams,
  type IUpdateObjectParams,
} from '@/modules/sync/objectService';
import { useObjectsStore } from '@/stores/objectsStore';
import { consumePrefetchedObjects } from '@/lib/boardPrefetch';
import { setWriteQueueBoard, queueWrite, flush as flushWriteQueue } from '@/lib/writeQueue';

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
  const [objects, setObjectsRaw] = useState<IBoardObject[]>([]);
  const [loading, setLoading] = useState<boolean>(!boardId ? false : true);
  const [error, setError] = useState<string>('');

  // Wrapper: updates React state and defers Zustand store sync to the next microtask.
  // Zustand mutations inside a setState updater trigger subscriber re-renders during
  // React's render phase → "Cannot update BoardCanvas while rendering BoardView2".
  // useCallback required for stable identity (used in useEffect/useCallback deps elsewhere).
  // eslint-disable-next-line local/no-unnecessary-use-callback -- stable identity required by react-hooks/exhaustive-deps
  const setObjects = useCallback((updater: SetStateAction<IBoardObject[]>) => {
    setObjectsRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      queueMicrotask(() => useObjectsStore.getState().setAll(next));

      return next;
    });
  }, []);

  // Clear store and pending timeouts when unmounting or switching boards.
  useEffect(() => {
    const timeouts = pendingTimeoutsRef.current;
    const pending = pendingUpdatesRef.current;

    return () => {
      useObjectsStore.getState().clear();
      for (const t of timeouts.values()) clearTimeout(t);
      timeouts.clear();
      pending.clear();
    };
  }, [boardId]);

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

  /** Returns true when two objects have identical visual fields. */
  const isObjectDataUnchanged = useCallback((a: IBoardObject, b: IBoardObject): boolean => {
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
      JSON.stringify(a.points) === JSON.stringify(b.points)
    );
  }, []);

  const applyIncrementalChanges = useCallback(
    (prevObjects: IBoardObject[], changes: IObjectChange[]): IBoardObject[] => {
      if (changes.length === 0) {
        return prevObjects;
      }

      const workingById = new Map(objectsByIdRef.current);
      let didMutate = false;

      for (const change of changes) {
        const remote = change.object;
        const existing = workingById.get(remote.id);

        if (change.type === 'removed') {
          if (existing) {
            workingById.delete(remote.id);
            didMutate = true;
          }

          continue;
        }

        // Use visual field comparison: only mutate if the remote object differs
        // from what we already have. This replaces the old timestamp comparison +
        // mergeObjectUpdates approach which always triggered re-renders because
        // Firestore echoes have new server timestamps even when data is identical.
        if (!existing || !isObjectDataUnchanged(existing, remote)) {
          workingById.set(remote.id, remote);
          didMutate = true;
        }
      }

      if (!didMutate) {
        return prevObjects;
      }

      const nextObjects = prevObjects
        .map((object) => workingById.get(object.id))
        .filter((object): object is IBoardObject => object !== undefined);

      for (const change of changes) {
        if (change.type !== 'added') {
          continue;
        }

        const alreadyInOrder = nextObjects.some((object) => object.id === change.object.id);
        if (!alreadyInOrder) {
          nextObjects.push(change.object);
        }
      }

      objectsByIdRef.current = new Map(nextObjects.map((object) => [object.id, object]));

      return nextObjects;
    },
    [isObjectDataUnchanged]
  );

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

      const nextObjects = applyIncrementalChanges(prevObjects, update.changes);
      if (nextObjects === prevObjects && update.objects.length !== prevObjects.length) {
        const refreshedObjects = update.objects.map((remoteObject) => {
          const pendingLocalObject = pendingUpdatesRef.current.get(remoteObject.id);
          return pendingLocalObject
            ? mergeObjectUpdates(pendingLocalObject, remoteObject)
            : remoteObject;
        });
        objectsByIdRef.current = new Map(refreshedObjects.map((object) => [object.id, object]));
        return refreshedObjects;
      }

      return nextObjects;
    },
    [applyIncrementalChanges]
  );

  // Consume prefetched board data during render (React-supported pattern for
  // external sync). This avoids an extra render cycle from setState-in-effect.
  // Ref mutations are deferred to the subscription effect (React compiler rule).
  const [prevBoardId, setPrevBoardId] = useState(boardId);
  if (boardId !== prevBoardId) {
    setPrevBoardId(boardId);
    if (boardId) {
      const prefetched = consumePrefetchedObjects(boardId);
      if (prefetched) {
        setObjectsRaw(prefetched);
        setLoading(false);
      } else {
        setLoading(true);
      }
    } else {
      setObjectsRaw([]);
      setLoading(false);
    }
  }

  // Subscribe to objects for real-time updates from Firestore.
  useEffect(() => {
    if (!boardId) {
      setWriteQueueBoard(null);
      objectsByIdRef.current.clear();

      return;
    }

    setWriteQueueBoard(boardId);

    // Mark that we're waiting for first callback to reset state
    isFirstCallbackRef.current = true;

    const unsubscribe = subscribeToObjectsWithChanges(boardId, (update) => {
      // Reset error on first callback after subscription
      if (isFirstCallbackRef.current) {
        isFirstCallbackRef.current = false;
        setError('');
      }

      // Pre-filter: skip changes for objects with in-flight Firestore writes.
      // These are self-echoes — the local state already reflects the correct position.
      if (!update.isInitialSnapshot && inFlightIdsRef.current.size > 0) {
        const filtered = update.changes.filter((c) => !inFlightIdsRef.current.has(c.object.id));

        if (filtered.length === 0) {
          return;
        }

        if (filtered.length < update.changes.length) {
          update = { ...update, changes: filtered };
        }
      }

      if (update.isInitialSnapshot) {
        // O(n) full rebuild — fine for initial load.
        setObjects((prevObjects) => applySnapshotUpdate(prevObjects, update));
      } else {
        // Incremental: update React state first, then Zustand store OUTSIDE
        // the setState updater to avoid triggering Zustand subscribers mid-render
        // ("Cannot update BoardCanvas while rendering BoardView" warning).
        setObjectsRaw((prevObjects) => applySnapshotUpdate(prevObjects, update));

        // Batched Zustand store updates — one index rebuild total, not per-object.
        const store = useObjectsStore.getState();
        const toDelete: string[] = [];
        const toSet: IBoardObject[] = [];

        for (const change of update.changes) {
          if (change.type === 'removed') {
            toDelete.push(change.object.id);
          } else {
            toSet.push(change.object);
          }
        }

        if (toDelete.length > 0) store.deleteObjects(toDelete);

        if (toSet.length > 0) store.setObjects(toSet);
      }

      setLoading(false);
    });

    return () => {
      flushWriteQueue();
      unsubscribe();
    };
  }, [applySnapshotUpdate, boardId, setObjects]);

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
        const createParams = { ...params, createdBy: user.uid };
        const newObject = await createObject(boardId, createParams);

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

      // Find the current object for potential rollback
      const currentObject = objects.find((obj) => obj.id === objectId);
      if (!currentObject) {
        setError('Object not found');
        return;
      }

      // Store original for rollback
      setPending(objectId, currentObject);
      inFlightIdsRef.current.add(objectId);

      // Optimistic update
      setObjects((prev) => prev.map((obj) => (obj.id === objectId ? { ...obj, ...updates } : obj)));

      try {
        setError('');
        await updateObject(boardId, objectId, updates);
        clearPending(objectId);
        inFlightIdsRef.current.delete(objectId);
      } catch (err) {
        inFlightIdsRef.current.delete(objectId);
        // Rollback on failure
        const original = pendingUpdatesRef.current.get(objectId);
        if (original) {
          setObjects((prev) => prev.map((obj) => (obj.id === objectId ? original : obj)));
          clearPending(objectId);
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to update object';
        setError(errorMessage);
      }
    },
    [boardId, objects, setObjects, setPending, clearPending]
  );

  // Delete object with optimistic update and rollback
  const handleDeleteObject = useCallback(
    async (objectId: string): Promise<void> => {
      if (!boardId) {
        setError('Cannot delete object: not connected to board');
        return;
      }

      // Find the current object for potential rollback
      const currentObject = objects.find((obj) => obj.id === objectId);
      if (!currentObject) {
        setError('Object not found');
        return;
      }

      // Store original for rollback
      setPending(objectId, currentObject);

      // Optimistic delete
      setObjects((prev) => prev.filter((obj) => obj.id !== objectId));

      try {
        setError('');
        await deleteObject(boardId, objectId);
        clearPending(objectId);
      } catch (err) {
        // Rollback on failure - restore the object
        const original = pendingUpdatesRef.current.get(objectId);
        if (original) {
          setObjects((prev) => [...prev, original]);
          clearPending(objectId);
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to delete object';
        setError(errorMessage);
      }
    },
    [boardId, objects, setObjects, setPending, clearPending]
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

      const objectIds = updates.map((u) => u.objectId);
      const originals = objectIds
        .map((id) => objects.find((obj) => obj.id === id))
        .filter(Boolean) as IBoardObject[];

      for (const obj of originals) {
        setPending(obj.id, obj);
      }

      // Mark as in-flight to suppress self-echoes from Firestore subscription.
      for (const id of objectIds) {
        inFlightIdsRef.current.add(id);
      }

      setObjects((prev) => {
        const next = prev.map((obj) => {
          const entry = updates.find((u) => u.objectId === obj.id);

          return entry ? { ...obj, ...entry.updates } : obj;
        });
        // Keep ref in sync so subscription callbacks do not reconcile from stale ref and cause one-by-one flicker
        objectsByIdRef.current = new Map(next.map((object) => [object.id, object]));

        return next;
      });

      try {
        setError('');
        await updateObjectsBatch(boardId, updates);

        for (const id of objectIds) {
          clearPending(id);
          inFlightIdsRef.current.delete(id);
        }
      } catch (err) {
        for (const original of originals) {
          setObjects((prev) => prev.map((o) => (o.id === original.id ? original : o)));
          clearPending(original.id);
        }

        for (const id of objectIds) {
          inFlightIdsRef.current.delete(id);
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to update objects';
        setError(errorMessage);
      }
    },
    [boardId, objects, setObjects, setPending, clearPending]
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

      const toRemove = objects.filter((obj) => objectIds.includes(obj.id));
      for (const obj of toRemove) {
        setPending(obj.id, obj);
      }

      try {
        setError('');
        await deleteObjectsBatch(boardId, objectIds);
        setObjects((prev) => prev.filter((obj) => !objectIds.includes(obj.id)));
        for (const id of objectIds) {
          clearPending(id);
        }
      } catch (err) {
        for (const id of objectIds) {
          clearPending(id);
        }
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete objects';
        setError(errorMessage);
      }
    },
    [boardId, objects, setObjects, setPending, clearPending]
  );

  // Queue a debounced Firestore write with immediate optimistic update.
  // Use for high-frequency property changes (color picker, text edits).
  const queueObjectUpdate = useCallback(
    (objectId: string, updates: IUpdateObjectParams): void => {
      if (!boardId) return;

      // Optimistic update (immediate UI feedback)
      setObjects((prev) => prev.map((obj) => (obj.id === objectId ? { ...obj, ...updates } : obj)));

      // Queue the Firestore write (debounced)
      queueWrite(objectId, updates);
    },
    [boardId, setObjects]
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
