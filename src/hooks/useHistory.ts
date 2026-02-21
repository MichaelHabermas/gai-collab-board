import { useCallback, useRef, useEffect } from 'react';
import type { IUpdateObjectParams } from '@/modules/sync/objectService';
import { useHistoryStore } from '@/stores/historyStore';
import { useObjectsStore } from '@/stores/objectsStore';
import { executeUndo, executeRedo } from '@/modules/history/historyService';
import { useHistoryRefSync } from '@/hooks/useHistoryRefSync';

interface IUseHistoryParams {
  createObject: (
    params: Omit<import('@/types').ICreateObjectParams, 'createdBy'>
  ) => Promise<import('@/types').IBoardObject | null>;
  updateObject: (objectId: string, updates: IUpdateObjectParams) => Promise<void>;
  deleteObject: (objectId: string) => Promise<void>;
  boardId: string | null;
}

interface IUseHistoryReturn {
  /** Wrapped create that records history. */
  createObject: (
    params: Omit<import('@/types').ICreateObjectParams, 'createdBy'>
  ) => Promise<import('@/types').IBoardObject | null>;
  /** Wrapped update that records history. */
  updateObject: (objectId: string, updates: IUpdateObjectParams) => Promise<void>;
  /** Wrapped delete that records history. */
  deleteObject: (objectId: string) => Promise<void>;
  /** Execute undo. */
  undo: () => void;
  /** Execute redo. */
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Wraps object mutation functions to record history commands for undo/redo.
 * History is cleared on board switch.
 */
export const useHistory = ({
  createObject,
  updateObject,
  deleteObject,
  boardId,
}: IUseHistoryParams): IUseHistoryReturn => {
  const push = useHistoryStore((s) => s.push);
  const undoFromStore = useHistoryStore((s) => s.undo);
  const redoFromStore = useHistoryStore((s) => s.redo);
  const clearHistory = useHistoryStore((s) => s.clear);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);

  const rawCreateRef = useRef(createObject);
  const rawUpdateRef = useRef(updateObject);
  const rawDeleteRef = useRef(deleteObject);

  useHistoryRefSync(
    createObject,
    updateObject,
    deleteObject,
    rawCreateRef,
    rawUpdateRef,
    rawDeleteRef
  );

  useEffect(() => {
    clearHistory();
  }, [boardId, clearHistory]);

  const wrappedCreate = useCallback(
    async (
      params: Omit<import('@/types').ICreateObjectParams, 'createdBy'>
    ): Promise<import('@/types').IBoardObject | null> => {
      const result = await createObject(params);
      if (result) {
        push([{ type: 'create', objectId: result.id, after: result }]);
      }

      return result;
    },
    [createObject, push]
  );

  const wrappedUpdate = useCallback(
    async (objectId: string, updates: IUpdateObjectParams): Promise<void> => {
      const before = useObjectsStore.getState().objects[objectId];
      await updateObject(objectId, updates);
      if (before) {
        push([{ type: 'update', objectId, before, after: { ...before, ...updates } }]);
      }
    },
    [updateObject, push]
  );

  const wrappedDelete = useCallback(
    async (objectId: string): Promise<void> => {
      const before = useObjectsStore.getState().objects[objectId];
      await deleteObject(objectId);
      if (before) {
        push([{ type: 'delete', objectId, before }]);
      }
    },
    [deleteObject, push]
  );

  const getObjects = useCallback(() => Object.values(useObjectsStore.getState().objects), []);

  const undo = useCallback(() => {
    const entry = undoFromStore();
    if (!entry) return;

    void executeUndo(entry, {
      createObject: (p) => rawCreateRef.current(p),
      updateObject: (id, u) => rawUpdateRef.current(id, u),
      deleteObject: (id) => rawDeleteRef.current(id),
      getObjects,
    });
  }, [undoFromStore, getObjects]);

  const redo = useCallback(() => {
    const entry = redoFromStore();
    if (!entry) return;

    void executeRedo(entry, {
      createObject: (p) => rawCreateRef.current(p),
      updateObject: (id, u) => rawUpdateRef.current(id, u),
      deleteObject: (id) => rawDeleteRef.current(id),
      getObjects,
    });
  }, [redoFromStore, getObjects]);

  return {
    createObject: wrappedCreate,
    updateObject: wrappedUpdate,
    deleteObject: wrappedDelete,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
