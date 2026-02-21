import Konva from 'konva';
import type { IBoardObject, IBoard } from './index';

export function isBoardObject(value: unknown): value is IBoardObject {
  return typeof value === 'object' && value !== null && 'id' in value && 'type' in value;
}

export function isBoard(value: unknown): value is IBoard {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'ownerId' in value
  );
}

export function isKonvaGroup(node: Konva.Node): node is Konva.Group {
  return typeof node === 'object' && node !== null && node.getClassName() === 'Group';
}

export function isKonvaRect(node: Konva.Node): node is Konva.Rect {
  return typeof node === 'object' && node !== null && node.getClassName() === 'Rect';
}

export function isKonvaEllipse(node: Konva.Node): node is Konva.Ellipse {
  return typeof node === 'object' && node !== null && node.getClassName() === 'Ellipse';
}

export function isKonvaLine(node: Konva.Node): node is Konva.Line {
  if (typeof node !== 'object' || !node) return false;

  const name = node.getClassName();
  return name === 'Line' || name === 'Arrow';
}

export function isKonvaText(node: Konva.Node): node is Konva.Text {
  return typeof node === 'object' && node !== null && node.getClassName() === 'Text';
}
