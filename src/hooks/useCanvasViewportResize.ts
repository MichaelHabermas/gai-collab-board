import { useEffect } from 'react';
import type { IViewportState } from '@/types';

/**
 * Listens to window resize and updates viewport state and ref with new dimensions.
 */
export function useCanvasViewportResize(
  viewportRef: React.MutableRefObject<IViewportState>,
  setViewport: React.Dispatch<React.SetStateAction<IViewportState>>
): void {
  useEffect(() => {
    const handleResize = () => {
      const next = {
        ...viewportRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
      };
      viewportRef.current = next;
      setViewport(next);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewportRef, setViewport]);
}
