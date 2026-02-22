/**
 * Sticky Note shape factory.
 * Port of shapes/StickyNote.tsx. See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 1.
 */

import Konva from 'konva';
import type { IBoardObject } from '@/types';
import type { IShapeNodes } from './types';

export function createStickyNote(obj: IBoardObject): IShapeNodes {
  const { width } = obj;
  const { height } = obj;
  const opacity = obj.opacity ?? 1;
  const rotation = obj.rotation ?? 0;
  const textFill = obj.textFill ?? '#000000';
  const fontSize = obj.fontSize ?? 14;

  const group = new Konva.Group({
    id: obj.id,
    name: 'shape sticky',
    x: obj.x,
    y: obj.y,
    width,
    height,
    opacity,
    rotation,
  });

  const bg = new Konva.Rect({
    name: 'sticky-bg',
    width,
    height,
    fill: obj.fill,
    cornerRadius: 4,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowBlur: 8,
    shadowOpacity: 0.2,
    shadowOffsetX: 3,
    shadowOffsetY: 3,
    shadowForStrokeEnabled: false,
    perfectDrawEnabled: false,
  });

  const fold = new Konva.Rect({
    name: 'sticky-fold',
    x: width - 20,
    y: 0,
    width: 20,
    height: 20,
    fill: 'rgba(0, 0, 0, 0.05)',
    listening: false,
    perfectDrawEnabled: false,
  });

  const text = new Konva.Text({
    name: 'sticky-text',
    x: 8,
    y: 8,
    width: width - 16,
    height: height - 16,
    text: obj.text ?? '',
    fontSize,
    fontFamily: 'Inter, system-ui, sans-serif',
    fill: textFill,
    lineHeight: 1.4,
    wrap: 'word',
    ellipsis: true,
    listening: false,
    perfectDrawEnabled: false,
  });

  group.add(bg);
  group.add(fold);
  group.add(text);

  return { root: group, parts: { bg, fold, text }, cacheable: true };
}

export function updateStickyNote(
  nodes: IShapeNodes,
  obj: IBoardObject,
  prev: IBoardObject
): boolean {
  const visualChanged =
    obj.width !== prev.width ||
    obj.height !== prev.height ||
    obj.fill !== prev.fill ||
    obj.text !== prev.text ||
    obj.textFill !== prev.textFill ||
    obj.fontSize !== prev.fontSize ||
    obj.opacity !== prev.opacity ||
    obj.rotation !== prev.rotation;

  const group = nodes.root as Konva.Group;
  const bg = nodes.parts.bg as Konva.Rect;
  const fold = nodes.parts.fold as Konva.Rect;
  const text = nodes.parts.text as Konva.Text;

  const { width } = obj;
  const { height } = obj;

  group.setAttrs({
    x: obj.x,
    y: obj.y,
    width,
    height,
    opacity: obj.opacity ?? 1,
    rotation: obj.rotation ?? 0,
  });

  bg.setAttrs({
    width,
    height,
    fill: obj.fill,
  });

  fold.setAttrs({
    x: width - 20,
  });

  text.setAttrs({
    width: width - 16,
    height: height - 16,
    text: obj.text ?? '',
    fontSize: obj.fontSize ?? 14,
    fill: obj.textFill ?? '#000000',
  });

  return visualChanged;
}
