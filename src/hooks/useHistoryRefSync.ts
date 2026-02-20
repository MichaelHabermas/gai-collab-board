import { useEffect } from 'react';
import type { IBoardObject } from '@/types';
import type { IUpdateObjectParams } from '@/modules/sync/objectService';

/**
 * Keeps objectsRef and raw create/update/delete refs in sync for useHistory.
 */
export function useHistoryRefSync(
  objects: IBoardObject[],
  createObject: (
    params: Omit<import('@/types').ICreateObjectParams, 'createdBy'>
  ) => Promise<IBoardObject | null>,
  updateObject: (objectId: string, updates: IUpdateObjectParams) => Promise<void>,
  deleteObject: (objectId: string) => Promise<void>,
  objectsRef: React.MutableRefObject<IBoardObject[]>,
  rawCreateRef: React.MutableRefObject<typeof createObject>,
  rawUpdateRef: React.MutableRefObject<typeof updateObject>,
  rawDeleteRef: React.MutableRefObject<typeof deleteObject>
): void {
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects, objectsRef]);

  useEffect(() => {
    rawCreateRef.current = createObject;
    rawUpdateRef.current = updateObject;
    rawDeleteRef.current = deleteObject;
  }, [createObject, updateObject, deleteObject, rawCreateRef, rawUpdateRef, rawDeleteRef]);
}
