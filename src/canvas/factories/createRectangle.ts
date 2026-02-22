/**
 * Rectangle shape factory.
 * Port of shapes/RectangleShape.tsx. See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 1.
 */

import Konva from 'konva';
import { getShapeShadowProps } from '@/lib/shapeShadowProps';
import { DEFAULT_SHAPE_STROKE, DEFAULT_SHAPE_STROKE_WIDTH } from '@/lib/boardObjectDefaults';
import type { IBoardObject } from '@/types';
import type { IShapeNodes } from './types';

export function createRectangle(obj: IBoardObject): IShapeNodes {
  const stroke = obj.stroke ?? DEFAULT_SHAPE_STROKE;
  const strokeWidth = obj.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH;
  const opacity = obj.opacity ?? 1;
  const shadow = getShapeShadowProps(false, { includeShadowForStrokeEnabled: true });

  const rect = new Konva.Rect({
    id: obj.id,
    name: 'shape rectangle',
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    fill: obj.fill,
    stroke,
    strokeWidth,
    opacity,
    rotation: obj.rotation ?? 0,
    perfectDrawEnabled: false,
    ...shadow,
  });

  return { root: rect, parts: {}, cacheable: false };
}

export function updateRectangle(
  nodes: IShapeNodes,
  obj: IBoardObject,
  prev: IBoardObject
): boolean {
  const visualChanged =
    obj.width !== prev.width ||
    obj.height !== prev.height ||
    obj.fill !== prev.fill ||
    obj.stroke !== prev.stroke ||
    obj.strokeWidth !== prev.strokeWidth ||
    obj.opacity !== prev.opacity ||
    obj.rotation !== prev.rotation;

  const rect = nodes.root as Konva.Rect;

  rect.setAttrs({
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    fill: obj.fill,
    stroke: obj.stroke ?? DEFAULT_SHAPE_STROKE,
    strokeWidth: obj.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH,
    opacity: obj.opacity ?? 1,
    rotation: obj.rotation ?? 0,
  });

  return visualChanged;
}
