import { describe, expect, it } from 'vitest';
import { getAnchorPosition, isConnectableShapeType } from '@/lib/connectorAnchors';
import type { IBoardObject } from '@/types';

const createObject = (
  overrides: Partial<Pick<IBoardObject, 'type' | 'x' | 'y' | 'width' | 'height' | 'rotation'>>
): Pick<IBoardObject, 'type' | 'x' | 'y' | 'width' | 'height' | 'rotation'> => ({
  type: overrides.type ?? 'rectangle',
  x: overrides.x ?? 100,
  y: overrides.y ?? 200,
  width: overrides.width ?? 80,
  height: overrides.height ?? 40,
  rotation: overrides.rotation ?? 0,
});

describe('connectorAnchors', () => {
  it('identifies connectable shape types', () => {
    expect(isConnectableShapeType('rectangle')).toBe(true);
    expect(isConnectableShapeType('circle')).toBe(true);
    expect(isConnectableShapeType('sticky')).toBe(true);
    expect(isConnectableShapeType('frame')).toBe(true);
    expect(isConnectableShapeType('text')).toBe(false);
    expect(isConnectableShapeType('line')).toBe(false);
  });

  it('computes rectangle anchors without rotation', () => {
    const rectangle = createObject({ type: 'rectangle', x: 10, y: 20, width: 100, height: 60 });

    expect(getAnchorPosition(rectangle, 'top')).toEqual({ x: 60, y: 20 });
    expect(getAnchorPosition(rectangle, 'right')).toEqual({ x: 110, y: 50 });
    expect(getAnchorPosition(rectangle, 'bottom')).toEqual({ x: 60, y: 80 });
    expect(getAnchorPosition(rectangle, 'left')).toEqual({ x: 10, y: 50 });
  });

  it('computes rectangle anchors with rotation around top-left origin', () => {
    const rectangle = createObject({
      type: 'sticky',
      x: 10,
      y: 20,
      width: 100,
      height: 60,
      rotation: 90,
    });

    const topAnchor = getAnchorPosition(rectangle, 'top');
    expect(topAnchor.x).toBeCloseTo(10, 5);
    expect(topAnchor.y).toBeCloseTo(70, 5);
  });

  it('computes circle anchors with rotation around center', () => {
    const circle = createObject({
      type: 'circle',
      x: 50,
      y: 60,
      width: 80,
      height: 40,
      rotation: 90,
    });

    const rightAnchor = getAnchorPosition(circle, 'right');
    expect(rightAnchor.x).toBeCloseTo(90, 5);
    expect(rightAnchor.y).toBeCloseTo(120, 5);
  });
});
