import { useEffect, type MutableRefObject } from 'react';
import type { IBoardObject } from '@/types';
import type { ToolMode } from '@/types';

/**
 * Keeps objectsRecordRef and activeToolRef in sync with React state.
 * Ref assignment during render is disallowed, so we use effects.
 */
export function useBoardCanvasRefSync(
  objectsRecord: Record<string, IBoardObject>,
  activeTool: ToolMode,
  objectsRecordRef: MutableRefObject<Record<string, IBoardObject>>,
  activeToolRef: MutableRefObject<ToolMode>
): void {
  useEffect(() => {
    objectsRecordRef.current = objectsRecord;
  }, [objectsRecord, objectsRecordRef]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool, activeToolRef]);
}
