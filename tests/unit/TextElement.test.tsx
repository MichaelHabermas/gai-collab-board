import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Konva from 'konva';
import { TextElement } from '@/components/canvas/shapes/TextElement';
import { SHADOW_BLUR_DEFAULT, SHADOW_COLOR } from '@/lib/canvasShadows';

const mockOverlayRect = {
  top: 10,
  left: 20,
  width: 150,
  height: 40,
  avgScale: 1,
};

let latestTextProps: Record<string, unknown> | null = null;
let mockTextNode: Record<string, unknown> | null = null;

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('@/lib/canvasOverlayPosition', () => ({
  getOverlayRectFromLocalCorners: vi.fn(() => mockOverlayRect),
}));

vi.mock('react-konva', () => ({
  Text: (props: Record<string, unknown>) => {
    latestTextProps = props;
    const ref = props.ref as
      | ((node: Konva.Text | null) => void)
      | { current: Konva.Text | null }
      | undefined;

    if (ref) {
      if (typeof ref === 'function') {
        ref(mockTextNode as Konva.Text | null);
      } else {
        ref.current = mockTextNode as Konva.Text | null;
      }
    }

    return (
      <button
        data-testid='text-element-node'
        onDoubleClick={() => {
          const handler = props.onDblClick as (() => void) | undefined;
          handler?.();
        }}
      />
    );
  },
}));

describe('TextElement', () => {
  beforeEach(() => {
    latestTextProps = null;
    document.body.innerHTML = '';
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    mockTextNode = {
      getStage: () => ({
        container: () => document.createElement('div'),
      }),
      getAbsoluteTransform: () => ({}),
      width: () => 120,
      height: () => 30,
      scaleX: (next?: number) => (typeof next === 'number' ? next : 1),
      scaleY: (next?: number) => (typeof next === 'number' ? next : 1),
      x: () => 50,
      y: () => 60,
      rotation: () => 0,
    };
  });

  it('renders text with slight shadow', () => {
    render(<TextElement id='text-shadow' x={10} y={20} text='hello' />);

    expect(latestTextProps?.shadowColor).toBe(SHADOW_COLOR);
    expect(latestTextProps?.shadowBlur).toBe(SHADOW_BLUR_DEFAULT);
  });

  it('does not open editor when onTextChange is missing', () => {
    render(<TextElement id='text-1' x={10} y={20} text='hello' />);

    fireEvent.doubleClick(screen.getByTestId('text-element-node'));

    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();
  });

  it('opens textarea editor and commits value on Enter', () => {
    const onTextChange = vi.fn();

    render(<TextElement id='text-2' x={10} y={20} text='initial' onTextChange={onTextChange} />);

    fireEvent.doubleClick(screen.getByTestId('text-element-node'));

    const textarea = document.querySelector('textarea.sticky-note-edit-overlay') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    textarea.value = 'updated text';
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(onTextChange).toHaveBeenCalledWith('updated text');
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();
  });

  it('handles null stage guard and emits transformed attrs with size constraints', () => {
    const onTextChange = vi.fn();
    const onTransformEnd = vi.fn();

    mockTextNode = {
      ...mockTextNode,
      getStage: () => null,
    };

    render(
      <TextElement
        id='text-3'
        x={10}
        y={20}
        text='sample'
        fontSize={16}
        onTextChange={onTextChange}
        onTransformEnd={onTransformEnd}
      />
    );

    fireEvent.doubleClick(screen.getByTestId('text-element-node'));
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();

    let scaleXValue = 0.2;
    let scaleYValue = 2;
    const transformNode = {
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
      x: () => 100,
      y: () => 120,
      rotation: () => 15,
    };

    const transformHandler = latestTextProps?.onTransformEnd as ((event: unknown) => void) | undefined;
    transformHandler?.({ target: transformNode });

    expect(onTransformEnd).toHaveBeenCalledWith({
      x: 100,
      y: 120,
      width: 50,
      fontSize: 32,
      rotation: 15,
    });
    expect(scaleXValue).toBe(1);
    expect(scaleYValue).toBe(1);
  });
});
