import { useEffect, useRef, type RefObject } from 'react';
import type { IPosition, IAlignmentCandidate } from '@/types';
import { useObjectsStore } from '@/stores/objectsStore';
import { getObjectBounds } from '@/lib/canvasBounds';
import { getAlignmentPositions } from '@/lib/alignmentGuides';

interface IUseAlignmentGuideCacheParams {
  visibleShapeIds: string[];
  visibleObjectIdsKey: string;
  snapToGridEnabled: boolean;
}

export type IDragBoundFuncCache = Map<
  string,
  { width: number; height: number; fn: (pos: IPosition) => IPosition }
>;

interface IUseAlignmentGuideCacheReturn {
  guideCandidateBoundsRef: RefObject<Array<{ id: string; candidate: IAlignmentCandidate }>>;
  dragBoundFuncCacheRef: RefObject<IDragBoundFuncCache>;
}

/**
 * Keeps guideCandidateBoundsRef and dragBoundFuncCacheRef in sync with visible objects.
 * Reads object data directly from the Zustand store so this only recomputes
 * when the visible set changes or snap setting changes — not on every object mutation.
 */
export const useAlignmentGuideCache = ({
  visibleShapeIds,
  visibleObjectIdsKey,
  snapToGridEnabled,
}: IUseAlignmentGuideCacheParams): IUseAlignmentGuideCacheReturn => {
  const guideCandidateBoundsRef = useRef<Array<{ id: string; candidate: IAlignmentCandidate }>>([]);
  const dragBoundFuncCacheRef = useRef<IDragBoundFuncCache>(new Map());

  useEffect(() => {
    const objectsRecord = useObjectsStore.getState().objects;
    guideCandidateBoundsRef.current = visibleShapeIds
      .map((id) => {
        const object = objectsRecord[id];
        if (!object) return null;

        const bounds = getObjectBounds(object);

        return {
          id: object.id,
          candidate: { bounds, positions: getAlignmentPositions(bounds) },
        };
      })
      .filter((entry): entry is { id: string; candidate: IAlignmentCandidate } => entry != null);
    dragBoundFuncCacheRef.current.clear();
  }, [visibleShapeIds, visibleObjectIdsKey, snapToGridEnabled]);

  return {
    guideCandidateBoundsRef,
    dragBoundFuncCacheRef,
  };
};
