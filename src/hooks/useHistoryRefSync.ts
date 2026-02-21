import { useEffect } from 'react';
import type { IUpdateObjectParams } from '@/modules/sync/objectService';

/**
 * Keeps raw create/update/delete refs in sync for useHistory (Article XVI).
 */
export function useHistoryRefSync(
  createObject: (
    params: Omit<import('@/types').ICreateObjectParams, 'createdBy'>
  ) => Promise<import('@/types').IBoardObject | null>,
  updateObject: (objectId: string, updates: IUpdateObjectParams) => Promise<void>,
  deleteObject: (objectId: string) => Promise<void>,
  rawCreateRef: React.MutableRefObject<typeof createObject>,
  rawUpdateRef: React.MutableRefObject<typeof updateObject>,
  rawDeleteRef: React.MutableRefObject<typeof deleteObject>
): void {
  useEffect(() => {
    rawCreateRef.current = createObject;
    rawUpdateRef.current = updateObject;
    rawDeleteRef.current = deleteObject;
  }, [createObject, updateObject, deleteObject, rawCreateRef, rawUpdateRef, rawDeleteRef]);
}
