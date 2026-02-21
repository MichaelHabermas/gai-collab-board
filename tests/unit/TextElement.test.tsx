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

vi.mock('@/lib/canvasTextEditOverlay', () => ({
  attachOverlayRepositionLifecycle: vi.fn(() => () => {}),
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

  // ── Selection state ─────────────────────────────────────────────────

  it('applies selected shadow props when isSelected is true', () => {
    render(<TextElement id='text-sel' x={10} y={20} text='hello' isSelected={true} />);
    // Selected state uses different shadow blur
    expect(latestTextProps?.shadowBlur).toBe(8);
  });

  it('applies default shadow props when isSelected is false', () => {
    render(<TextElement id='text-unsel' x={10} y={20} text='hello' isSelected={false} />);
    expect(latestTextProps?.shadowBlur).toBe(SHADOW_BLUR_DEFAULT);
  });

  // ── Text content empty vs present ───────────────────────────────────

  it('shows placeholder "Double-click to edit" when text is empty', () => {
    render(<TextElement id='text-empty' x={10} y={20} text='' />);
    expect(latestTextProps?.text).toBe('Double-click to edit');
  });

  it('shows actual text when text is non-empty', () => {
    render(<TextElement id='text-content' x={10} y={20} text='My text' />);
    expect(latestTextProps?.text).toBe('My text');
  });

  // ── onTextChange present/absent ─────────────────────────────────────

  it('opens editor when onTextChange is provided', () => {
    const onTextChange = vi.fn();
    render(<TextElement id='text-edit' x={10} y={20} text='edit me' onTextChange={onTextChange} />);
    fireEvent.doubleClick(screen.getByTestId('text-element-node'));
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeTruthy();
    // Cleanup
    const textarea = document.querySelector('textarea.sticky-note-edit-overlay') as HTMLTextAreaElement;
    fireEvent.blur(textarea);
  });

  // ── Escape key dismisses editor ─────────────────────────────────────

  it('dismisses editor on Escape key without committing', () => {
    const onTextChange = vi.fn();
    render(<TextElement id='text-esc' x={10} y={20} text='initial' onTextChange={onTextChange} />);
    fireEvent.doubleClick(screen.getByTestId('text-element-node'));
    const textarea = document.querySelector('textarea.sticky-note-edit-overlay') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    textarea.value = 'should not commit';
    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();
  });

  // ── Shift+Enter does NOT commit ─────────────────────────────────────

  it('does not commit on Shift+Enter', () => {
    const onTextChange = vi.fn();
    render(<TextElement id='text-shift' x={10} y={20} text='initial' onTextChange={onTextChange} />);
    fireEvent.doubleClick(screen.getByTestId('text-element-node'));
    const textarea = document.querySelector('textarea.sticky-note-edit-overlay') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    textarea.value = 'multiline\ntext';
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(document.querySelector('.sticky-note-edit-overlay')).toBeTruthy();
    expect(onTextChange).not.toHaveBeenCalled();
  });

  // ── Blur commits value ──────────────────────────────────────────────

  it('commits value on blur', () => {
    const onTextChange = vi.fn();
    render(<TextElement id='text-blur' x={10} y={20} text='initial' onTextChange={onTextChange} />);
    fireEvent.doubleClick(screen.getByTestId('text-element-node'));
    const textarea = document.querySelector('textarea.sticky-note-edit-overlay') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    textarea.value = 'blur commit';
    fireEvent.blur(textarea);

    expect(onTextChange).toHaveBeenCalledWith('blur commit');
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();
  });

  // ── Visible prop during editing ─────────────────────────────────────

  it('hides Konva Text while editing', () => {
    const onTextChange = vi.fn();
    render(<TextElement id='text-vis' x={10} y={20} text='initial' onTextChange={onTextChange} />);
    expect(latestTextProps?.visible).toBe(true);

    fireEvent.doubleClick(screen.getByTestId('text-element-node'));

    expect(latestTextProps?.visible).toBe(false);
  });

  // ── Default values ──────────────────────────────────────────────────

  it('uses default fontSize of 16 when not provided', () => {
    render(<TextElement id='text-def-fs' x={10} y={20} text='hello' />);
    expect(latestTextProps?.fontSize).toBe(16);
  });

  it('uses custom fontSize when provided', () => {
    render(<TextElement id='text-custom-fs' x={10} y={20} text='hello' fontSize={24} />);
    expect(latestTextProps?.fontSize).toBe(24);
  });

  it('uses default fill of #1f2937 when not provided', () => {
    render(<TextElement id='text-def-fill' x={10} y={20} text='hello' />);
    expect(latestTextProps?.fill).toBe('#1f2937');
  });

  it('uses custom fill when provided', () => {
    render(<TextElement id='text-custom-fill' x={10} y={20} text='hello' fill='#ff0000' />);
    expect(latestTextProps?.fill).toBe('#ff0000');
  });

  it('uses default opacity of 1 when not provided', () => {
    render(<TextElement id='text-def-opac' x={10} y={20} text='hello' />);
    expect(latestTextProps?.opacity).toBe(1);
  });

  it('uses custom opacity when provided', () => {
    render(<TextElement id='text-custom-opac' x={10} y={20} text='hello' opacity={0.5} />);
    expect(latestTextProps?.opacity).toBe(0.5);
  });

  // ── Draggable combinations ──────────────────────────────────────────

  it('is draggable by default', () => {
    render(<TextElement id='text-drag-def' x={10} y={20} text='hello' />);
    expect(latestTextProps?.draggable).toBe(true);
  });

  it('is not draggable when draggable=false', () => {
    render(<TextElement id='text-nodrag' x={10} y={20} text='hello' draggable={false} />);
    expect(latestTextProps?.draggable).toBe(false);
  });

  it('disables dragging while editing', () => {
    const onTextChange = vi.fn();
    render(
      <TextElement
        id='text-drag-edit'
        x={10}
        y={20}
        text='hello'
        draggable={true}
        onTextChange={onTextChange}
      />
    );
    expect(latestTextProps?.draggable).toBe(true);
    fireEvent.doubleClick(screen.getByTestId('text-element-node'));
    expect(latestTextProps?.draggable).toBe(false);
  });

  // ── Drag event handler ──────────────────────────────────────────────

  it('reports drag end coordinates', () => {
    const onDragEnd = vi.fn();
    render(
      <TextElement
        id='text-drag'
        x={10}
        y={20}
        text='drag me'
        onDragEnd={onDragEnd}
      />
    );
    const dragEndHandler = latestTextProps?.onDragEnd as ((event: unknown) => void) | undefined;
    dragEndHandler?.({
      target: {
        x: () => 120,
        y: () => 80,
      },
    });
    expect(onDragEnd).toHaveBeenCalledWith(120, 80);
  });

  // ── Width prop ──────────────────────────────────────────────────────

  it('passes width prop through', () => {
    render(<TextElement id='text-width' x={10} y={20} text='hello' width={300} />);
    expect(latestTextProps?.width).toBe(300);
  });

  // ── Rotation prop ───────────────────────────────────────────────────

  it('uses default rotation of 0', () => {
    render(<TextElement id='text-def-rot' x={10} y={20} text='hello' />);
    expect(latestTextProps?.rotation).toBe(0);
  });

  it('uses custom rotation when provided', () => {
    render(<TextElement id='text-custom-rot' x={10} y={20} text='hello' rotation={45} />);
    expect(latestTextProps?.rotation).toBe(45);
  });

  // ── Guard when textNode is null ─────────────────────────────────────

  it('guards editor setup when textRef is null', () => {
    mockTextNode = null;
    const onTextChange = vi.fn();
    render(<TextElement id='text-nullref' x={10} y={20} text='test' onTextChange={onTextChange} />);
    fireEvent.doubleClick(screen.getByTestId('text-element-node'));
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();
    expect(onTextChange).not.toHaveBeenCalled();
  });
});
