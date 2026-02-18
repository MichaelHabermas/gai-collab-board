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

  it('reports drag end coordinates', () => {
    const onDragEnd = vi.fn();

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

    expect(onDragEnd).toHaveBeenCalledWith(42, 24);
  });

  it('scales points on transform and resets scale', () => {
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

    expect(onTransformEnd).toHaveBeenCalledWith({
      x: 7,
      y: 9,
      points: [0, 0, 10, 30],
      rotation: 35,
    });
    expect(scaleXValue).toBe(1);
    expect(scaleYValue).toBe(1);
  });
});
