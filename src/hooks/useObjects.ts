import { useState, useEffect, useCallback, useRef } from 'react';
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
  ICreateObjectParams,
  IUpdateObjectParams,
} from '@/modules/sync/objectService';
import { useObjectsStore } from '@/stores/objectsStore';

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
}

/**
 * Hook for managing board objects with optimistic updates and rollback.
 * Provides real-time synchronization with Firestore.
 */
export const useObjects = ({ boardId, user }: IUseObjectsParams): IUseObjectsReturn => {
  const [objects, setObjects] = useState<IBoardObject[]>([]);
  const [loading, setLoading] = useState<boolean>(!boardId ? false : true);
  const [error, setError] = useState<string>('');

  // Sync local objects state → Zustand objectsStore so per-shape subscribers get updates.
  const storeSetAll = useObjectsStore((s) => s.setAll);
  useEffect(() => {
    storeSetAll(objects);
  }, [objects, storeSetAll]);

  // Clear store when unmounting or switching boards.
  const storeClear = useObjectsStore((s) => s.clear);
  useEffect(() => {
    return () => {
      storeClear();
    };
  }, [boardId, storeClear]);

  // Keep track of pending updates for rollback
  const pendingUpdatesRef = useRef<Map<string, IBoardObject>>(new Map());
  const objectsByIdRef = useRef<Map<string, IBoardObject>>(new Map());
  // Track if this is the first callback after subscription to handle reset
  const isFirstCallbackRef = useRef<boolean>(true);

  const getObjectTimestamp = useCallback((object: IBoardObject): number => {
    return object.updatedAt?.toMillis?.() ?? 0;
  }, []);

  const isObjectVersionUnchanged = useCallback(
    (previousObject: IBoardObject, nextObject: IBoardObject): boolean => {
      return getObjectTimestamp(previousObject) === getObjectTimestamp(nextObject);
    },
    [getObjectTimestamp]
  );

  const applyIncrementalChanges = useCallback(
    (prevObjects: IBoardObject[], changes: IObjectChange[]): IBoardObject[] => {
      if (changes.length === 0) {
        return prevObjects;
      }

      const workingById = new Map(objectsByIdRef.current);
      let didMutate = false;

      for (const change of changes) {
        const pendingLocalObject = pendingUpdatesRef.current.get(change.object.id);
        const mergedObject = pendingLocalObject
          ? mergeObjectUpdates(pendingLocalObject, change.object)
          : change.object;
        const existingObject = workingById.get(mergedObject.id);

        if (change.type === 'removed') {
          if (existingObject) {
            workingById.delete(mergedObject.id);
            didMutate = true;
          }

          continue;
        }

        if (!existingObject || !isObjectVersionUnchanged(existingObject, mergedObject)) {
          workingById.set(mergedObject.id, mergedObject);
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
          const pendingLocalObject = pendingUpdatesRef.current.get(change.object.id);
          nextObjects.push(pendingLocalObject ?? change.object);
        }
      }

      objectsByIdRef.current = new Map(nextObjects.map((object) => [object.id, object]));
      return nextObjects;
    },
    [isObjectVersionUnchanged]
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

  // Subscribe to objects
  useEffect(() => {
    if (!boardId) {
      objectsByIdRef.current.clear();
      return;
    }

    // Mark that we're waiting for first callback to reset state
    isFirstCallbackRef.current = true;

    const unsubscribe = subscribeToObjectsWithChanges(boardId, (update) => {
      // Reset error on first callback after subscription
      if (isFirstCallbackRef.current) {
        isFirstCallbackRef.current = false;
        setError('');
      }

      setObjects((prevObjects) => applySnapshotUpdate(prevObjects, update));
      setLoading(false);
    });

    return () => {
      unsubscribe();
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
      pendingUpdatesRef.current.set(objectId, currentObject);

      // Optimistic update
      setObjects((prev) => prev.map((obj) => (obj.id === objectId ? { ...obj, ...updates } : obj)));

      try {
        setError('');
        await updateObject(boardId, objectId, updates);
        // Clear pending update on success
        pendingUpdatesRef.current.delete(objectId);
      } catch (err) {
        // Rollback on failure
        const original = pendingUpdatesRef.current.get(objectId);
        if (original) {
          setObjects((prev) => prev.map((obj) => (obj.id === objectId ? original : obj)));
          pendingUpdatesRef.current.delete(objectId);
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to update object';
        setError(errorMessage);
      }
    },
    [boardId, objects]
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
      pendingUpdatesRef.current.set(objectId, currentObject);

      // Optimistic delete
      setObjects((prev) => prev.filter((obj) => obj.id !== objectId));

      try {
        setError('');
        await deleteObject(boardId, objectId);
        // Clear pending update on success
        pendingUpdatesRef.current.delete(objectId);
      } catch (err) {
        // Rollback on failure - restore the object
        const original = pendingUpdatesRef.current.get(objectId);
        if (original) {
          setObjects((prev) => [...prev, original]);
          pendingUpdatesRef.current.delete(objectId);
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to delete object';
        setError(errorMessage);
      }
    },
    [boardId, objects]
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
        pendingUpdatesRef.current.set(obj.id, obj);
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
          pendingUpdatesRef.current.delete(id);
        }
      } catch (err) {
        for (const original of originals) {
          setObjects((prev) => prev.map((o) => (o.id === original.id ? original : o)));
          pendingUpdatesRef.current.delete(original.id);
        }
        const errorMessage = err instanceof Error ? err.message : 'Failed to update objects';
        setError(errorMessage);
      }
    },
    [boardId, objects]
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
        pendingUpdatesRef.current.set(obj.id, obj);
      }

      try {
        setError('');
        await deleteObjectsBatch(boardId, objectIds);
        setObjects((prev) => prev.filter((obj) => !objectIds.includes(obj.id)));
        for (const id of objectIds) {
          pendingUpdatesRef.current.delete(id);
        }
      } catch (err) {
        for (const id of objectIds) {
          pendingUpdatesRef.current.delete(id);
        }
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete objects';
        setError(errorMessage);
      }
    },
    [boardId, objects]
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
  };
};
