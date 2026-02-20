import { useEffect, useRef } from 'react';
import type { IViewportState } from '@/types';
import type { IPersistedViewport } from '@/types';

/**
 * Notifies parent when viewport changes (for persistence) and applies initialViewport on change.
 */
export function useCanvasViewportPersistence(
  viewport: IViewportState,
  initialViewport: IPersistedViewport | undefined,
  onViewportChange: ((viewport: IViewportState) => void) | undefined,
  viewportRef: React.MutableRefObject<IViewportState>,
  setViewport: React.Dispatch<React.SetStateAction<IViewportState>>
): void {
  const skipNextNotifyRef = useRef(true);

  useEffect(() => {
    if (skipNextNotifyRef.current) {
      skipNextNotifyRef.current = false;
      return;
    }

    onViewportChange?.(viewport);
  }, [viewport, onViewportChange]);

  useEffect(() => {
    if (!initialViewport) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setViewport((prev) => {
        const isSameViewport =
          prev.position.x === initialViewport.position.x &&
          prev.position.y === initialViewport.position.y &&
          prev.scale.x === initialViewport.scale.x &&
          prev.scale.y === initialViewport.scale.y;

        if (isSameViewport) {
          return prev;
        }

        skipNextNotifyRef.current = true;
        const next = {
          ...prev,
          position: initialViewport.position,
          scale: initialViewport.scale,
        };
        viewportRef.current = next;
        return next;
      });
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initialViewport, viewportRef, setViewport]);
}
