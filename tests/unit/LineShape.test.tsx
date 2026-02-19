import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LineShape } from '@/components/canvas/shapes/LineShape';
import {
  SHADOW_BLUR_DEFAULT,
  SHADOW_BLUR_SELECTED,
  SHADOW_COLOR,
} from '@/lib/canvasShadows';
import { getObjectBounds } from '@/lib/canvasBounds';
import { scaleLinePointsLengthOnly } from '@/lib/lineTransform';
import type { IBoardObject } from '@/types';

let latestLineProps: Record<string, unknown> | null = null;

vi.mock('react-konva', () => ({
  Line: (props: Record<string, unknown>) => {
    latestLineProps = props;
    return <div data-testid='line-shape' />;
  },
}));

describe('LineShape', () => {
  beforeEach(() => {
    latestLineProps = null;
  });

  it('renders selected line styles and expanded hit area', () => {
    render(
      <LineShape
        id='line-1'
        x={10}
        y={20}
        points={[0, 0, 100, 40]}
        stroke='#0f172a'
        strokeWidth={4}
        isSelected={true}
      />
    );

    expect(latestLineProps?.stroke).toBe('#3b82f6');
    expect(latestLineProps?.strokeWidth).toBe(5);
    expect(latestLineProps?.hitStrokeWidth).toBe(20);
    expect(latestLineProps?.shadowColor).toBe(SHADOW_COLOR);
    expect(latestLineProps?.shadowBlur).toBe(SHADOW_BLUR_SELECTED);
  });

  it('renders line with slight shadow when not selected', () => {
    render(
      <LineShape
        id='line-shadow'
        x={0}
        y={0}
        points={[0, 0, 50, 50]}
        stroke='#0f172a'
      />
    );

    expect(latestLineProps?.shadowColor).toBe(SHADOW_COLOR);
    expect(latestLineProps?.shadowBlur).toBe(SHADOW_BLUR_DEFAULT);
  });

  it('reports origin coordinates on drag end so line does not jump', () => {
    const onDragEnd = vi.fn();
    // points [0,0, 10,10] => center (5, 5). Node is drawn at (x+5, y+5); we must persist (node - offset).
    render(
      <LineShape
        id='line-2'
        x={0}
        y={0}
        points={[0, 0, 10, 10]}
        stroke='#0f172a'
        onDragEnd={onDragEnd}
      />
    );

    const dragEndHandler = latestLineProps?.onDragEnd as ((event: unknown) => void) | undefined;
    dragEndHandler?.({
      target: {
        x: () => 42,
        y: () => 24,
      },
    });

    expect(onDragEnd).toHaveBeenCalledWith(37, 19);
  });

  it('passes no fill prop to Konva Line (line color is controlled by stroke only)', () => {
    render(
      <LineShape
        id='line-no-fill'
        x={0}
        y={0}
        points={[0, 0, 80, 0]}
        stroke='#ff0000'
        strokeWidth={3}
      />
    );

    // Lines have no fill attribute — the stroke prop determines the color.
    expect(latestLineProps?.fill).toBeUndefined();
    expect(latestLineProps?.stroke).toBe('#ff0000');
  });

  it('rotation is persisted in transform end attrs', () => {
    const onTransformEnd = vi.fn();
    let scaleXValue = 1.5;
    let scaleYValue = 1;

    render(
      <LineShape
        id='line-rotation'
        x={0}
        y={0}
        points={[0, 0, 100, 0]}
        stroke='#0f172a'
        rotation={45}
        onTransformEnd={onTransformEnd}
      />
    );

    const transformEndHandler = latestLineProps?.onTransformEnd as
      | ((event: unknown) => void)
      | undefined;
    const node = {
      scaleX: (next?: number) => {
        if (typeof next === 'number') {
          scaleXValue = next;
        }
        return scaleXValue;
      },
      scaleY: (next?: number) => {
        if (typeof next === 'number') {
          scaleYValue = next;
        }
        return scaleYValue;
      },
      points: () => [0, 0, 100, 0],
      x: () => 50,
      y: () => 0,
      rotation: () => 45,
    };

    transformEndHandler?.({ target: node });

    const call = onTransformEnd.mock.calls[0];
    if (!call) {
      throw new Error('expected onTransformEnd to be called');
    }
    expect(call[0]).toMatchObject({ rotation: 45 });
  });

  it('scales points length-only on transform and resets scale', () => {
    const onTransformEnd = vi.fn();
    let scaleXValue = 2;
    let scaleYValue = 3;

    render(
      <LineShape
        id='line-3'
        x={0}
        y={0}
        points={[0, 0, 10, 20]}
        stroke='#0f172a'
        onTransformEnd={onTransformEnd}
      />
    );

    const transformEndHandler = latestLineProps?.onTransformEnd as
      | ((event: unknown) => void)
      | undefined;
    const node = {
      scaleX: (next?: number) => {
        if (typeof next === 'number') {
          scaleXValue = next;
        }
        return scaleXValue;
      },
      scaleY: (next?: number) => {
        if (typeof next === 'number') {
          scaleYValue = next;
        }
        return scaleYValue;
      },
      points: () => [0, 0, 5, 10],
      x: () => 7,
      y: () => 9,
      rotation: () => 35,
    };

    transformEndHandler?.({ target: node });

    const call = onTransformEnd.mock.calls[0];
    if (!call) {
      throw new Error('expected onTransformEnd to be called');
    }
    const attrs = call[0];
    expect(attrs).toMatchObject({ rotation: 35 });
    expect(attrs.x).toBeCloseTo(4.5, 1);
    expect(attrs.y).toBeCloseTo(4, 1);
    expect(attrs.points).toBeDefined();
    const pts = attrs.points as number[];
    expect(pts).toHaveLength(4);
    expect(pts[0]).toBeCloseTo(-4.57, 1);
    expect(pts[1]).toBeCloseTo(-9.14, 1);
    expect(pts[2]).toBeCloseTo(9.57, 1);
    expect(pts[3]).toBeCloseTo(19.14, 1);
    expect(scaleXValue).toBe(1);
    expect(scaleYValue).toBe(1);
  });
});

// ─── Marquee selection for lines ─────────────────────────────────────────────

function makeLine(id: string, x: number, y: number, pts: number[]): IBoardObject {
  return {
    id,
    type: 'line',
    x,
    y,
    width: 0,
    height: 0,
    rotation: 0,
    fill: 'transparent',
    stroke: '#000',
    points: pts,
    createdBy: 'test',
    createdAt: {} as IBoardObject['createdAt'],
    updatedAt: {} as IBoardObject['updatedAt'],
  };
}

describe('Marquee selection of line objects via getObjectBounds', () => {
  it('line bounds are derived from points, not width/height', () => {
    const line = makeLine('l1', 100, 50, [0, 0, 200, 100]);
    const bounds = getObjectBounds(line);
    expect(bounds.x1).toBe(100);
    expect(bounds.y1).toBe(50);
    expect(bounds.x2).toBe(300);
    expect(bounds.y2).toBe(150);
  });

  it('marquee that overlaps line bounds selects the line', () => {
    const line = makeLine('l2', 0, 0, [10, 10, 90, 90]);
    const bounds = getObjectBounds(line);
    // Simulate marquee selection logic from BoardCanvas
    const sel = { x1: 0, y1: 0, x2: 60, y2: 60 };
    const selected =
      bounds.x1 < sel.x2 && bounds.x2 > sel.x1 && bounds.y1 < sel.y2 && bounds.y2 > sel.y1;
    expect(selected).toBe(true);
  });

  it('marquee that does not overlap line bounds does not select the line', () => {
    const line = makeLine('l3', 200, 200, [0, 0, 50, 50]);
    const bounds = getObjectBounds(line);
    const sel = { x1: 0, y1: 0, x2: 100, y2: 100 };
    const selected =
      bounds.x1 < sel.x2 && bounds.x2 > sel.x1 && bounds.y1 < sel.y2 && bounds.y2 > sel.y1;
    expect(selected).toBe(false);
  });
});

// ─── Length-only resize: no "width" gain ─────────────────────────────────────

describe('scaleLinePointsLengthOnly — no perpendicular width gain', () => {
  it('after scaling, all points remain collinear with original line direction', () => {
    // Horizontal line from (0,0) to (100,0); center is (50,0).
    const points = [0, 0, 100, 0];
    const { points: result } = scaleLinePointsLengthOnly(points, 2, 1);
    const y0 = result[1] ?? 0;
    const y1 = result[3] ?? 0;
    // Horizontal line: all y coordinates must stay 0
    expect(y0).toBeCloseTo(0, 5);
    expect(y1).toBeCloseTo(0, 5);
  });

  it('after scaling, diagonal line points stay on the same line (no perpendicular deviation)', () => {
    // Diagonal line from (0,0) to (60,80); direction unit vector is (0.6, 0.8)
    const points = [0, 0, 60, 80];
    const { points: result } = scaleLinePointsLengthOnly(points, 1.5, 2);
    const [x0, y0, x1, y1] = result as [number, number, number, number];
    // Cross product of direction vector and scaled vector should be near zero
    const origDx = 60;
    const origDy = 80;
    const newDx = x1 - x0;
    const newDy = y1 - y0;
    const crossProduct = origDx * newDy - origDy * newDx;
    expect(Math.abs(crossProduct)).toBeCloseTo(0, 1);
  });
});
