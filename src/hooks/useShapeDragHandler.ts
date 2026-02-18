import { useCallback } from 'react';
import type { IKonvaDragEvent } from '@/types';

interface IUseShapeDragHandlerOptions {
  offsetX?: number;
  offsetY?: number;
}

/**
 * Shared drag-end adapter for shape components.
 * Converts Konva node coordinates to persisted coordinates before calling onDragEnd.
 */
export const useShapeDragHandler = (
  onDragEnd?: (x: number, y: number) => void,
  options?: IUseShapeDragHandlerOptions
): ((e: IKonvaDragEvent) => void) => {
  const offsetX = options?.offsetX ?? 0;
  const offsetY = options?.offsetY ?? 0;

  return useCallback(
    (e: IKonvaDragEvent) => {
      onDragEnd?.(e.target.x() - offsetX, e.target.y() - offsetY);
    },
    [onDragEnd, offsetX, offsetY]
  );
};
