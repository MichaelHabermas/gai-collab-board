import { useEffect, useRef, type RefObject } from 'react';
import type { IBoardObject, IPosition, IAlignmentCandidate } from '@/types';
import { getObjectBounds } from '@/lib/canvasBounds';
import { getAlignmentPositions } from '@/lib/alignmentGuides';

interface IUseAlignmentGuideCacheParams {
  objects: IBoardObject[];
  visibleObjects: IBoardObject[];
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
 * Keeps guideCandidateBoundsRef and dragBoundFuncCacheRef in sync with objects/visibility/snap.
 * When inputs change, recomputes candidate bounds and clears the drag-bound-fn cache.
 */
export const useAlignmentGuideCache = ({
  objects,
  visibleObjects,
  visibleObjectIdsKey,
  snapToGridEnabled,
}: IUseAlignmentGuideCacheParams): IUseAlignmentGuideCacheReturn => {
  const guideCandidateBoundsRef = useRef<Array<{ id: string; candidate: IAlignmentCandidate }>>([]);
  const dragBoundFuncCacheRef = useRef<IDragBoundFuncCache>(new Map());

  useEffect(() => {
    const candidateObjects = visibleObjects.length > 0 ? visibleObjects : objects;
    guideCandidateBoundsRef.current = candidateObjects.map((object) => ({
      id: object.id,
      candidate: (() => {
        const bounds = getObjectBounds(object);
        return {
          bounds,
          positions: getAlignmentPositions(bounds),
        };
      })(),
    }));
    dragBoundFuncCacheRef.current.clear();
  }, [objects, visibleObjectIdsKey, visibleObjects, snapToGridEnabled]);

  return {
    guideCandidateBoundsRef,
    dragBoundFuncCacheRef,
  };
};
