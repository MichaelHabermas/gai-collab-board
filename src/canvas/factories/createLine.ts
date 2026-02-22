/**
 * Line shape factory.
 * Port of shapes/LineShape.tsx. See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 1.
 */

import Konva from 'konva';
import { getPointsCenter } from '@/lib/lineTransform';
import { getShapeShadowProps } from '@/lib/shapeShadowProps';
import type { IBoardObject } from '@/types';
import type { IShapeNodes } from './types';

export function createLine(obj: IBoardObject): IShapeNodes {
  const points = obj.points ?? [0, 0, 100, 0];
  const offset = getPointsCenter(points);
  const stroke = obj.stroke ?? '#1e293b';
  const strokeWidth = obj.strokeWidth ?? 3;
  const opacity = obj.opacity ?? 1;
  const shadow = getShapeShadowProps(false);

  const line = new Konva.Line({
    id: obj.id,
    name: 'shape line',
    x: obj.x + offset.x,
    y: obj.y + offset.y,
    offsetX: offset.x,
    offsetY: offset.y,
    points,
    stroke,
    strokeWidth,
    opacity,
    rotation: obj.rotation ?? 0,
    lineCap: 'round',
    lineJoin: 'round',
    hitStrokeWidth: Math.max(20, strokeWidth * 3),
    perfectDrawEnabled: false,
    ...shadow,
  });

  return { root: line, parts: {}, cacheable: false };
}

export function updateLine(nodes: IShapeNodes, obj: IBoardObject, prev: IBoardObject): boolean {
  const visualChanged =
    obj.points !== prev.points ||
    obj.stroke !== prev.stroke ||
    obj.strokeWidth !== prev.strokeWidth ||
    obj.opacity !== prev.opacity ||
    obj.rotation !== prev.rotation;

  const line = nodes.root as Konva.Line;
  const points = obj.points ?? [0, 0, 100, 0];
  const offset = getPointsCenter(points);
  const strokeWidth = obj.strokeWidth ?? 3;

  line.setAttrs({
    x: obj.x + offset.x,
    y: obj.y + offset.y,
    offsetX: offset.x,
    offsetY: offset.y,
    points,
    stroke: obj.stroke ?? '#1e293b',
    strokeWidth,
    opacity: obj.opacity ?? 1,
    rotation: obj.rotation ?? 0,
    hitStrokeWidth: Math.max(20, strokeWidth * 3),
  });

  return visualChanged;
}
