import { describe, expect, it } from 'vitest';
import { getAnchorPosition, isConnectableShapeType } from '@/lib/connectorAnchors';
import type { IBoardObject, ConnectorAnchor } from '@/types';

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

  it('computes rect-like sticky anchors without rotation', () => {
    const sticky = createObject({ type: 'sticky', x: 0, y: 0, width: 40, height: 40 });
    expect(getAnchorPosition(sticky, 'top')).toEqual({ x: 20, y: 0 });
    expect(getAnchorPosition(sticky, 'right')).toEqual({ x: 40, y: 20 });
    expect(getAnchorPosition(sticky, 'bottom')).toEqual({ x: 20, y: 40 });
    expect(getAnchorPosition(sticky, 'left')).toEqual({ x: 0, y: 20 });
  });

  it('computes rect-like frame anchors (default top branch)', () => {
    const frame = createObject({ type: 'frame', x: 100, y: 100, width: 200, height: 120 });
    expect(getAnchorPosition(frame, 'top')).toEqual({ x: 200, y: 100 });
    expect(getAnchorPosition(frame, 'right')).toEqual({ x: 300, y: 160 });
    expect(getAnchorPosition(frame, 'left')).toEqual({ x: 100, y: 160 });
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

  it('computes circle anchors without rotation (all four cardinal points)', () => {
    const circle = createObject({
      type: 'circle',
      x: 100,
      y: 100,
      width: 60,
      height: 40,
      rotation: 0,
    });
    const cx = 130;
    const cy = 120;
    expect(getAnchorPosition(circle, 'top')).toEqual({ x: cx, y: cy - 20 });
    expect(getAnchorPosition(circle, 'right')).toEqual({ x: cx + 30, y: cy });
    expect(getAnchorPosition(circle, 'bottom')).toEqual({ x: cx, y: cy + 20 });
    expect(getAnchorPosition(circle, 'left')).toEqual({ x: cx - 30, y: cy });
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

  it('uses default (top) for circle when anchor does not match known cases', () => {
    const circle = createObject({ type: 'circle', x: 0, y: 0, width: 40, height: 40 });
    const pos = getAnchorPosition(circle, 'unknown' as ConnectorAnchor);
    expect(pos).toEqual({ x: 20, y: 0 });
  });

  it('uses default (top) for rect-like when anchor does not match known cases', () => {
    const rect = createObject({ type: 'rectangle', x: 0, y: 0, width: 80, height: 40 });
    const pos = getAnchorPosition(rect, 'unknown' as ConnectorAnchor);
    expect(pos).toEqual({ x: 40, y: 0 });
  });

  it('computes rect anchors with undefined rotation (defaults to 0)', () => {
    const rect = createObject({
      type: 'rectangle',
      x: 10,
      y: 20,
      width: 100,
      height: 60,
      rotation: undefined,
    });
    expect(getAnchorPosition(rect, 'top')).toEqual({ x: 60, y: 20 });
  });
});
