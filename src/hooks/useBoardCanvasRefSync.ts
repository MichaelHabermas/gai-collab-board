import { useEffect, type MutableRefObject } from 'react';
import type { IBoardObject } from '@/types';
import type { ToolMode } from '@/types';

/**
 * Keeps objectsRef and activeToolRef in sync with React state.
 * Ref assignment during render is disallowed, so we use effects.
 */
export function useBoardCanvasRefSync(
  objects: IBoardObject[],
  activeTool: ToolMode,
  objectsRef: MutableRefObject<IBoardObject[]>,
  activeToolRef: MutableRefObject<ToolMode>
): void {
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects, objectsRef]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool, activeToolRef]);
}
