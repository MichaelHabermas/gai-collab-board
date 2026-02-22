/**
 * Circle/Ellipse shape factory.
 * Port of shapes/CircleShape.tsx. See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 1.
 */

import Konva from 'konva';
import { getShapeShadowProps } from '@/lib/shapeShadowProps';
import { DEFAULT_SHAPE_STROKE, DEFAULT_SHAPE_STROKE_WIDTH } from '@/lib/boardObjectDefaults';
import type { IBoardObject } from '@/types';
import type { IShapeNodes } from './types';

export function createCircle(obj: IBoardObject): IShapeNodes {
  const stroke = obj.stroke ?? DEFAULT_SHAPE_STROKE;
  const strokeWidth = obj.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH;
  const opacity = obj.opacity ?? 1;
  const radiusX = obj.width / 2;
  const radiusY = obj.height / 2;
  const shadow = getShapeShadowProps(false, { includeShadowForStrokeEnabled: true });

  const ellipse = new Konva.Ellipse({
    id: obj.id,
    name: 'shape circle',
    x: obj.x + radiusX,
    y: obj.y + radiusY,
    radiusX,
    radiusY,
    fill: obj.fill,
    stroke,
    strokeWidth,
    opacity,
    rotation: obj.rotation ?? 0,
    perfectDrawEnabled: false,
    ...shadow,
  });

  return { root: ellipse, parts: {}, cacheable: false };
}

export function updateCircle(nodes: IShapeNodes, obj: IBoardObject, prev: IBoardObject): boolean {
  const visualChanged =
    obj.width !== prev.width ||
    obj.height !== prev.height ||
    obj.fill !== prev.fill ||
    obj.stroke !== prev.stroke ||
    obj.strokeWidth !== prev.strokeWidth ||
    obj.opacity !== prev.opacity ||
    obj.rotation !== prev.rotation;

  const ellipse = nodes.root as Konva.Ellipse;
  const radiusX = obj.width / 2;
  const radiusY = obj.height / 2;

  ellipse.setAttrs({
    x: obj.x + radiusX,
    y: obj.y + radiusY,
    radiusX,
    radiusY,
    fill: obj.fill,
    stroke: obj.stroke ?? DEFAULT_SHAPE_STROKE,
    strokeWidth: obj.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH,
    opacity: obj.opacity ?? 1,
    rotation: obj.rotation ?? 0,
  });

  return visualChanged;
}
