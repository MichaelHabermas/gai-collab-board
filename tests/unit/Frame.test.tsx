import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type Konva from 'konva';
import { Frame } from '@/components/canvas/shapes/Frame';
import {
  SHADOW_BLUR_DEFAULT,
  SHADOW_BLUR_SELECTED,
  SHADOW_COLOR,
} from '@/lib/canvasShadows';

const mockOverlayRect = {
  top: 14,
  left: 28,
  width: 180,
  height: 20,
  avgScale: 1,
};

let latestGroupProps: Record<string, unknown> | null = null;
let latestRectProps: Array<Record<string, unknown>> = [];
let latestTextProps: Record<string, unknown> | null = null;
let mockGroupNode: Record<string, unknown> | null = null;

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('@/lib/canvasOverlayPosition', () => ({
  getOverlayRectFromLocalCorners: vi.fn(() => mockOverlayRect),
}));

vi.mock('react-konva', () => ({
  Group: (props: Record<string, unknown>) => {
    latestGroupProps = props;
    const ref = props.ref as
      | ((node: Konva.Group | null) => void)
      | { current: Konva.Group | null }
      | undefined;
    if (ref) {
      if (typeof ref === 'function') {
        ref(mockGroupNode as Konva.Group | null);
      } else {
        ref.current = mockGroupNode as Konva.Group | null;
      }
    }
    return <div>{props.children as ReactNode}</div>;
  },
  Rect: (props: Record<string, unknown>) => {
    latestRectProps.push(props);
    return (
      <button
        data-testid='frame-rect'
        onDoubleClick={() => {
          const handler = props.onDblClick as (() => void) | undefined;
          handler?.();
        }}
      />
    );
  },
  Text: (props: Record<string, unknown>) => {
    latestTextProps = props;
    return <div data-testid='frame-text' />;
  },
}));

describe('Frame', () => {
  beforeEach(() => {
    latestGroupProps = null;
    latestRectProps = [];
    latestTextProps = null;
    document.body.innerHTML = '';
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    mockGroupNode = {
      getStage: () => ({
        container: () => document.createElement('div'),
      }),
      getAbsoluteTransform: () => ({}),
    };
  });

  it('renders selected frame title/body styles', () => {
    render(
      <Frame
        id='frame-1'
        x={10}
        y={20}
        width={220}
        height={160}
        text='Design'
        isSelected={true}
      />
    );

    expect(latestGroupProps?.name).toBe('shape frame');
    expect(latestRectProps[0]?.strokeWidth).toBe(2);
    expect(latestRectProps[1]?.strokeWidth).toBe(2);
    expect(latestTextProps?.text).toBe('Design');
  });

  it('renders title and body rects with consistent slight shadow', () => {
    render(
      <Frame
        id='frame-shadow'
        x={0}
        y={0}
        width={200}
        height={120}
        text='Frame'
      />
    );

    expect(latestRectProps[0]?.shadowColor).toBe(SHADOW_COLOR);
    expect(latestRectProps[0]?.shadowBlur).toBe(SHADOW_BLUR_DEFAULT);
    expect(latestRectProps[1]?.shadowColor).toBe(SHADOW_COLOR);
    expect(latestRectProps[1]?.shadowBlur).toBe(SHADOW_BLUR_DEFAULT);
  });

  it('renders selected frame with stronger shadow blur', () => {
    render(
      <Frame
        id='frame-shadow-selected'
        x={0}
        y={0}
        width={200}
        height={120}
        text='Frame'
        isSelected={true}
      />
    );

    expect(latestRectProps[0]?.shadowBlur).toBe(SHADOW_BLUR_SELECTED);
    expect(latestRectProps[1]?.shadowBlur).toBe(SHADOW_BLUR_SELECTED);
  });

  it('opens title input on double click and commits on Enter', () => {
    const onTextChange = vi.fn();

    render(
      <Frame
        id='frame-2'
        x={0}
        y={0}
        width={220}
        height={160}
        text='Initial'
        onTextChange={onTextChange}
      />
    );

    const titleRect = screen.getAllByTestId('frame-rect')[0];
    expect(titleRect).toBeDefined();
    fireEvent.doubleClick(titleRect as HTMLElement);

    const input = document.querySelector('input.sticky-note-edit-overlay') as HTMLInputElement;
    expect(input).toBeTruthy();
    input.value = 'Updated title';
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onTextChange).toHaveBeenCalledWith('Updated title');
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();
  });

  it('handles missing stage guard and emits drag end coordinates', () => {
    const onDragEnd = vi.fn();
    const onTextChange = vi.fn();
    mockGroupNode = {
      ...mockGroupNode,
      getStage: () => null,
    };

    render(
      <Frame
        id='frame-3'
        x={0}
        y={0}
        width={220}
        height={160}
        text='Guard'
        onTextChange={onTextChange}
        onDragEnd={onDragEnd}
      />
    );

    const guardRect = screen.getAllByTestId('frame-rect')[0];
    expect(guardRect).toBeDefined();
    fireEvent.doubleClick(guardRect as HTMLElement);
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();

    const dragEndHandler = latestGroupProps?.onDragEnd as ((event: unknown) => void) | undefined;
    dragEndHandler?.({
      target: {
        x: () => 50,
        y: () => 70,
      },
    });
    expect(onDragEnd).toHaveBeenCalledWith(50, 70);
  });
});
