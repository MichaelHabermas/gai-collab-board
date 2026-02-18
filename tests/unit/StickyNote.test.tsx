import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type Konva from 'konva';
import { StickyNote } from '@/components/canvas/shapes/StickyNote';

const mockOverlayRect = {
  top: 24,
  left: 36,
  width: 180,
  height: 120,
  avgScale: 1,
};

let latestTextProps: Record<string, unknown> | null = null;
let latestRectProps: Array<Record<string, unknown>> = [];
let mockGroupNode: Record<string, unknown> | null = null;

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('@/lib/canvasOverlayPosition', () => ({
  getOverlayRectFromLocalCorners: vi.fn(() => mockOverlayRect),
}));

vi.mock('react-konva', () => ({
  Group: (props: Record<string, unknown>) => {
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

    return (
      <div>
        <button
          data-testid='sticky-note-group'
          onDoubleClick={() => {
            const handler = props.onDblClick as (() => void) | undefined;
            handler?.();
          }}
        />
        {props.children as ReactNode}
      </div>
    );
  },
  Rect: (props: Record<string, unknown>) => {
    latestRectProps.push(props);
    return <div data-testid='sticky-note-rect' />;
  },
  Text: (props: Record<string, unknown>) => {
    latestTextProps = props;
    return <div data-testid='sticky-note-text' />;
  },
}));

describe('StickyNote', () => {
  beforeEach(() => {
    latestTextProps = null;
    latestRectProps = [];
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

  it('uses default text color fallback and selected styling on background', () => {
    const { rerender } = render(
      <StickyNote
        id='sticky-1'
        x={10}
        y={20}
        width={200}
        height={120}
        text='note'
        fill='#fef08a'
      />
    );

    expect(latestTextProps?.fill).toBe('#000000');
    expect(latestRectProps[0]?.stroke).toBeUndefined();
    expect(latestRectProps[0]?.strokeWidth).toBe(0);

    latestRectProps = [];
    rerender(
      <StickyNote
        id='sticky-1'
        x={10}
        y={20}
        width={200}
        height={120}
        text='note'
        fill='#fef08a'
        textFill='#1f2937'
        isSelected={true}
      />
    );

    expect(latestTextProps?.fill).toBe('#1f2937');
    expect(latestRectProps[0]?.strokeWidth).toBe(2);
    expect(latestRectProps[0]?.shadowBlur).toBe(12);
  });

  it('opens textarea editor and commits value on blur', () => {
    const onTextChange = vi.fn();

    render(
      <StickyNote
        id='sticky-2'
        x={10}
        y={20}
        width={200}
        height={120}
        text='initial'
        fill='#fef08a'
        onTextChange={onTextChange}
      />
    );

    fireEvent.doubleClick(screen.getByTestId('sticky-note-group'));

    const textarea = document.querySelector('textarea.sticky-note-edit-overlay') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    textarea.value = 'blur commit';
    fireEvent.blur(textarea);

    expect(onTextChange).toHaveBeenCalledWith('blur commit');
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();
  });

  it('guards editor setup when stage is unavailable', () => {
    mockGroupNode = {
      ...mockGroupNode,
      getStage: () => null,
    };

    const onTextChange = vi.fn();

    render(
      <StickyNote
        id='sticky-3'
        x={0}
        y={0}
        width={100}
        height={100}
        text='guard'
        fill='#fef08a'
        onTextChange={onTextChange}
      />
    );

    fireEvent.doubleClick(screen.getByTestId('sticky-note-group'));

    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();
    expect(onTextChange).not.toHaveBeenCalled();
  });
});
