import { describe, expect, it } from 'vitest';
import type Konva from 'konva';
import { getOverlayRectFromLocalCorners } from '@/lib/canvasOverlayPosition';

const createStageMock = ({
  left = 100,
  top = 50,
  x = 10,
  y = 20,
  scaleX = 2,
  scaleY = 3,
}: {
  left?: number;
  top?: number;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
} = {}): Konva.Stage =>
  ({
    container: () => ({
      getBoundingClientRect: () => ({
        left,
        top,
      }),
    }),
    position: () => ({ x, y }),
    scaleX: () => scaleX,
    scaleY: () => scaleY,
  }) as unknown as Konva.Stage;

const createTransformMock = (pointMapper: (point: { x: number; y: number }) => { x: number; y: number }) =>
  ({
    point: (point: { x: number; y: number }) => pointMapper(point),
  }) as unknown as Konva.Transform;

describe('canvasOverlayPosition', () => {
  it('maps local corners to screen-space overlay bounds', () => {
    const stage = createStageMock();
    const transform = createTransformMock((point) => ({
      x: point.x + 5,
      y: point.y + 10,
    }));

    const result = getOverlayRectFromLocalCorners(stage, transform, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 20 },
      { x: 0, y: 20 },
    ]);

    expect(result.left).toBe(105);
    expect(result.top).toBe(60);
    expect(result.width).toBe(10);
    expect(result.height).toBe(20);
    expect(result.avgScale).toBe(2.5);
  });

  it('enforces minimum width/height of 1 for degenerate corners', () => {
    const stage = createStageMock({ scaleX: 1, scaleY: 1, x: 0, y: 0, left: 0, top: 0 });
    const transform = createTransformMock((point) => point);

    const result = getOverlayRectFromLocalCorners(stage, transform, [
      { x: 10, y: 20 },
      { x: 10, y: 20 },
      { x: 10, y: 20 },
      { x: 10, y: 20 },
    ]);

    expect(result.left).toBe(10);
    expect(result.top).toBe(20);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  it('does not double-apply stage pan/zoom when using absolute transforms', () => {
    const stage = createStageMock({ left: 100, top: 200, x: 30, y: 40, scaleX: 2, scaleY: 2 });
    const transform = createTransformMock((point) => ({
      // Simulate node.getAbsoluteTransform().point(point): already includes stage transforms.
      x: 130 + point.x * 2,
      y: 70 + point.y * 2,
    }));

    const result = getOverlayRectFromLocalCorners(stage, transform, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 20 },
      { x: 0, y: 20 },
    ]);

    expect(result.left).toBe(230);
    expect(result.top).toBe(270);
    expect(result.width).toBe(20);
    expect(result.height).toBe(40);
  });
});
