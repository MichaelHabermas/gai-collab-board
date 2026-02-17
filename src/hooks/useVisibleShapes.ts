import { useMemo } from 'react';
import type { IBoardObject } from '@/types';
import type { IViewportState } from './useCanvasViewport';

// Padding around viewport to pre-render shapes slightly outside view
const VIEWPORT_PADDING = 200;

interface IUseVisibleShapesProps {
  objects: IBoardObject[];
  viewport: IViewportState;
}

/**
 * Hook for filtering objects to only those visible in the current viewport.
 * Implements viewport culling for performance optimization.
 *
 * @param objects - All board objects
 * @param viewport - Current viewport state (position, scale, dimensions)
 * @returns Array of objects that are within or near the visible viewport
 */
export const useVisibleShapes = ({ objects, viewport }: IUseVisibleShapesProps): IBoardObject[] => {
  return useMemo(() => {
    const { position, scale, width, height } = viewport;

    // Calculate visible bounds in canvas coordinates
    const viewLeft = -position.x / scale.x - VIEWPORT_PADDING;
    const viewRight = (-position.x + width) / scale.x + VIEWPORT_PADDING;
    const viewTop = -position.y / scale.y - VIEWPORT_PADDING;
    const viewBottom = (-position.y + height) / scale.y + VIEWPORT_PADDING;

    // Filter objects that intersect with the viewport
    return objects.filter((obj) => {
      let objLeft: number;
      let objRight: number;
      let objTop: number;
      let objBottom: number;

      if (
        (obj.type === 'line' || obj.type === 'connector') &&
        obj.points &&
        obj.points.length >= 2
      ) {
        // Line/connector: bounds from points (relative to obj.x, obj.y)
        const xs = obj.points.filter((_, i) => i % 2 === 0).map((p) => obj.x + p);
        const ys = obj.points.filter((_, i) => i % 2 === 1).map((p) => obj.y + p);
        objLeft = Math.min(...xs);
        objRight = Math.max(...xs);
        objTop = Math.min(...ys);
        objBottom = Math.max(...ys);
      } else {
        objLeft = obj.x;
        objRight = obj.x + obj.width;
        objTop = obj.y;
        objBottom = obj.y + obj.height;
      }

      const isVisible =
        objRight >= viewLeft &&
        objLeft <= viewRight &&
        objBottom >= viewTop &&
        objTop <= viewBottom;

      return isVisible;
    });
  }, [objects, viewport]);
};
