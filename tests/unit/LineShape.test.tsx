import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LineShape } from '@/components/canvas/shapes/LineShape';
import {
  SHADOW_BLUR_DEFAULT,
  SHADOW_BLUR_SELECTED,
  SHADOW_COLOR,
} from '@/lib/canvasShadows';

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
