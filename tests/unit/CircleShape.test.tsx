import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CircleShape } from '@/components/canvas/shapes/CircleShape';

let latestEllipseProps: Record<string, unknown> | null = null;

vi.mock('react-konva', () => ({
  Ellipse: (props: Record<string, unknown>) => {
    latestEllipseProps = props;
    return <div data-testid='circle-shape' />;
  },
}));

describe('CircleShape', () => {
  beforeEach(() => {
    latestEllipseProps = null;
  });

  it('renders ellipse using center coordinates and selected styles', () => {
    render(
      <CircleShape
        id='circle-1'
        x={10}
        y={20}
        width={80}
        height={60}
        fill='#93c5fd'
        stroke='#334155'
        strokeWidth={3}
        isSelected={true}
      />
    );

    expect(latestEllipseProps?.x).toBe(50);
    expect(latestEllipseProps?.y).toBe(50);
    expect(latestEllipseProps?.radiusX).toBe(40);
    expect(latestEllipseProps?.radiusY).toBe(30);
    expect(latestEllipseProps?.stroke).toBe('#3b82f6');
    expect(latestEllipseProps?.strokeWidth).toBe(2);
  });

  it('reports top-left position on drag end', () => {
    const onDragEnd = vi.fn();

    render(
      <CircleShape
        id='circle-2'
        x={0}
        y={0}
        width={100}
        height={80}
        fill='#93c5fd'
        onDragEnd={onDragEnd}
      />
    );

    const dragEndHandler = latestEllipseProps?.onDragEnd as ((event: unknown) => void) | undefined;
    dragEndHandler?.({
      target: {
        x: () => 200,
        y: () => 160,
      },
    });

    expect(onDragEnd).toHaveBeenCalledWith(150, 120);
  });

  it('scales radius on transform, enforces minimum, and resets node scale', () => {
    const onTransformEnd = vi.fn();
    let scaleXValue = 0.1;
    let scaleYValue = 0.2;

    render(
      <CircleShape
        id='circle-3'
        x={0}
        y={0}
        width={40}
        height={30}
        fill='#93c5fd'
        onTransformEnd={onTransformEnd}
      />
    );

    const transformEndHandler = latestEllipseProps?.onTransformEnd as
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
      radiusX: () => 15,
      radiusY: () => 12,
      x: () => 120,
      y: () => 90,
      rotation: () => 25,
    };

    transformEndHandler?.({ target: node });

    expect(onTransformEnd).toHaveBeenCalledWith({
      x: 110,
      y: 80,
      width: 20,
      height: 20,
      rotation: 25,
    });
    expect(scaleXValue).toBe(1);
    expect(scaleYValue).toBe(1);
  });
});
