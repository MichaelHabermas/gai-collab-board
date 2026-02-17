import { useCallback, useRef } from 'react';
import Konva from 'konva';

interface IUseBatchDrawReturn {
  requestBatchDraw: (layer: Konva.Layer | null) => void;
}

/**
 * Hook for batching Konva draw calls.
 * Uses requestAnimationFrame to batch multiple draw requests into a single frame.
 */
export const useBatchDraw = (): IUseBatchDrawReturn => {
  const pendingDraws = useRef<Set<Konva.Layer>>(new Set());
  const frameRequested = useRef(false);

  const processBatchDraws = useCallback(() => {
    pendingDraws.current.forEach((layer) => {
      if (layer && !layer.isDestroyed()) {
        layer.batchDraw();
      }
    });
    pendingDraws.current.clear();
    frameRequested.current = false;
  }, []);

  const requestBatchDraw = useCallback(
    (layer: Konva.Layer | null) => {
      if (!layer) return;

      pendingDraws.current.add(layer);

      if (!frameRequested.current) {
        frameRequested.current = true;
        requestAnimationFrame(processBatchDraws);
      }
    },
    [processBatchDraws]
  );

  return { requestBatchDraw };
};
