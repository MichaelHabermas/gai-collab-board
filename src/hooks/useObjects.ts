import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import type { IBoardObject } from '@/types';
import {
  createObject,
  updateObject,
  deleteObject,
  subscribeToObjects,
  mergeObjectUpdates,
  ICreateObjectParams,
  IUpdateObjectParams,
} from '@/modules/sync/objectService';

interface IUseObjectsParams {
  boardId: string | null;
  user: User | null;
}

interface IUseObjectsReturn {
  objects: IBoardObject[];
  loading: boolean;
  error: string | null;
  createObject: (params: Omit<ICreateObjectParams, 'createdBy'>) => Promise<IBoardObject | null>;
  updateObject: (objectId: string, updates: IUpdateObjectParams) => Promise<void>;
  deleteObject: (objectId: string) => Promise<void>;
}

/**
 * Hook for managing board objects with optimistic updates and rollback.
 * Provides real-time synchronization with Firestore.
 */
export const useObjects = ({ boardId, user }: IUseObjectsParams): IUseObjectsReturn => {
  const [objects, setObjects] = useState<IBoardObject[]>([]);
  const [loading, setLoading] = useState<boolean>(!boardId ? false : true);
  const [error, setError] = useState<string>('');

  // Keep track of pending updates for rollback
  const pendingUpdatesRef = useRef<Map<string, IBoardObject>>(new Map());
  // Track if this is the first callback after subscription to handle reset
  const isFirstCallbackRef = useRef<boolean>(true);

  // Subscribe to objects
  useEffect(() => {
    if (!boardId) {
      return;
    }

    // Mark that we're waiting for first callback to reset state
    isFirstCallbackRef.current = true;

    const unsubscribe = subscribeToObjects(boardId, (remoteObjects) => {
      // Reset error on first callback after subscription
      if (isFirstCallbackRef.current) {
        isFirstCallbackRef.current = false;
        setError('');
      }

      setObjects(() => {
        // Merge remote objects with any pending local updates
        const mergedObjects = remoteObjects.map((remoteObj) => {
          const pendingLocal = pendingUpdatesRef.current.get(remoteObj.id);
          if (pendingLocal) {
            // Use last-write-wins to resolve conflicts
            return mergeObjectUpdates(pendingLocal, remoteObj);
          }
          return remoteObj;
        });

        return mergedObjects;
      });
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [boardId]);

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

  return {
    objects,
    loading,
    error,
    createObject: handleCreateObject,
    updateObject: handleUpdateObject,
    deleteObject: handleDeleteObject,
  };
};
