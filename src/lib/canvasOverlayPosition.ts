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
  const stagePos = stage.position();
  const scaleX = stage.scaleX();
  const scaleY = stage.scaleY();

  const screenPoints = localCorners.map((point) => {
    const stagePoint = transform.point(point);
    return {
      x: stageBox.left + stagePoint.x * scaleX + stagePos.x,
      y: stageBox.top + stagePoint.y * scaleY + stagePos.y,
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
    avgScale: (scaleX + scaleY) / 2,
  };
};
