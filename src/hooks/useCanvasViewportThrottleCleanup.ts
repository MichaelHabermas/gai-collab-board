import { useEffect, type MutableRefObject } from 'react';

/**
 * Cleans up throttle timeout on unmount.
 */
export function useCanvasViewportThrottleCleanup(
  throttleTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
): void {
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }
    };
  }, [throttleTimeoutRef]);
}
