import { useMemo, useRef } from 'react';
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
  const previousVisibleObjectsRef = useRef<IBoardObject[]>([]);

  return useMemo(() => {
    const { position, scale, width, height } = viewport;

    // Calculate visible bounds in canvas coordinates
    const viewLeft = -position.x / scale.x - VIEWPORT_PADDING;
    const viewRight = (-position.x + width) / scale.x + VIEWPORT_PADDING;
    const viewTop = -position.y / scale.y - VIEWPORT_PADDING;
    const viewBottom = (-position.y + height) / scale.y + VIEWPORT_PADDING;

    // Filter objects that intersect with the viewport
    const nextVisibleObjects = objects.filter((obj) => {
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
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (let pointIndex = 0; pointIndex < obj.points.length - 1; pointIndex += 2) {
          const pointX = obj.x + obj.points[pointIndex];
          const pointY = obj.y + obj.points[pointIndex + 1];
          minX = Math.min(minX, pointX);
          maxX = Math.max(maxX, pointX);
          minY = Math.min(minY, pointY);
          maxY = Math.max(maxY, pointY);
        }

        objLeft = minX;
        objRight = maxX;
        objTop = minY;
        objBottom = maxY;
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

    const previousVisibleObjects = previousVisibleObjectsRef.current;
    const isSameShapeSet =
      previousVisibleObjects.length === nextVisibleObjects.length &&
      previousVisibleObjects.every((object, index) => object === nextVisibleObjects[index]);

    if (isSameShapeSet) {
      return previousVisibleObjects;
    }

    previousVisibleObjectsRef.current = nextVisibleObjects;
    return nextVisibleObjects;
  }, [objects, viewport]);
};
