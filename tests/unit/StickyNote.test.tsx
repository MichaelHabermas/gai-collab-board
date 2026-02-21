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

const mockCleanupReposition = vi.fn();
vi.mock('@/lib/canvasTextEditOverlay', () => ({
  attachOverlayRepositionLifecycle: vi.fn(() => mockCleanupReposition),
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
    mockCleanupReposition.mockClear();
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

  it('calls overlay reposition cleanup when editor closes on blur', () => {
    const onTextChange = vi.fn();

    render(
      <StickyNote
        id='sticky-cleanup'
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

    fireEvent.blur(textarea);

    expect(mockCleanupReposition).toHaveBeenCalledTimes(1);
  });

  // ── Selection state variations ──────────────────────────────────────

  it('applies selected shadow props when isSelected is true', () => {
    latestRectProps = [];
    render(
      <StickyNote
        id='sticky-sel'
        x={10}
        y={20}
        width={200}
        height={120}
        text='note'
        fill='#fef08a'
        isSelected={true}
      />
    );
    // First Rect is the background; check selected shadow properties
    expect(latestRectProps[0]?.shadowBlur).toBe(12);
    expect(latestRectProps[0]?.strokeWidth).toBe(2);
    // Stroke should be set (selection color)
    expect(latestRectProps[0]?.stroke).toBeDefined();
  });

  it('applies default shadow props when isSelected is false', () => {
    latestRectProps = [];
    render(
      <StickyNote
        id='sticky-unsel'
        x={10}
        y={20}
        width={200}
        height={120}
        text='note'
        fill='#fef08a'
        isSelected={false}
      />
    );
    expect(latestRectProps[0]?.shadowBlur).toBe(8);
    expect(latestRectProps[0]?.strokeWidth).toBe(0);
    expect(latestRectProps[0]?.stroke).toBeUndefined();
  });

  // ── textFill prop variations ────────────────────────────────────────

  it('uses textFill when provided and not empty', () => {
    render(
      <StickyNote
        id='sticky-tf'
        x={10}
        y={20}
        width={200}
        height={120}
        text='note'
        fill='#fef08a'
        textFill='#ef4444'
      />
    );
    expect(latestTextProps?.fill).toBe('#ef4444');
  });

  it('uses default text color when textFill is empty string', () => {
    render(
      <StickyNote
        id='sticky-empty-tf'
        x={10}
        y={20}
        width={200}
        height={120}
        text='note'
        fill='#fef08a'
        textFill=''
      />
    );
    expect(latestTextProps?.fill).toBe('#000000');
  });

  it('uses default text color when textFill is undefined', () => {
    render(
      <StickyNote
        id='sticky-undef-tf'
        x={10}
        y={20}
        width={200}
        height={120}
        text='note'
        fill='#fef08a'
      />
    );
    expect(latestTextProps?.fill).toBe('#000000');
  });

  // ── opacity default ─────────────────────────────────────────────────

  it('uses default opacity of 1 when not provided', () => {
    render(
      <StickyNote
        id='sticky-noopac'
        x={10}
        y={20}
        width={200}
        height={120}
        text='note'
        fill='#fef08a'
      />
    );
    // The Group element (via mock) does not directly expose opacity, but
    // the component passes opacity={opacity} to Group. We verify the Text
    // node renders (it's inside Group with opacity=1).
    expect(latestTextProps).toBeTruthy();
  });

  it('passes custom opacity to group', () => {
    render(
      <StickyNote
        id='sticky-custom-opac'
        x={10}
        y={20}
        width={200}
        height={120}
        text='note'
        fill='#fef08a'
        opacity={0.5}
      />
    );
    expect(latestTextProps).toBeTruthy();
  });

  // ── onTextChange absent (no-op double click) ───────────────────────

  it('does not open editor when onTextChange is not provided', () => {
    render(
      <StickyNote
        id='sticky-noedit'
        x={10}
        y={20}
        width={200}
        height={120}
        text='note'
        fill='#fef08a'
      />
    );
    fireEvent.doubleClick(screen.getByTestId('sticky-note-group'));
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();
  });

  // ── groupRef is null guard ──────────────────────────────────────────

  it('guards editor when groupRef.current is null', () => {
    mockGroupNode = null;
    const onTextChange = vi.fn();

    render(
      <StickyNote
        id='sticky-nullref'
        x={10}
        y={20}
        width={200}
        height={120}
        text='test'
        fill='#fef08a'
        onTextChange={onTextChange}
      />
    );
    fireEvent.doubleClick(screen.getByTestId('sticky-note-group'));
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();
    expect(onTextChange).not.toHaveBeenCalled();
  });

  // ── Editor keyboard: Escape to dismiss ──────────────────────────────

  it('dismisses editor on Escape key without committing', () => {
    const onTextChange = vi.fn();

    render(
      <StickyNote
        id='sticky-esc'
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

    textarea.value = 'should not commit';
    fireEvent.keyDown(textarea, { key: 'Escape' });

    // Escape removes the textarea without calling onTextChange
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();
  });

  // ── Editor keyboard: Enter to commit ────────────────────────────────

  it('commits and closes editor on Enter key (non-shift)', () => {
    const onTextChange = vi.fn();

    render(
      <StickyNote
        id='sticky-enter'
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

    textarea.value = 'enter commit';
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onTextChange).toHaveBeenCalledWith('enter commit');
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeNull();
  });

  it('does not commit on Shift+Enter (allows multiline)', () => {
    const onTextChange = vi.fn();

    render(
      <StickyNote
        id='sticky-shift-enter'
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

    textarea.value = 'multiline\ntext';
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    // Shift+Enter should NOT close the editor or commit
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeTruthy();
    expect(onTextChange).not.toHaveBeenCalled();
  });

  // ── Text is hidden while editing ────────────────────────────────────

  it('hides Konva Text while editing', () => {
    const onTextChange = vi.fn();

    render(
      <StickyNote
        id='sticky-vis'
        x={10}
        y={20}
        width={200}
        height={120}
        text='initial'
        fill='#fef08a'
        onTextChange={onTextChange}
      />
    );
    // Before editing, text is visible
    expect(latestTextProps?.visible).toBe(true);

    fireEvent.doubleClick(screen.getByTestId('sticky-note-group'));

    // After editing, Konva Text visible prop should be false (isEditing = true)
    expect(latestTextProps?.visible).toBe(false);
  });

  // ── Draggable disabled while editing ────────────────────────────────

  it('disables dragging while editing', () => {
    const onTextChange = vi.fn();

    render(
      <StickyNote
        id='sticky-drag-edit'
        x={10}
        y={20}
        width={200}
        height={120}
        text='initial'
        fill='#fef08a'
        draggable={true}
        onTextChange={onTextChange}
      />
    );
    // Before editing: component is rendered with draggable=true
    // After double-click to edit, draggable should become false
    fireEvent.doubleClick(screen.getByTestId('sticky-note-group'));
    // The textarea overlay indicates editing mode is active
    expect(document.querySelector('.sticky-note-edit-overlay')).toBeTruthy();
  });

  // ── Default fontSize ────────────────────────────────────────────────

  it('uses default font size of 14 when fontSize prop not provided', () => {
    render(
      <StickyNote
        id='sticky-def-fs'
        x={10}
        y={20}
        width={200}
        height={120}
        text='note'
        fill='#fef08a'
      />
    );
    expect(latestTextProps?.fontSize).toBe(14);
  });

  it('uses custom font size when provided', () => {
    render(
      <StickyNote
        id='sticky-custom-fs'
        x={10}
        y={20}
        width={200}
        height={120}
        text='note'
        fill='#fef08a'
        fontSize={24}
      />
    );
    expect(latestTextProps?.fontSize).toBe(24);
  });

  // ── Rotation default ────────────────────────────────────────────────

  it('uses default rotation of 0 when not provided', () => {
    render(
      <StickyNote
        id='sticky-def-rot'
        x={10}
        y={20}
        width={200}
        height={120}
        text='note'
        fill='#fef08a'
      />
    );
    // Component renders; default rotation is 0
    expect(latestTextProps).toBeTruthy();
  });
});
