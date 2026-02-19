import Konva from 'konva';
import type { IPosition, IOverlayRect } from '@/types';

export type { IOverlayRect };

/**
 * Convert local-node corners into fixed-position screen bounds for DOM overlays.
 * Handles pan + zoom + rotation with the same mapping used by the canvas.
 */
export const getOverlayRectFromLocalCorners = (
  stage: Konva.Stage,
  transform: Konva.Transform,
  localCorners: IPosition[]
): IOverlayRect => {
  const stageBox = stage.container().getBoundingClientRect();

  const screenPoints = localCorners.map((point) => {
    // `transform` comes from node.getAbsoluteTransform(), so ancestor transforms
    // (including stage pan/zoom) are already baked into stagePoint.
    const stagePoint = transform.point(point);
    return {
      x: stageBox.left + stagePoint.x,
      y: stageBox.top + stagePoint.y,
    };
  });

  const left = Math.min(...screenPoints.map((point) => point.x));
  const top = Math.min(...screenPoints.map((point) => point.y));
  const right = Math.max(...screenPoints.map((point) => point.x));
  const bottom = Math.max(...screenPoints.map((point) => point.y));

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    avgScale: (stage.scaleX() + stage.scaleY()) / 2,
  };
};
