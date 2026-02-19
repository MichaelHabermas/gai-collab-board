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
let arrowRenderCount = 0;

vi.mock('react-konva', () => ({
  Arrow: (props: Record<string, unknown>) => {
    latestArrowProps = props;
    arrowRenderCount++;
    return <div data-testid='connector-arrow' />;
  },
  Line: (props: Record<string, unknown>) => {
    latestLineProps = props;
    return <div data-testid='connector-line' />;
  },
  Group: (props: Record<string, unknown>) => {
    const { children } = props;
    return <div data-testid='connector-group'>{children as React.ReactNode}</div>;
  },
}));

describe('Connector', () => {
  beforeEach(() => {
    latestArrowProps = null;
    latestLineProps = null;
    arrowRenderCount = 0;
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
    // points [0,0, 25,25] => center (12.5, 12.5). Persist origin: (120 - 12.5, 80 - 12.5)
    expect(onDragEnd).toHaveBeenCalledWith(107.5, 67.5);
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

    const call = onTransformEnd.mock.calls[0];
    if (!call) {
      throw new Error('expected onTransformEnd to be called');
    }
    const attrs = call[0];
    expect(attrs).toMatchObject({ rotation: 30 });
    expect(attrs.x).toBeCloseTo(0, 1);
    expect(attrs.y).toBeCloseTo(-4, 1);
    expect(attrs.points).toHaveLength(4);
    expect(attrs.points[0]).toBeCloseTo(-9.14, 1);
    expect(attrs.points[1]).toBeCloseTo(-18.28, 1);
    expect(attrs.points[2]).toBeCloseTo(19.14, 1);
    expect(attrs.points[3]).toBeCloseTo(38.28, 1);
    expect(scaleXValue).toBe(1);
    expect(scaleYValue).toBe(1);
  });

  // --- Feature 15: Arrowheads ---

  describe('arrowheads', () => {
    it('renders end arrow by default (arrowheads undefined)', () => {
      render(
        <Connector id='c-end' x={0} y={0} points={[0, 0, 100, 0]} stroke='#000' />
      );
      expect(screen.getByTestId('connector-arrow')).toBeInTheDocument();
      expect(latestArrowProps?.pointerLength).toBe(10);
      expect(latestArrowProps?.pointerWidth).toBe(10);
    });

    it('renders no arrow when arrowheads is "none"', () => {
      render(
        <Connector id='c-none' x={0} y={0} points={[0, 0, 100, 0]} stroke='#000' arrowheads='none' />
      );
      expect(screen.getByTestId('connector-line')).toBeInTheDocument();
    });

    it('renders end arrow when arrowheads is "end"', () => {
      render(
        <Connector id='c-end2' x={0} y={0} points={[0, 0, 100, 0]} stroke='#000' arrowheads='end' />
      );
      expect(screen.getByTestId('connector-arrow')).toBeInTheDocument();
      // Points should be in normal order
      expect(latestArrowProps?.points).toEqual([0, 0, 100, 0]);
    });

    it('renders start arrow with reversed points when arrowheads is "start"', () => {
      render(
        <Connector id='c-start' x={0} y={0} points={[0, 0, 100, 50]} stroke='#000' arrowheads='start' />
      );
      expect(screen.getByTestId('connector-arrow')).toBeInTheDocument();
      // Points should be reversed: [100, 50, 0, 0]
      expect(latestArrowProps?.points).toEqual([100, 50, 0, 0]);
    });

    it('renders both arrows as a group when arrowheads is "both"', () => {
      render(
        <Connector id='c-both' x={0} y={0} points={[0, 0, 100, 50]} stroke='#000' arrowheads='both' />
      );
      expect(screen.getByTestId('connector-group')).toBeInTheDocument();
      // Should render two Arrow children inside the group
      const arrows = screen.getAllByTestId('connector-arrow');
      expect(arrows.length).toBe(2);
    });

    it('arrowheads prop overrides hasArrow', () => {
      render(
        <Connector id='c-override' x={0} y={0} points={[0, 0, 100, 0]} stroke='#000' hasArrow={true} arrowheads='none' />
      );
      expect(screen.getByTestId('connector-line')).toBeInTheDocument();
    });
  });

  // --- Feature 16: Stroke styles ---

  describe('strokeStyle', () => {
    it('renders with no dash when strokeStyle is undefined (solid)', () => {
      render(
        <Connector id='c-solid' x={0} y={0} points={[0, 0, 100, 0]} stroke='#000' />
      );
      expect(latestArrowProps?.dash).toBeUndefined();
    });

    it('renders with dashed pattern when strokeStyle is "dashed"', () => {
      render(
        <Connector id='c-dashed' x={0} y={0} points={[0, 0, 100, 0]} stroke='#000' strokeStyle='dashed' />
      );
      expect(latestArrowProps?.dash).toEqual([8, 8]);
    });

    it('renders with dotted pattern when strokeStyle is "dotted"', () => {
      render(
        <Connector id='c-dotted' x={0} y={0} points={[0, 0, 100, 0]} stroke='#000' strokeStyle='dotted' />
      );
      expect(latestArrowProps?.dash).toEqual([2, 4]);
    });

    it('applies dash to "none" arrowheads (Line component)', () => {
      render(
        <Connector id='c-line-dash' x={0} y={0} points={[0, 0, 100, 0]} stroke='#000' arrowheads='none' strokeStyle='dashed' />
      );
      expect(screen.getByTestId('connector-line')).toBeInTheDocument();
      expect(latestLineProps?.dash).toEqual([8, 8]);
    });
  });
});
