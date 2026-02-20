import { useMemo } from 'react';
import { useObjectsStore, spatialIndex } from '@/stores/objectsStore';
import type { IBoardObject, IViewportState } from '@/types';

const VIEWPORT_PADDING = 200;

/**
 * Returns the IDs of objects visible in the current viewport, sorted with
 * frames first (render order). Uses the spatial index for fast candidate
 * narrowing, then does precise AABB checks on candidates only.
 */
export const useVisibleShapeIds = (viewport: IViewportState): string[] => {
  const objectsRecord = useObjectsStore((s) => s.objects);

  return useMemo(() => {
    const { position, scale, width, height } = viewport;

    const viewLeft = -position.x / scale.x - VIEWPORT_PADDING;
    const viewRight = (-position.x + width) / scale.x + VIEWPORT_PADDING;
    const viewTop = -position.y / scale.y - VIEWPORT_PADDING;
    const viewBottom = (-position.y + height) / scale.y + VIEWPORT_PADDING;

    // Use spatial index to narrow candidates (O(cells) instead of O(n))
    const candidates = spatialIndex.size > 0
      ? spatialIndex.query({ x1: viewLeft, y1: viewTop, x2: viewRight, y2: viewBottom })
      : null;

    const visibleIds: { id: string; isFrame: boolean }[] = [];

    // Iterate candidates from spatial index, or fall back to full scan if index is empty
    const idsToCheck = candidates ?? Object.keys(objectsRecord);

    for (const id of idsToCheck) {
      const obj = objectsRecord[id] as IBoardObject | undefined;
      if (!obj) continue;

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
