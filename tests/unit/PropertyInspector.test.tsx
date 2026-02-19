import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { PropertyInspector } from '@/components/canvas/PropertyInspector';
import { setSelectionStoreState } from '@/stores/selectionStore';
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

  beforeEach(() => {
    vi.clearAllMocks();
    setSelectionStoreState([]);
  });

  it('shows empty state when no selection', () => {
    render(
      <TestSelectionWrapper selectedIds={[]}>
        <PropertyInspector objects={[]} onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    expect(screen.getByTestId('property-inspector-empty')).toBeInTheDocument();
    expect(screen.getByText(/Select one or more objects/)).toBeInTheDocument();
  });

  it('shows panel when one object selected', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle' });
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector objects={[obj]} onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    expect(screen.getByTestId('property-inspector-panel')).toBeInTheDocument();
    expect(screen.getByText('1 object selected')).toBeInTheDocument();
  });

  it('shows fill and stroke controls for shape object', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle', fill: '#fef08a' });
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector objects={[obj]} onObjectUpdate={mockOnObjectUpdate} />
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
    render(
      <TestSelectionWrapper selectedIds={['line-1']}>
        <PropertyInspector objects={[lineObj]} onObjectUpdate={mockOnObjectUpdate} />
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
        <PropertyInspector objects={[]} onObjectUpdate={mockOnObjectUpdate} />
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
    render(
      <TestSelectionWrapper selectedIds={['sticky-1']}>
        <PropertyInspector objects={[sticky]} onObjectUpdate={mockOnObjectUpdate} />
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
    render(
      <TestSelectionWrapper selectedIds={['sticky-1']}>
        <PropertyInspector objects={[sticky]} onObjectUpdate={mockOnObjectUpdate} />
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
    render(
      <TestSelectionWrapper selectedIds={['text-1']}>
        <PropertyInspector objects={[textObject]} onObjectUpdate={mockOnObjectUpdate} />
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
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector objects={[obj]} onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const fillInput = screen.getByTestId('property-inspector-fill-input');
    fireEvent.change(fillInput, { target: { value: '#86efac' } });
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('obj-1', { fill: '#86efac' });
  });

  it('changing stroke width commits on blur and calls onObjectUpdate', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle', strokeWidth: 2 });
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector objects={[obj]} onObjectUpdate={mockOnObjectUpdate} />
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
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector objects={[obj]} onObjectUpdate={mockOnObjectUpdate} />
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
    render(
      <TestSelectionWrapper selectedIds={['line-1']}>
        <PropertyInspector objects={[lineObj]} onObjectUpdate={mockOnObjectUpdate} />
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
    render(
      <TestSelectionWrapper selectedIds={['line-1']}>
        <PropertyInspector objects={[lineObj]} onObjectUpdate={mockOnObjectUpdate} />
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
    render(
      <TestSelectionWrapper selectedIds={['sticky-2']}>
        <PropertyInspector objects={[sticky]} onObjectUpdate={mockOnObjectUpdate} />
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
    render(
      <TestSelectionWrapper selectedIds={['line-2']}>
        <PropertyInspector objects={[lineObj]} onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    expect(screen.queryByTestId('property-inspector-font-color-color')).not.toBeInTheDocument();
    expect(screen.queryByTestId('property-inspector-font-color-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('property-inspector-font-size')).not.toBeInTheDocument();
  });

  it('shows opacity slider and calls onObjectUpdate when changed', () => {
    const obj = createMockObject({ id: 'obj-1', type: 'rectangle', opacity: 1 });
    render(
      <TestSelectionWrapper selectedIds={['obj-1']}>
        <PropertyInspector objects={[obj]} onObjectUpdate={mockOnObjectUpdate} />
      </TestSelectionWrapper>
    );
    const opacitySlider = screen.getByTestId('property-inspector-opacity-slider');
    expect(opacitySlider).toBeInTheDocument();
    fireEvent.change(opacitySlider, { target: { value: '50' } });
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('obj-1', { opacity: 0.5 });
  });
});
