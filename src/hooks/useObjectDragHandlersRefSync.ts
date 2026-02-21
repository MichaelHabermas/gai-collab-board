import { useEffect, type MutableRefObject } from 'react';
import type { IBoardObject } from '@/types';
import type { IAlignmentGuides } from '@/lib/alignmentGuides';

/**
 * Keeps framesRef and setGuidesThrottledRef in sync for useObjectDragHandlers.
 */
export function useObjectDragHandlersRefSync(
  objectsRecord: Record<string, IBoardObject>,
  framesRef: MutableRefObject<IBoardObject[]>,
  setGuidesThrottled: (guides: IAlignmentGuides) => void,
  setGuidesThrottledRef: MutableRefObject<(g: IAlignmentGuides) => void>
): void {
  useEffect(() => {
    framesRef.current = Object.values(objectsRecord).filter((o) => o.type === 'frame');
  }, [objectsRecord, framesRef]);

  useEffect(() => {
    setGuidesThrottledRef.current = setGuidesThrottled;
  }, [setGuidesThrottled, setGuidesThrottledRef]);
}
