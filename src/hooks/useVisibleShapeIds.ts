import { useMemo } from 'react';
import { useObjectsStore } from '@/stores/objectsStore';
import type { IBoardObject, IViewportState } from '@/types';

const VIEWPORT_PADDING = 200;

/**
 * Returns the IDs of objects visible in the current viewport, sorted with
 * frames first (render order). Reads from the Zustand objectsStore so the
 * parent does NOT need an `objects` prop for the render loop.
 */
export const useVisibleShapeIds = (viewport: IViewportState): string[] => {
  const objectsRecord = useObjectsStore((s) => s.objects);

  return useMemo(() => {
    const { position, scale, width, height } = viewport;

    const viewLeft = -position.x / scale.x - VIEWPORT_PADDING;
    const viewRight = (-position.x + width) / scale.x + VIEWPORT_PADDING;
    const viewTop = -position.y / scale.y - VIEWPORT_PADDING;
    const viewBottom = (-position.y + height) / scale.y + VIEWPORT_PADDING;

    const visibleIds: { id: string; isFrame: boolean }[] = [];

    for (const id in objectsRecord) {
      const obj = objectsRecord[id] as IBoardObject;
      let objLeft: number;
      let objRight: number;
      let objTop: number;
      let objBottom: number;

      if (
        (obj.type === 'line' || obj.type === 'connector') &&
        obj.points &&
        obj.points.length >= 2
      ) {
        const { points } = obj;
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < points.length - 1; i += 2) {
          const px = obj.x + (points[i] ?? 0);
          const py = obj.y + (points[i + 1] ?? 0);
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minY = Math.min(minY, py);
          maxY = Math.max(maxY, py);
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

      if (isVisible) {
        visibleIds.push({ id, isFrame: obj.type === 'frame' });
      }
    }

    // Frames render behind non-frames (stable sort: frames first)
    visibleIds.sort((a, b) => (a.isFrame ? 0 : 1) - (b.isFrame ? 0 : 1));

    return visibleIds.map((v) => v.id);
  }, [objectsRecord, viewport]);
};
