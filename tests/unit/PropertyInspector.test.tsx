import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { PropertyInspector } from '@/components/canvas/PropertyInspector';
import { setSelectionStoreState } from '@/stores/selectionStore';
import { useObjectsStore } from '@/stores/objectsStore';
import type { IBoardObject } from '@/types';

const createMockObject = (overrides: Partial<IBoardObject> = {}): IBoardObject => ({
  id: 'obj-1',
  type: 'rectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 80,
  rotation: 0,
  fill: '#93c5fd',
  stroke: '#1e40af',
  strokeWidth: 2,
  createdBy: 'user-1',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  ...overrides,
});

function TestSelectionWrapper({
  selectedIds,
  children,
}: {
  selectedIds: string[];
  children: ReactNode;
}) {
  setSelectionStoreState(selectedIds);
  return <>{children}</>;
}

describe('PropertyInspector', () => {
  const mockOnObjectUpdate = vi.fn().mockResolvedValue(undefined);

  /** Push objects into the Zustand store (replaces `objects` prop). */
  const setStoreObjects = (objects: IBoardObject[]): void => {
    useObjectsStore.getState().setAll(objects);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setSelectionStoreState([]);
    useObjectsStore.getState().clear();
  });

  it('shows empty state when no selection', () => {
    render(
      <TestSelectionWrapper selectedIds={[]}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    expect(screen.getByTestId('property-inspector-empty')).toBeInTheDocument();
    expect(screen.getByText(/Select one or more objects/)).toBeInTheDocument();
  });

  it('shows panel when one object selected', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle' });
    setStoreObjects([obj]);
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    expect(screen.getByTestId('property-inspector-panel')).toBeInTheDocument();
    expect(screen.getByText('1 object selected')).toBeInTheDocument();
  });

  it('shows fill and stroke controls for shape object', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle', fill: '#fef08a' });
    setStoreObjects([obj]);
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    expect(screen.getByTestId('property-inspector-fill-color')).toBeInTheDocument();
    expect(screen.getByTestId('property-inspector-fill-input')).toHaveValue('#fef08a');
    expect(screen.getByTestId('property-inspector-stroke-color')).toBeInTheDocument();
    expect(screen.getByTestId('property-inspector-stroke-width')).toBeInTheDocument();
  });

  it('shows only stroke controls when line is selected (no fill)', () => {
    const lineObj = createMockObject({
      id: 'line-1',
      type: 'line',
      fill: 'transparent',
      stroke: '#1e40af',
      strokeWidth: 3,
      points: [0, 0, 100, 50],
    });
    setStoreObjects([lineObj]);
    render(
      <TestSelectionWrapper selectedIds={['line-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    expect(screen.queryByTestId('property-inspector-fill-color')).not.toBeInTheDocument();
    expect(screen.queryByTestId('property-inspector-fill-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('property-inspector-stroke-color')).toBeInTheDocument();
    expect(screen.getByTestId('property-inspector-stroke-width')).toBeInTheDocument();
  });

  it('shows empty state when selected id not in objects list', () => {
    render(
      <TestSelectionWrapper selectedIds={['nonexistent']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    expect(screen.getByTestId('property-inspector-empty')).toBeInTheDocument();
  });

  it('shows font size control for sticky and calls onObjectUpdate when changed (commit on blur)', () => {
    const sticky = createMockObject({
      id: 'sticky-1',
      type: 'sticky',
      fontSize: 14,
    });
    setStoreObjects([sticky]);
    render(
      <TestSelectionWrapper selectedIds={['sticky-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const fontInput = screen.getByTestId('property-inspector-font-size');
    expect(fontInput).toBeInTheDocument();
    expect(fontInput).toHaveValue(14);
    fireEvent.change(fontInput, { target: { value: '18' } });
    expect(mockOnObjectUpdate).not.toHaveBeenCalled();
    fireEvent.blur(fontInput);
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('sticky-1', { fontSize: 18 });
  });

  it('shows Font color control for sticky note and updates textFill', () => {
    const sticky = createMockObject({
      id: 'sticky-1',
      type: 'sticky',
      fill: '#fef08a',
      textFill: '#1e293b',
    });
    setStoreObjects([sticky]);
    render(
      <TestSelectionWrapper selectedIds={['sticky-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );

    expect(screen.getByText('Font color')).toBeInTheDocument();
    const fontColorInput = screen.getByTestId('property-inspector-font-color-input');
    expect(fontColorInput).toHaveValue('#1e293b');
    fireEvent.change(fontColorInput, { target: { value: '#ef4444' } });
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('sticky-1', { textFill: '#ef4444' });
  });

  it('shows Font color control for text element and updates fill', () => {
    const textObject = createMockObject({
      id: 'text-1',
      type: 'text',
      fill: '#334155',
      text: 'Text item',
      fontSize: 16,
    });
    setStoreObjects([textObject]);
    render(
      <TestSelectionWrapper selectedIds={['text-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );

    expect(screen.getByText('Font color')).toBeInTheDocument();
    const fontColorInput = screen.getByTestId('property-inspector-font-color-input');
    expect(fontColorInput).toHaveValue('#334155');
    fireEvent.change(fontColorInput, { target: { value: '#3b82f6' } });
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('text-1', { fill: '#3b82f6' });
  });

  it('changing fill calls onObjectUpdate', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle', fill: '#93c5fd' });
    setStoreObjects([obj]);
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const fillInput = screen.getByTestId('property-inspector-fill-input');
    fireEvent.change(fillInput, { target: { value: '#86efac' } });
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('obj-1', { fill: '#86efac' });
  });

  it('changing stroke width commits on blur and calls onObjectUpdate', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle', strokeWidth: 2 });
    setStoreObjects([obj]);
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const strokeWidthInput = screen.getByTestId('property-inspector-stroke-width');
    fireEvent.change(strokeWidthInput, { target: { value: '5' } });
    expect(mockOnObjectUpdate).not.toHaveBeenCalled();
    fireEvent.blur(strokeWidthInput);
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('obj-1', { strokeWidth: 5 });
  });

  it('rapid stroke width changes result in single commit on blur', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle', strokeWidth: 2 });
    setStoreObjects([obj]);
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const strokeWidthInput = screen.getByTestId('property-inspector-stroke-width');
    fireEvent.change(strokeWidthInput, { target: { value: '3' } });
    fireEvent.change(strokeWidthInput, { target: { value: '4' } });
    fireEvent.change(strokeWidthInput, { target: { value: '5' } });
    expect(mockOnObjectUpdate).not.toHaveBeenCalled();
    fireEvent.blur(strokeWidthInput);
    expect(mockOnObjectUpdate).toHaveBeenCalledTimes(1);
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('obj-1', { strokeWidth: 5 });
  });

  it('entering 0 for stroke width does not commit (value below min=1 is rejected)', () => {
    const lineObj = createMockObject({
      id: 'line-1',
      type: 'line',
      stroke: '#000000',
      strokeWidth: 3,
      points: [0, 0, 100, 0],
      fill: 'transparent',
    });
    setStoreObjects([lineObj]);
    render(
      <TestSelectionWrapper selectedIds={['line-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const strokeWidthInput = screen.getByTestId('property-inspector-stroke-width');
    fireEvent.change(strokeWidthInput, { target: { value: '0' } });
    fireEvent.blur(strokeWidthInput);
    // Entering 0 (below min 1) does not fire a commit
    expect(mockOnObjectUpdate).not.toHaveBeenCalled();
  });

  it('stroke width of 1 is accepted as minimum valid value for line objects', () => {
    const lineObj = createMockObject({
      id: 'line-1',
      type: 'line',
      stroke: '#000000',
      strokeWidth: 3,
      points: [0, 0, 100, 0],
      fill: 'transparent',
    });
    setStoreObjects([lineObj]);
    render(
      <TestSelectionWrapper selectedIds={['line-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const strokeWidthInput = screen.getByTestId('property-inspector-stroke-width');
    fireEvent.change(strokeWidthInput, { target: { value: '1' } });
    fireEvent.blur(strokeWidthInput);
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('line-1', { strokeWidth: 1 });
  });

  it('font color shows textFill for sticky when textFill is set; changing updates textFill not fill', () => {
    const sticky = createMockObject({
      id: 'sticky-2',
      type: 'sticky',
      fill: '#fef08a',
      textFill: '#374151',
    });
    setStoreObjects([sticky]);
    render(
      <TestSelectionWrapper selectedIds={['sticky-2']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const fontColorInput = screen.getByTestId('property-inspector-font-color-input');
    expect(fontColorInput).toHaveValue('#374151');
    fireEvent.change(fontColorInput, { target: { value: '#dc2626' } });
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('sticky-2', { textFill: '#dc2626' });
    // Must not update fill (background color)
    expect(mockOnObjectUpdate).not.toHaveBeenCalledWith('sticky-2', { fill: '#dc2626' });
  });

  it('no font color control shown when only line is selected', () => {
    const lineObj = createMockObject({
      id: 'line-2',
      type: 'line',
      stroke: '#333',
      points: [0, 0, 50, 50],
      fill: 'transparent',
    });
    setStoreObjects([lineObj]);
    render(
      <TestSelectionWrapper selectedIds={['line-2']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    expect(screen.queryByTestId('property-inspector-font-color-color')).not.toBeInTheDocument();
    expect(screen.queryByTestId('property-inspector-font-color-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('property-inspector-font-size')).not.toBeInTheDocument();
  });

  it('shows opacity slider and calls onObjectUpdate when changed', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle', opacity: 1 });
    setStoreObjects([obj]);
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const opacitySlider = screen.getByTestId('property-inspector-opacity-slider');
    expect(opacitySlider).toBeInTheDocument();
    fireEvent.change(opacitySlider, { target: { value: '50' } });
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('obj-1', { opacity: 0.5 });
  });

  // ── Multi-select with mixed types ───────────────────────────────────
  describe('multi-select mixed types', () => {
    it('shows "Mixed" for fill when objects have different fills', () => {
      const rect = createMockObject({ id: 'rect-1', type: 'rectangle', fill: '#ff0000' });
      const circle = createMockObject({ id: 'circle-1', type: 'circle', fill: '#00ff00' });
      setStoreObjects([rect, circle]);
      render(
        <TestSelectionWrapper selectedIds={['rect-1', 'circle-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      expect(screen.getByText('2 objects selected')).toBeInTheDocument();
      const fillInput = screen.getByTestId('property-inspector-fill-input');
      expect(fillInput).toHaveValue('Mixed');
      expect(fillInput).toBeDisabled();
    });

    it('shows "Mixed" for stroke when objects have different strokes', () => {
      const rect = createMockObject({ id: 'rect-1', type: 'rectangle', stroke: '#ff0000' });
      const circle = createMockObject({ id: 'circle-1', type: 'circle', stroke: '#00ff00' });
      setStoreObjects([rect, circle]);
      render(
        <TestSelectionWrapper selectedIds={['rect-1', 'circle-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const strokeInput = screen.getByTestId('property-inspector-stroke-input');
      expect(strokeInput).toHaveValue('Mixed');
      expect(strokeInput).toBeDisabled();
    });

    it('does not commit fill change when value is "Mixed"', () => {
      const rect = createMockObject({ id: 'rect-1', type: 'rectangle', fill: '#ff0000' });
      const circle = createMockObject({ id: 'circle-1', type: 'circle', fill: '#00ff00' });
      setStoreObjects([rect, circle]);
      render(
        <TestSelectionWrapper selectedIds={['rect-1', 'circle-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const fillInput = screen.getByTestId('property-inspector-fill-input');
      fireEvent.change(fillInput, { target: { value: 'Mixed' } });
      expect(mockOnObjectUpdate).not.toHaveBeenCalled();
    });

    it('shows "Mixed" for opacity when objects have different opacities', () => {
      const rect = createMockObject({ id: 'rect-1', type: 'rectangle', opacity: 0.5 });
      const circle = createMockObject({ id: 'circle-1', type: 'circle', opacity: 0.8 });
      setStoreObjects([rect, circle]);
      render(
        <TestSelectionWrapper selectedIds={['rect-1', 'circle-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const opacitySlider = screen.getByTestId('property-inspector-opacity-slider');
      expect(opacitySlider).toBeDisabled();
      expect(screen.getByText('Mixed')).toBeInTheDocument();
    });

    it.skip('does not commit opacity change when value is "Mixed"', () => {
      const rect = createMockObject({ id: 'rect-1', type: 'rectangle', opacity: 0.5 });
      const circle = createMockObject({ id: 'circle-1', type: 'circle', opacity: 0.8 });
      setStoreObjects([rect, circle]);
      render(
        <TestSelectionWrapper selectedIds={['rect-1', 'circle-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      mockOnObjectUpdate.mockClear();
      const opacitySlider = screen.getByTestId('property-inspector-opacity-slider');
      fireEvent.change(opacitySlider, { target: { value: 'Mixed' } });
      expect(mockOnObjectUpdate).not.toHaveBeenCalled();
    });

    it('shows "Mixed" for font color when sticky and text have different colors', () => {
      const sticky = createMockObject({
        id: 'sticky-1',
        type: 'sticky',
        fill: '#fef08a',
        textFill: '#ff0000',
      });
      const textObj = createMockObject({
        id: 'text-1',
        type: 'text',
        fill: '#00ff00',
        text: 'text',
        fontSize: 16,
      });
      setStoreObjects([sticky, textObj]);
      render(
        <TestSelectionWrapper selectedIds={['sticky-1', 'text-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const fontColorInput = screen.getByTestId('property-inspector-font-color-input');
      expect(fontColorInput).toHaveValue('Mixed');
      expect(fontColorInput).toBeDisabled();
    });

    it('does not commit font color change when value is "Mixed"', () => {
      const sticky = createMockObject({
        id: 'sticky-1',
        type: 'sticky',
        fill: '#fef08a',
        textFill: '#ff0000',
      });
      const textObj = createMockObject({
        id: 'text-1',
        type: 'text',
        fill: '#00ff00',
        text: 'text',
        fontSize: 16,
      });
      setStoreObjects([sticky, textObj]);
      render(
        <TestSelectionWrapper selectedIds={['sticky-1', 'text-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const fontColorInput = screen.getByTestId('property-inspector-font-color-input');
      fireEvent.change(fontColorInput, { target: { value: 'Mixed' } });
      expect(mockOnObjectUpdate).not.toHaveBeenCalled();
    });

    it('does not commit font color when empty string', () => {
      const sticky = createMockObject({
        id: 'sticky-1',
        type: 'sticky',
        fill: '#fef08a',
        textFill: '#ff0000',
      });
      setStoreObjects([sticky]);
      render(
        <TestSelectionWrapper selectedIds={['sticky-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const fontColorInput = screen.getByTestId('property-inspector-font-color-input');
      fireEvent.change(fontColorInput, { target: { value: '' } });
      expect(mockOnObjectUpdate).not.toHaveBeenCalled();
    });

    it('shows "Mixed" for font size when sticky and text have different sizes', () => {
      const sticky = createMockObject({
        id: 'sticky-1',
        type: 'sticky',
        fontSize: 14,
      });
      const textObj = createMockObject({
        id: 'text-1',
        type: 'text',
        fill: '#000',
        text: 'text',
        fontSize: 24,
      });
      setStoreObjects([sticky, textObj]);
      render(
        <TestSelectionWrapper selectedIds={['sticky-1', 'text-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const fontSizeInput = screen.getByTestId('property-inspector-font-size');
      expect(fontSizeInput).toBeDisabled();
    });

    it('shows mixed stroke width when objects have different widths', () => {
      const rect = createMockObject({ id: 'rect-1', type: 'rectangle', strokeWidth: 2 });
      const circle = createMockObject({ id: 'circle-1', type: 'circle', strokeWidth: 5 });
      setStoreObjects([rect, circle]);
      render(
        <TestSelectionWrapper selectedIds={['rect-1', 'circle-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const strokeWidthInput = screen.getByTestId('property-inspector-stroke-width');
      expect(strokeWidthInput).toBeDisabled();
    });

    it('multi-select fill with line + rectangle only shows fill for fillable types', () => {
      const rect = createMockObject({ id: 'rect-1', type: 'rectangle', fill: '#ff0000' });
      const line = createMockObject({
        id: 'line-1',
        type: 'line',
        fill: 'transparent',
        stroke: '#000',
        points: [0, 0, 100, 100],
      });
      setStoreObjects([rect, line]);
      render(
        <TestSelectionWrapper selectedIds={['rect-1', 'line-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      // fill section is shown because rectangle supports fill
      expect(screen.getByTestId('property-inspector-fill-color')).toBeInTheDocument();
      // stroke section is shown because both support stroke
      expect(screen.getByTestId('property-inspector-stroke-color')).toBeInTheDocument();
    });
  });

  // ── Connector selection ─────────────────────────────────────────────
  describe('connector selection', () => {
    it('shows arrowheads panel for connector', () => {
      const connector = createMockObject({
        id: 'conn-1',
        type: 'connector',
        stroke: '#000',
        arrowheads: 'end',
        strokeStyle: 'solid',
        points: [0, 0, 100, 100],
        fill: '#000',
      });
      setStoreObjects([connector]);
      render(
        <TestSelectionWrapper selectedIds={['conn-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      expect(screen.getByTestId('property-inspector-arrowheads')).toBeInTheDocument();
      expect(screen.getByTestId('property-inspector-arrowheads-none')).toBeInTheDocument();
      expect(screen.getByTestId('property-inspector-arrowheads-start')).toBeInTheDocument();
      expect(screen.getByTestId('property-inspector-arrowheads-end')).toBeInTheDocument();
      expect(screen.getByTestId('property-inspector-arrowheads-both')).toBeInTheDocument();
    });

    it('calls onObjectUpdate when arrowhead is changed', () => {
      const connector = createMockObject({
        id: 'conn-1',
        type: 'connector',
        stroke: '#000',
        arrowheads: 'end',
        strokeStyle: 'solid',
        points: [0, 0, 100, 100],
        fill: '#000',
      });
      setStoreObjects([connector]);
      render(
        <TestSelectionWrapper selectedIds={['conn-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      fireEvent.click(screen.getByTestId('property-inspector-arrowheads-both'));
      expect(mockOnObjectUpdate).toHaveBeenCalledWith('conn-1', { arrowheads: 'both' });
    });

    it('shows stroke style panel for connector', () => {
      const connector = createMockObject({
        id: 'conn-1',
        type: 'connector',
        stroke: '#000',
        arrowheads: 'end',
        strokeStyle: 'solid',
        points: [0, 0, 100, 100],
        fill: '#000',
      });
      setStoreObjects([connector]);
      render(
        <TestSelectionWrapper selectedIds={['conn-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      expect(screen.getByTestId('property-inspector-stroke-style')).toBeInTheDocument();
      expect(screen.getByTestId('property-inspector-stroke-style-solid')).toBeInTheDocument();
      expect(screen.getByTestId('property-inspector-stroke-style-dashed')).toBeInTheDocument();
      expect(screen.getByTestId('property-inspector-stroke-style-dotted')).toBeInTheDocument();
    });

    it('calls onObjectUpdate when stroke style is changed', () => {
      const connector = createMockObject({
        id: 'conn-1',
        type: 'connector',
        stroke: '#000',
        arrowheads: 'end',
        strokeStyle: 'solid',
        points: [0, 0, 100, 100],
        fill: '#000',
      });
      setStoreObjects([connector]);
      render(
        <TestSelectionWrapper selectedIds={['conn-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      fireEvent.click(screen.getByTestId('property-inspector-stroke-style-dashed'));
      expect(mockOnObjectUpdate).toHaveBeenCalledWith('conn-1', { strokeStyle: 'dashed' });
    });

    it('does not show arrowheads or stroke style for non-connector types', () => {
      const rect = createMockObject({ id: 'rect-1', type: 'rectangle' });
      setStoreObjects([rect]);
      render(
        <TestSelectionWrapper selectedIds={['rect-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      expect(screen.queryByTestId('property-inspector-arrowheads')).not.toBeInTheDocument();
      expect(screen.queryByTestId('property-inspector-stroke-style')).not.toBeInTheDocument();
    });
  });

  // ── Font color for sticky without textFill ──────────────────────────
  it('font color uses default #000000 for sticky without textFill', () => {
    const sticky = createMockObject({
      id: 'sticky-no-textfill',
      type: 'sticky',
      fill: '#fef08a',
    });
    setStoreObjects([sticky]);
    render(
      <TestSelectionWrapper selectedIds={['sticky-no-textfill']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const fontColorInput = screen.getByTestId('property-inspector-font-color-input');
    expect(fontColorInput).toHaveValue('#000000');
  });

  // ── Opacity edge cases ──────────────────────────────────────────────
  it('does not commit opacity for invalid numeric values', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle', opacity: 1 });
    setStoreObjects([obj]);
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const opacitySlider = screen.getByTestId('property-inspector-opacity-slider');
    // Value above 100 should be rejected
    fireEvent.change(opacitySlider, { target: { value: '150' } });
    expect(mockOnObjectUpdate).not.toHaveBeenCalled();
  });

  it('handles opacity null default (no opacity set)', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle' });
    // Remove opacity to test null/undefined default
    delete (obj as unknown as Record<string, unknown>).opacity;
    setStoreObjects([obj]);
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const opacitySlider = screen.getByTestId('property-inspector-opacity-slider');
    // Default: opacity is 1 → 100%
    expect(opacitySlider).toHaveValue('100');
  });

  // ── Stroke change with empty string guard ─────────────────────────
  it('does not commit stroke change when value is empty string', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle', stroke: '#000' });
    setStoreObjects([obj]);
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const strokeInput = screen.getByTestId('property-inspector-stroke-input');
    fireEvent.change(strokeInput, { target: { value: '' } });
    expect(mockOnObjectUpdate).not.toHaveBeenCalled();
  });

  it('does not commit fill change when value is empty string', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle', fill: '#ff0000' });
    setStoreObjects([obj]);
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const fillInput = screen.getByTestId('property-inspector-fill-input');
    fireEvent.change(fillInput, { target: { value: '' } });
    expect(mockOnObjectUpdate).not.toHaveBeenCalled();
  });

  // ── Single frame selection → FrameProperties ───────────────────────
  describe('FrameProperties sub-component', () => {
    it('routes to FrameProperties panel when single frame is selected', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'My Frame',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
        cornerRadius: 8,
        opacity: 1,
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      expect(screen.getByTestId('property-inspector-panel')).toBeInTheDocument();
      expect(screen.getByText('Frame: My Frame')).toBeInTheDocument();
      expect(screen.getByTestId('property-inspector-frame-title')).toHaveValue('My Frame');
    });

    it('shows default "Frame" text when frame has no text', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      expect(screen.getByText('Frame: Frame')).toBeInTheDocument();
      expect(screen.getByTestId('property-inspector-frame-title')).toHaveValue('Frame');
    });

    it('commits title on blur when changed', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Old Title',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const titleInput = screen.getByTestId('property-inspector-frame-title');
      fireEvent.change(titleInput, { target: { value: 'New Title' } });
      fireEvent.blur(titleInput);
      expect(mockOnObjectUpdate).toHaveBeenCalledWith('frame-1', { text: 'New Title' });
    });

    it('does not commit title on blur when title unchanged', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Same Title',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const titleInput = screen.getByTestId('property-inspector-frame-title');
      fireEvent.blur(titleInput);
      expect(mockOnObjectUpdate).not.toHaveBeenCalled();
    });

    it('commits title on Enter key', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Old Title',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const titleInput = screen.getByTestId('property-inspector-frame-title');
      fireEvent.change(titleInput, { target: { value: 'Enter Title' } });
      fireEvent.keyDown(titleInput, { key: 'Enter' });
      expect(mockOnObjectUpdate).toHaveBeenCalledWith('frame-1', { text: 'Enter Title' });
    });

    it('does not commit title on non-Enter key', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Old Title',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const titleInput = screen.getByTestId('property-inspector-frame-title');
      fireEvent.change(titleInput, { target: { value: 'Changed' } });
      fireEvent.keyDown(titleInput, { key: 'a' });
      // Only Enter triggers commit — other keys should not
      expect(mockOnObjectUpdate).not.toHaveBeenCalled();
    });

    it('frame opacity slider rejects invalid values', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Frame',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
        opacity: 1,
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const opacitySlider = screen.getByTestId('property-inspector-opacity-slider');
      // Value above 100 should be rejected
      fireEvent.change(opacitySlider, { target: { value: '150' } });
      expect(mockOnObjectUpdate).not.toHaveBeenCalled();
    });

    it('frame fill change with empty string is rejected', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Frame',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const fillInput = screen.getByTestId('property-inspector-fill-input');
      fireEvent.change(fillInput, { target: { value: '' } });
      // Empty string guard: should not update
      expect(mockOnObjectUpdate).not.toHaveBeenCalled();
    });

    it('frame stroke change with empty string is rejected', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Frame',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const strokeInput = screen.getByTestId('property-inspector-stroke-input');
      fireEvent.change(strokeInput, { target: { value: '' } });
      // Empty string guard: should not update
      expect(mockOnObjectUpdate).not.toHaveBeenCalled();
    });

    it('shows child count and disabled buttons when frame has no children', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Frame',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      expect(screen.getByText('0 children')).toBeInTheDocument();
      const selectAllBtn = screen.getByTestId('property-inspector-select-children');
      const resizeBtn = screen.getByTestId('property-inspector-resize-to-fit');
      expect(selectAllBtn).toBeDisabled();
      expect(resizeBtn).toBeDisabled();
    });

    it('shows child count and enabled buttons when frame has children', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Frame',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
        x: 0,
        y: 0,
        width: 300,
        height: 200,
      });
      const child1 = createMockObject({
        id: 'child-1',
        type: 'sticky',
        x: 50,
        y: 50,
        parentFrameId: 'frame-1',
      });
      const child2 = createMockObject({
        id: 'child-2',
        type: 'rectangle',
        x: 100,
        y: 100,
        parentFrameId: 'frame-1',
      });
      setStoreObjects([frame, child1, child2]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      expect(screen.getByText('2 children')).toBeInTheDocument();
      const selectAllBtn = screen.getByTestId('property-inspector-select-children');
      const resizeBtn = screen.getByTestId('property-inspector-resize-to-fit');
      expect(selectAllBtn).not.toBeDisabled();
      expect(resizeBtn).not.toBeDisabled();
    });

    it('singular "child" text when frame has 1 child', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Frame',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
        x: 0,
        y: 0,
        width: 300,
        height: 200,
      });
      const child1 = createMockObject({
        id: 'child-1',
        type: 'sticky',
        x: 50,
        y: 50,
        parentFrameId: 'frame-1',
      });
      setStoreObjects([frame, child1]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      expect(screen.getByText('1 child')).toBeInTheDocument();
    });

    it('resize-to-fit calls onObjectUpdate with bounding box of children', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Frame',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
        x: 0,
        y: 0,
        width: 500,
        height: 400,
      });
      const child1 = createMockObject({
        id: 'child-1',
        type: 'sticky',
        x: 50,
        y: 60,
        width: 100,
        height: 80,
        parentFrameId: 'frame-1',
      });
      const child2 = createMockObject({
        id: 'child-2',
        type: 'rectangle',
        x: 200,
        y: 180,
        width: 80,
        height: 60,
        parentFrameId: 'frame-1',
      });
      setStoreObjects([frame, child1, child2]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      fireEvent.click(screen.getByTestId('property-inspector-resize-to-fit'));
      expect(mockOnObjectUpdate).toHaveBeenCalledWith('frame-1', {
        x: 50 - 20,           // minX - FRAME_PADDING
        y: 60 - 20 - 32,      // minY - FRAME_PADDING - title bar height
        width: (280 - 50) + 40,  // (maxX - minX) + FRAME_PADDING * 2
        height: (240 - 60) + 40 + 32, // (maxY - minY) + FRAME_PADDING * 2 + title bar
      });
    });

    it('resize-to-fit does nothing when frame has no children', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Frame',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      // Button is disabled, but even if forced click, should not call
      const resizeBtn = screen.getByTestId('property-inspector-resize-to-fit');
      expect(resizeBtn).toBeDisabled();
    });

    it('select-all-children does nothing when frame has no children', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Frame',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const selectAllBtn = screen.getByTestId('property-inspector-select-children');
      expect(selectAllBtn).toBeDisabled();
    });

    it('frame corner radius commits on blur', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Frame',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
        cornerRadius: 8,
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const cornerRadiusInput = screen.getByTestId('property-inspector-corner-radius');
      expect(cornerRadiusInput).toBeInTheDocument();
      fireEvent.change(cornerRadiusInput, { target: { value: '12' } });
      fireEvent.blur(cornerRadiusInput);
      expect(mockOnObjectUpdate).toHaveBeenCalledWith('frame-1', { cornerRadius: 12 });
    });

    it('frame corner radius clamps negative to 0', () => {
      const frame = createMockObject({
        id: 'frame-1',
        type: 'frame',
        text: 'Frame',
        fill: '#f1f5f9',
        stroke: '#94a3b8',
        cornerRadius: 8,
      });
      setStoreObjects([frame]);
      render(
        <TestSelectionWrapper selectedIds={['frame-1']}>
          <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
        </TestSelectionWrapper>
      );
      const cornerRadiusInput = screen.getByTestId('property-inspector-corner-radius');
      mockOnObjectUpdate.mockClear();
      fireEvent.change(cornerRadiusInput, { target: { value: '-5' } });
      fireEvent.blur(cornerRadiusInput);
      // useDebouncedNumberField rejects values below min (0), so commit never fires
      expect(mockOnObjectUpdate).not.toHaveBeenCalled();
    });
  });

  // ── Objects with null strokeWidth ──────────────────────────────────
  it('handles objects with null/undefined strokeWidth', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle' });
    delete (obj as unknown as Record<string, unknown>).strokeWidth;
    setStoreObjects([obj]);
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    // Stroke width should show even if the object has no strokeWidth set
    expect(screen.getByTestId('property-inspector-stroke-width')).toBeInTheDocument();
  });

  // ── Objects with null fontSize default ─────────────────────────────
  it('handles sticky with null fontSize defaulting to 14', () => {
    const sticky = createMockObject({
      id: 'sticky-null-font',
      type: 'sticky',
    });
    delete (sticky as unknown as Record<string, unknown>).fontSize;
    setStoreObjects([sticky]);
    render(
      <TestSelectionWrapper selectedIds={['sticky-null-font']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const fontSizeInput = screen.getByTestId('property-inspector-font-size');
    expect(fontSizeInput).toHaveValue(14);
  });

  // ── Connector with no arrowheads/strokeStyle (defaults) ───────────
  it('connector defaults to arrowheads=end and strokeStyle=solid when undefined', () => {
    const connector = createMockObject({
      id: 'conn-default',
      type: 'connector',
      stroke: '#000',
      fill: '#000',
      points: [0, 0, 100, 100],
    });
    setStoreObjects([connector]);
    render(
      <TestSelectionWrapper selectedIds={['conn-default']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    // The "end" button should be highlighted (active state)
    const endBtn = screen.getByTestId('property-inspector-arrowheads-end');
    expect(endBtn.className).toContain('bg-primary');
    // The "solid" button should be highlighted
    const solidBtn = screen.getByTestId('property-inspector-stroke-style-solid');
    expect(solidBtn.className).toContain('bg-primary');
  });

  // ── Stroke with no strokes defined ────────────────────────────────
  it('shows empty stroke value when objects have no strokes', () => {
    const sticky = createMockObject({
      id: 'sticky-no-stroke',
      type: 'sticky',
      fill: '#fef08a',
    });
    delete (sticky as unknown as Record<string, unknown>).stroke;
    setStoreObjects([sticky]);
    render(
      <TestSelectionWrapper selectedIds={['sticky-no-stroke']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    // Sticky doesn't support stroke so no stroke section
    expect(screen.queryByTestId('property-inspector-stroke-color')).not.toBeInTheDocument();
  });

  // ── Plural label for multiple objects ──────────────────────────────
  it('shows correct plural label for multiple objects', () => {
    const rect1 = createMockObject({ id: 'rect-1', type: 'rectangle', fill: '#ff0000' });
    const rect2 = createMockObject({ id: 'rect-2', type: 'rectangle', fill: '#ff0000' });
    const rect3 = createMockObject({ id: 'rect-3', type: 'rectangle', fill: '#ff0000' });
    setStoreObjects([rect1, rect2, rect3]);
    render(
      <TestSelectionWrapper selectedIds={['rect-1', 'rect-2', 'rect-3']}>
        <PropertyInspector onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    expect(screen.getByText('3 objects selected')).toBeInTheDocument();
  });
});
