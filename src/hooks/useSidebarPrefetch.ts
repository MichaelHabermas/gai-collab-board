import { useEffect } from 'react';

/**
 * Prefetch heavy sidebar chunks (AIChatPanel, PropertyInspector) during idle time after mount.
 */
export function useSidebarPrefetch(): void {
  useEffect(() => {
    const prefetch = (): void => {
      void import('@/components/ai/AIChatPanel');
      void import('@/components/canvas/PropertyInspector');
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(prefetch);

      return () => window.cancelIdleCallback(id);
    }

    const id = setTimeout(prefetch, 2000);

    return () => clearTimeout(id);
  }, []);
}
