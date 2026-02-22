/**
 * Connector factory — Arrow | Line | Group(2×Arrow) by arrowhead mode.
 * Port of shapes/Connector.tsx. See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 1.
 */

import Konva from 'konva';
import { getPointsCenter } from '@/lib/lineTransform';
import { getShapeShadowProps } from '@/lib/shapeShadowProps';
import { getStrokeDash } from '@/lib/strokePatterns';
import type { IBoardObject } from '@/types';
import type { ArrowheadMode } from '@/types';
import type { IShapeNodes } from './types';

const POINTER_LENGTH = 10;
const POINTER_WIDTH = 10;
const DEFAULT_STROKE_WIDTH = 2;
const DEFAULT_OPACITY = 1;

function resolveArrowheadMode(obj: IBoardObject): ArrowheadMode {
  return obj.arrowheads ?? 'end';
}

function getReversedPoints(points: number[]): number[] {
  const result: number[] = [];
  for (let i = points.length - 2; i >= 0; i -= 2) {
    result.push(points[i] ?? 0, points[i + 1] ?? 0);
  }

  return result;
}

function buildCommonAttrs(obj: IBoardObject) {
  const points = obj.points ?? [0, 0, 100, 0];
  const offset = getPointsCenter(points);
  const stroke = obj.stroke ?? '#64748b';
  const strokeWidth = obj.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const opacity = obj.opacity ?? DEFAULT_OPACITY;
  const dash = getStrokeDash(obj.strokeStyle);
  const shadow = getShapeShadowProps(false);

  return {
    id: obj.id,
    name: 'shape connector',
    x: obj.x + offset.x,
    y: obj.y + offset.y,
    offsetX: offset.x,
    offsetY: offset.y,
    points,
    stroke,
    strokeWidth,
    opacity,
    rotation: obj.rotation ?? 0,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    hitStrokeWidth: Math.max(20, strokeWidth * 3),
    perfectDrawEnabled: false,
    ...shadow,
    ...(dash ? { dash } : {}),
  };
}

export function createConnector(obj: IBoardObject): IShapeNodes {
  const mode = resolveArrowheadMode(obj);
  const showEndArrow = mode === 'end' || mode === 'both';
  const showStartArrow = mode === 'start' || mode === 'both';
  const common = buildCommonAttrs(obj);

  if (showEndArrow && !showStartArrow) {
    const arrow = new Konva.Arrow({
      ...common,
      pointerLength: POINTER_LENGTH,
      pointerWidth: POINTER_WIDTH,
      fill: common.stroke,
    });
    return { root: arrow, parts: {}, cacheable: false };
  }

  if (showStartArrow && !showEndArrow) {
    const reversedPoints = getReversedPoints(common.points);
    const arrow = new Konva.Arrow({
      ...common,
      points: reversedPoints,
      pointerLength: POINTER_LENGTH,
      pointerWidth: POINTER_WIDTH,
      fill: common.stroke,
    });
    return { root: arrow, parts: {}, cacheable: false };
  }

  if (showStartArrow && showEndArrow) {
    const reversedPoints = getReversedPoints(common.points);
    const group = new Konva.Group({
      id: common.id,
      name: common.name,
      x: common.x,
      y: common.y,
      offsetX: common.offsetX,
      offsetY: common.offsetY,
      opacity: common.opacity,
      rotation: common.rotation,
    });

    const endArrow = new Konva.Arrow({
      points: common.points,
      stroke: common.stroke,
      strokeWidth: common.strokeWidth,
      lineCap: common.lineCap,
      lineJoin: common.lineJoin,
      pointerLength: POINTER_LENGTH,
      pointerWidth: POINTER_WIDTH,
      fill: common.stroke,
      hitStrokeWidth: common.hitStrokeWidth,
      perfectDrawEnabled: false,
      ...(common.dash ? { dash: common.dash } : {}),
    });
    const startArrow = new Konva.Arrow({
      points: reversedPoints,
      stroke: common.stroke,
      strokeWidth: common.strokeWidth,
      lineCap: common.lineCap,
      lineJoin: common.lineJoin,
      pointerLength: POINTER_LENGTH,
      pointerWidth: POINTER_WIDTH,
      fill: common.stroke,
      listening: false,
      perfectDrawEnabled: false,
      ...(common.dash ? { dash: common.dash } : {}),
    });

    group.add(endArrow);
    group.add(startArrow);
    return { root: group, parts: { endArrow, startArrow }, cacheable: false };
  }

  const line = new Konva.Line(common);
  return { root: line, parts: {}, cacheable: false };
}

function applyCommonAttrs(node: Konva.Line | Konva.Arrow, obj: IBoardObject): void {
  const points = obj.points ?? [0, 0, 100, 0];
  const offset = getPointsCenter(points);
  const stroke = obj.stroke ?? '#64748b';
  const strokeWidth = obj.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const opacity = obj.opacity ?? DEFAULT_OPACITY;
  const dash = getStrokeDash(obj.strokeStyle);

  node.setAttrs({
    x: obj.x + offset.x,
    y: obj.y + offset.y,
    offsetX: offset.x,
    offsetY: offset.y,
    points,
    stroke,
    strokeWidth,
    opacity,
    rotation: obj.rotation ?? 0,
    hitStrokeWidth: Math.max(20, strokeWidth * 3),
    ...(dash ? { dash } : {}),
  });
  if (node instanceof Konva.Arrow) {
    node.fill(stroke);
  }
}

export function updateConnector(
  nodes: IShapeNodes,
  obj: IBoardObject,
  prev: IBoardObject
): boolean {
  const mode = resolveArrowheadMode(obj);
  const points = obj.points ?? [0, 0, 100, 0];
  const offset = getPointsCenter(points);

  const visualChanged =
    obj.stroke !== prev.stroke ||
    obj.strokeWidth !== prev.strokeWidth ||
    obj.opacity !== prev.opacity ||
    obj.strokeStyle !== prev.strokeStyle ||
    obj.rotation !== prev.rotation;

  if (nodes.root instanceof Konva.Line) {
    applyCommonAttrs(nodes.root as Konva.Line, obj);
    return visualChanged;
  }

  if (nodes.root instanceof Konva.Arrow) {
    const arrow = nodes.root as Konva.Arrow;
    const pointsToUse = mode === 'start' ? getReversedPoints(points) : points;
    arrow.setAttrs({
      x: obj.x + offset.x,
      y: obj.y + offset.y,
      offsetX: offset.x,
      offsetY: offset.y,
      points: pointsToUse,
      stroke: obj.stroke ?? '#64748b',
      strokeWidth: obj.strokeWidth ?? DEFAULT_STROKE_WIDTH,
      opacity: obj.opacity ?? DEFAULT_OPACITY,
      rotation: obj.rotation ?? 0,
      hitStrokeWidth: Math.max(20, (obj.strokeWidth ?? DEFAULT_STROKE_WIDTH) * 3),
      fill: obj.stroke ?? '#64748b',
      ...(getStrokeDash(obj.strokeStyle) ? { dash: getStrokeDash(obj.strokeStyle) } : {}),
    });
    return visualChanged;
  }

  if (nodes.root instanceof Konva.Group && nodes.parts.endArrow && nodes.parts.startArrow) {
    const endArrow = nodes.parts.endArrow as Konva.Arrow;
    const startArrow = nodes.parts.startArrow as Konva.Arrow;
    const stroke = obj.stroke ?? '#64748b';
    const strokeWidth = obj.strokeWidth ?? DEFAULT_STROKE_WIDTH;
    const opacity = obj.opacity ?? DEFAULT_OPACITY;
    const dash = getStrokeDash(obj.strokeStyle);
    const dashAttr = dash ? { dash } : {};

    nodes.root.setAttrs({
      x: obj.x + offset.x,
      y: obj.y + offset.y,
      offsetX: offset.x,
      offsetY: offset.y,
      opacity,
      rotation: obj.rotation ?? 0,
    });
    endArrow.setAttrs({
      points,
      stroke,
      strokeWidth,
      fill: stroke,
      hitStrokeWidth: Math.max(20, strokeWidth * 3),
      ...dashAttr,
    });
    startArrow.setAttrs({
      points: getReversedPoints(points),
      stroke,
      strokeWidth,
      fill: stroke,
      ...dashAttr,
    });
    return visualChanged;
  }

  return visualChanged;
}
