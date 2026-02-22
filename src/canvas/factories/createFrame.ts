/**
 * Frame shape factory.
 * Port of shapes/Frame.tsx. See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 1.
 */

import Konva from 'konva';
import type { IBoardObject } from '@/types';
import type { IShapeNodes } from './types';

const TITLE_HEIGHT = 32;
const TITLE_PADDING = 12;

export function createFrame(obj: IBoardObject): IShapeNodes {
  const { width } = obj;
  const { height } = obj;
  const opacity = obj.opacity ?? 1;
  const rotation = obj.rotation ?? 0;

  const group = new Konva.Group({
    id: obj.id,
    name: 'shape frame',
    x: obj.x,
    y: obj.y,
    width,
    height,
    opacity,
    rotation,
  });

  const titleBar = new Konva.Rect({
    name: 'frame-title-bar',
    width,
    height: TITLE_HEIGHT,
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: 0, y: TITLE_HEIGHT },
    fillLinearGradientColorStops: [0, '#f8fafc', 1, '#f1f5f9'],
    cornerRadius: [8, 8, 0, 0],
    perfectDrawEnabled: false,
  });

  const title = new Konva.Text({
    name: 'frame-title',
    x: TITLE_PADDING,
    y: (TITLE_HEIGHT - 14) / 2,
    width: width - TITLE_PADDING * 2,
    text: `▸ ${obj.text || 'Frame'}`,
    fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontStyle: '600',
    fill: '#475569',
    ellipsis: true,
    listening: false,
    perfectDrawEnabled: false,
  });

  const body = new Konva.Rect({
    name: 'frame-body',
    y: TITLE_HEIGHT,
    width,
    height: Math.max(0, height - TITLE_HEIGHT),
    fill: obj.fill ?? 'rgba(241, 245, 249, 0.5)',
    stroke: 'rgba(148, 163, 184, 0.6)',
    strokeWidth: 2,
    cornerRadius: [0, 0, 8, 8],
    dash: [8, 4],
    perfectDrawEnabled: false,
  });

  const dropHint = new Konva.Text({
    name: 'frame-drop-hint',
    y: TITLE_HEIGHT,
    width,
    height: Math.max(0, height - TITLE_HEIGHT),
    text: 'Drop to add',
    fontSize: 13,
    fontFamily: 'Inter, system-ui, sans-serif',
    fill: 'rgba(59, 130, 246, 0.5)',
    align: 'center',
    verticalAlign: 'middle',
    listening: false,
    visible: false,
    perfectDrawEnabled: false,
  });

  group.add(titleBar);
  group.add(title);
  group.add(body);
  group.add(dropHint);

  return { root: group, parts: { titleBar, body, title, dropHint }, cacheable: true };
}

export function updateFrame(nodes: IShapeNodes, obj: IBoardObject, prev: IBoardObject): boolean {
  const visualChanged =
    obj.width !== prev.width ||
    obj.height !== prev.height ||
    obj.fill !== prev.fill ||
    obj.text !== prev.text ||
    obj.opacity !== prev.opacity ||
    obj.rotation !== prev.rotation;

  const group = nodes.root as Konva.Group;
  const titleBar = nodes.parts.titleBar as Konva.Rect;
  const title = nodes.parts.title as Konva.Text;
  const body = nodes.parts.body as Konva.Rect;
  const dropHint = nodes.parts.dropHint as Konva.Text;

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

  titleBar.setAttrs({
    width,
  });

  // Note: KonvaNodeManager will append child count to this text separately if needed.
  title.setAttrs({
    width: width - TITLE_PADDING * 2,
    text: `▸ ${obj.text || 'Frame'}`,
  });

  body.setAttrs({
    width,
    height: Math.max(0, height - TITLE_HEIGHT),
    fill: obj.fill ?? 'rgba(241, 245, 249, 0.5)',
  });

  dropHint.setAttrs({
    width,
    height: Math.max(0, height - TITLE_HEIGHT),
  });

  return visualChanged;
}
