import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RectangleShape } from '@/components/canvas/shapes/RectangleShape';

let latestRectProps: Record<string, unknown> | null = null;

vi.mock('react-konva', () => ({
  Rect: (props: Record<string, unknown>) => {
    latestRectProps = props;
    return <div data-testid='rectangle-shape' />;
  },
}));

describe('RectangleShape', () => {
  beforeEach(() => {
    latestRectProps = null;
  });

  it('renders selected rectangle styles', () => {
    render(
      <RectangleShape
        id='rect-1'
        x={10}
        y={20}
        width={120}
        height={80}
        fill='#93c5fd'
        stroke='#1e293b'
        strokeWidth={3}
        isSelected={true}
      />
    );

    expect(latestRectProps?.stroke).toBe('#3b82f6');
    expect(latestRectProps?.strokeWidth).toBe(2);
    expect(latestRectProps?.shadowBlur).toBe(8);
  });

  it('reports drag end coordinates', () => {
    const onDragEnd = vi.fn();

    render(
      <RectangleShape
        id='rect-2'
        x={0}
        y={0}
        width={100}
        height={50}
        fill='#93c5fd'
        onDragEnd={onDragEnd}
      />
    );

    const dragEndHandler = latestRectProps?.onDragEnd as ((event: unknown) => void) | undefined;
    dragEndHandler?.({
      target: {
        x: () => 60,
        y: () => 40,
      },
    });

    expect(onDragEnd).toHaveBeenCalledWith(60, 40);
  });

  it('applies transformed size with minimum constraints and resets scale', () => {
    const onTransformEnd = vi.fn();
    let scaleXValue = 0.05;
    let scaleYValue = 0.1;

    render(
      <RectangleShape
        id='rect-3'
        x={0}
        y={0}
        width={40}
        height={20}
        fill='#93c5fd'
        onTransformEnd={onTransformEnd}
      />
    );

    const transformEndHandler = latestRectProps?.onTransformEnd as
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
      width: () => 40,
      height: () => 20,
      x: () => 12,
      y: () => 18,
      rotation: () => 12,
    };

    transformEndHandler?.({ target: node });

    expect(onTransformEnd).toHaveBeenCalledWith({
      x: 12,
      y: 18,
      width: 10,
      height: 10,
      rotation: 12,
    });
    expect(scaleXValue).toBe(1);
    expect(scaleYValue).toBe(1);
  });
});
