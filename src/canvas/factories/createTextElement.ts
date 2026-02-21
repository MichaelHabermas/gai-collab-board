/**
 * TextElement factory — Konva.Text node.
 * Port of shapes/TextElement.tsx. Overlay lifecycle handled by TextEditController.
 * See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 1.
 */

import Konva from 'konva';
import { getShapeShadowProps } from '@/lib/shapeShadowProps';
import { DEFAULT_TEXT_FONT_SIZE, DEFAULT_TEXT_WIDTH } from '@/lib/boardObjectDefaults';
import type { IBoardObject } from '@/types';
import type { IShapeNodes } from './types';

const DEFAULT_FILL = '#1f2937';
const DEFAULT_OPACITY = 1;

export function createTextElement(obj: IBoardObject): IShapeNodes {
  const text = obj.text || 'Double-click to edit';
  const fontSize = obj.fontSize ?? DEFAULT_TEXT_FONT_SIZE;
  const fill = obj.textFill ?? obj.fill ?? DEFAULT_FILL;
  const width = obj.width ?? DEFAULT_TEXT_WIDTH;
  const opacity = obj.opacity ?? DEFAULT_OPACITY;
  const shadow = getShapeShadowProps(false);

  const node = new Konva.Text({
    id: obj.id,
    name: 'shape text',
    x: obj.x,
    y: obj.y,
    text,
    fontSize,
    fontFamily: 'Inter, system-ui, sans-serif',
    fill,
    width,
    opacity,
    rotation: obj.rotation ?? 0,
    lineHeight: 1.4,
    wrap: 'word',
    perfectDrawEnabled: false,
    ...shadow,
  });

  return { root: node, parts: {}, cacheable: false };
}

export function updateTextElement(
  nodes: IShapeNodes,
  obj: IBoardObject,
  prev: IBoardObject
): boolean {
  const text = obj.text ?? 'Double-click to edit';
  const fontSize = obj.fontSize ?? DEFAULT_TEXT_FONT_SIZE;
  const fill = obj.textFill ?? obj.fill ?? DEFAULT_FILL;
  const width = obj.width ?? DEFAULT_TEXT_WIDTH;
  const opacity = obj.opacity ?? DEFAULT_OPACITY;

  const visualChanged =
    text !== (prev.text || 'Double-click to edit') ||
    fontSize !== (prev.fontSize ?? DEFAULT_TEXT_FONT_SIZE) ||
    fill !== (prev.textFill ?? prev.fill ?? DEFAULT_FILL) ||
    width !== (prev.width ?? DEFAULT_TEXT_WIDTH) ||
    opacity !== (prev.opacity ?? DEFAULT_OPACITY) ||
    (obj.rotation ?? 0) !== (prev.rotation ?? 0);

  const root = nodes.root as Konva.Text;
  root.setAttrs({
    x: obj.x,
    y: obj.y,
    text,
    fontSize,
    fill,
    width,
    opacity,
    rotation: obj.rotation ?? 0,
  });

  return visualChanged;
}
