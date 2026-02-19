import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Connector } from '@/components/canvas/shapes/Connector';
import {
  SHADOW_BLUR_DEFAULT,
  SHADOW_BLUR_SELECTED,
  SHADOW_COLOR,
} from '@/lib/canvasShadows';

let latestArrowProps: Record<string, unknown> | null = null;
let latestLineProps: Record<string, unknown> | null = null;

vi.mock('react-konva', () => ({
  Arrow: (props: Record<string, unknown>) => {
    latestArrowProps = props;
    return <div data-testid='connector-arrow' />;
  },
  Line: (props: Record<string, unknown>) => {
    latestLineProps = props;
    return <div data-testid='connector-line' />;
  },
}));

describe('Connector', () => {
  beforeEach(() => {
    latestArrowProps = null;
    latestLineProps = null;
  });

  it('renders arrow mode by default and line mode when hasArrow is false', () => {
    const { rerender } = render(
      <Connector id='connector-1' x={10} y={20} points={[0, 0, 50, 50]} stroke='#111827' />
    );

    expect(screen.getByTestId('connector-arrow')).toBeInTheDocument();
    expect(latestArrowProps?.fill).toBe('#111827');
    expect(latestArrowProps?.shadowColor).toBe(SHADOW_COLOR);
    expect(latestArrowProps?.shadowBlur).toBe(SHADOW_BLUR_DEFAULT);

    rerender(
      <Connector id='connector-1' x={10} y={20} points={[0, 0, 50, 50]} stroke='#111827' hasArrow={false} />
    );

    expect(screen.getByTestId('connector-line')).toBeInTheDocument();
    expect(latestLineProps?.stroke).toBe('#111827');
    expect(latestLineProps?.shadowColor).toBe(SHADOW_COLOR);
    expect(latestLineProps?.shadowBlur).toBe(SHADOW_BLUR_DEFAULT);
  });

  it('uses selected stroke styling and emits drag end coordinates', () => {
    const onDragEnd = vi.fn();

    render(
      <Connector
        id='connector-2'
        x={0}
        y={0}
        points={[0, 0, 25, 25]}
        stroke='#334155'
        strokeWidth={2}
        isSelected={true}
        onDragEnd={onDragEnd}
      />
    );

    expect(latestArrowProps?.stroke).toBe('#3b82f6');
    expect(latestArrowProps?.strokeWidth).toBe(3);
    expect(latestArrowProps?.shadowBlur).toBe(SHADOW_BLUR_SELECTED);
    expect(latestArrowProps?.shadowColor).toBe(SHADOW_COLOR);

    const dragEndHandler = latestArrowProps?.onDragEnd as ((event: unknown) => void) | undefined;
    dragEndHandler?.({
      target: {
        x: () => 120,
        y: () => 80,
      },
    });

    expect(onDragEnd).toHaveBeenCalledWith(120, 80);
  });

  it('scales points on transform end and resets node scale', () => {
    const onTransformEnd = vi.fn();
    let scaleXValue = 2;
    let scaleYValue = 3;

    render(
      <Connector
        id='connector-3'
        x={5}
        y={6}
        points={[0, 0, 10, 20]}
        stroke='#0f172a'
        onTransformEnd={onTransformEnd}
      />
    );

    const transformEndHandler = latestArrowProps?.onTransformEnd as
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
      points: () => [0, 0, 10, 20],
      x: () => 5,
      y: () => 6,
      rotation: () => 30,
    };

    transformEndHandler?.({ target: node });

    const attrs = onTransformEnd.mock.calls[0][0];
    expect(attrs).toMatchObject({ x: 5, y: 6, rotation: 30 });
    expect(attrs.points).toHaveLength(4);
    expect(attrs.points[0]).toBeCloseTo(-9.14, 1);
    expect(attrs.points[1]).toBeCloseTo(-18.28, 1);
    expect(attrs.points[2]).toBeCloseTo(19.14, 1);
    expect(attrs.points[3]).toBeCloseTo(38.28, 1);
    expect(scaleXValue).toBe(1);
    expect(scaleYValue).toBe(1);
  });
});
