import { useCallback } from 'react';
import Konva from 'konva';
import type { ITransformEndAttrsUnion, IKonvaEvent } from '@/types';

const MIN_SIZE = 10;
const MIN_FONT_SIZE = 8;
const MIN_TEXT_WIDTH = 50;

export type ShapeTransformKind = 'rect' | 'ellipse' | 'line' | 'text';

export type { ITransformEndAttrsUnion };

interface IUseShapeTransformHandlerOptions {
  /** Required for kind 'text' to scale fontSize correctly. */
  fontSize?: number;
}

/**
 * Shared transform-end handler for shape components.
 * Reads scale from the Konva node, resets it, computes attrs by shape kind, and calls onTransformEnd.
 */
export const useShapeTransformHandler = (
  kind: ShapeTransformKind,
  onTransformEnd: ((attrs: ITransformEndAttrsUnion) => void) | undefined,
  options?: IUseShapeTransformHandlerOptions
): ((e: IKonvaEvent) => void) => {
  const fontSize = options?.fontSize;

  return useCallback(
    (e: IKonvaEvent) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      node.scaleX(1);
      node.scaleY(1);

      if (kind === 'rect') {
        const rect = node as Konva.Rect;
        onTransformEnd?.({
          x: rect.x(),
          y: rect.y(),
          width: Math.max(MIN_SIZE, rect.width() * scaleX),
          height: Math.max(MIN_SIZE, rect.height() * scaleY),
          rotation: rect.rotation(),
        });
        return;
      }

      if (kind === 'ellipse') {
        const ellipse = node as Konva.Ellipse;
        const minRadius = MIN_SIZE;
        const rx = Math.max(minRadius, ellipse.radiusX() * scaleX);
        const ry = Math.max(minRadius, ellipse.radiusY() * scaleY);
        onTransformEnd?.({
          x: ellipse.x() - rx,
          y: ellipse.y() - ry,
          width: rx * 2,
          height: ry * 2,
          rotation: ellipse.rotation(),
        });
        return;
      }

      if (kind === 'line') {
        const lineNode = node as Konva.Line;
        const currentPoints = lineNode.points();
        const scaledPoints = currentPoints.map((p, i) => (i % 2 === 0 ? p * scaleX : p * scaleY));
        onTransformEnd?.({
          x: lineNode.x(),
          y: lineNode.y(),
          points: scaledPoints,
          rotation: lineNode.rotation(),
        });
        return;
      }

      if (kind === 'text' && fontSize !== undefined) {
        const textNode = node as Konva.Text;
        const newFontSize = Math.max(MIN_FONT_SIZE, fontSize * Math.max(scaleX, scaleY));
        onTransformEnd?.({
          x: textNode.x(),
          y: textNode.y(),
          width: Math.max(MIN_TEXT_WIDTH, textNode.width() * scaleX),
          fontSize: newFontSize,
          rotation: textNode.rotation(),
        });
      }
    },
    [kind, onTransformEnd, fontSize]
  );
};
