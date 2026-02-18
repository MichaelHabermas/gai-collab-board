import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { AlignToolbar } from '@/components/canvas/AlignToolbar';
import type { IBoardObject } from '@/types';

const createMockObject = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): IBoardObject => ({
  id,
  type: 'sticky',
  x,
  y,
  width,
  height,
  rotation: 0,
  fill: '#fef08a',
  createdBy: 'user-1',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
});

describe('AlignToolbar', () => {
  const mockOnObjectUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when fewer than 2 objects selected', () => {
    const objects = [
      createMockObject('a', 0, 0, 50, 40),
      createMockObject('b', 100, 50, 50, 40),
    ];
    const { container } = render(
      <AlignToolbar
        objects={objects}
        selectedIds={['a']}
        onObjectUpdate={mockOnObjectUpdate}
        canEdit={true}
      />
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('align-toolbar')).not.toBeInTheDocument();
  });

  it('renders toolbar when 2 or more objects selected', () => {
    const objects = [
      createMockObject('a', 0, 0, 50, 40),
      createMockObject('b', 100, 50, 50, 40),
    ];
    render(
      <AlignToolbar
        objects={objects}
        selectedIds={['a', 'b']}
        onObjectUpdate={mockOnObjectUpdate}
        canEdit={true}
      />
    );
    expect(screen.getByTestId('align-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('align-toolbar-left')).toBeInTheDocument();
    expect(screen.getByTestId('align-toolbar-distribute-horizontal')).toBeInTheDocument();
  });

  it('does not render when canEdit is false', () => {
    const objects = [
      createMockObject('a', 0, 0, 50, 40),
      createMockObject('b', 100, 50, 50, 40),
    ];
    const { container } = render(
      <AlignToolbar
        objects={objects}
        selectedIds={['a', 'b']}
        onObjectUpdate={mockOnObjectUpdate}
        canEdit={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls onObjectUpdate with align left positions when align left clicked', () => {
    const objects = [
      createMockObject('a', 50, 0, 50, 40),
      createMockObject('b', 200, 80, 60, 40),
    ];
    render(
      <AlignToolbar
        objects={objects}
        selectedIds={['a', 'b']}
        onObjectUpdate={mockOnObjectUpdate}
        canEdit={true}
      />
    );
    fireEvent.click(screen.getByTestId('align-toolbar-left'));
    expect(mockOnObjectUpdate).toHaveBeenCalledTimes(2);
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('a', { x: 50 });
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('b', { x: 50 });
  });

  it('calls onObjectUpdate with align top positions when align top clicked', () => {
    const objects = [
      createMockObject('a', 0, 100, 50, 40),
      createMockObject('b', 80, 20, 50, 40),
    ];
    render(
      <AlignToolbar
        objects={objects}
        selectedIds={['a', 'b']}
        onObjectUpdate={mockOnObjectUpdate}
        canEdit={true}
      />
    );
    fireEvent.click(screen.getByTestId('align-toolbar-top'));
    expect(mockOnObjectUpdate).toHaveBeenCalledTimes(2);
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('a', { y: 20 });
    expect(mockOnObjectUpdate).toHaveBeenCalledWith('b', { y: 20 });
  });

  it('distribute buttons are disabled when only 2 selected', () => {
    const objects = [
      createMockObject('a', 0, 0, 50, 40),
      createMockObject('b', 100, 50, 50, 40),
    ];
    render(
      <AlignToolbar
        objects={objects}
        selectedIds={['a', 'b']}
        onObjectUpdate={mockOnObjectUpdate}
        canEdit={true}
      />
    );
    expect(screen.getByTestId('align-toolbar-distribute-horizontal')).toBeDisabled();
    expect(screen.getByTestId('align-toolbar-distribute-vertical')).toBeDisabled();
  });

  it('calls onObjectUpdate for distribute when 3 objects selected', () => {
    const objects = [
      createMockObject('a', 0, 0, 50, 40),
      createMockObject('b', 100, 0, 50, 40),
      createMockObject('c', 200, 0, 50, 40),
    ];
    render(
      <AlignToolbar
        objects={objects}
        selectedIds={['a', 'b', 'c']}
        onObjectUpdate={mockOnObjectUpdate}
        canEdit={true}
      />
    );
    fireEvent.click(screen.getByTestId('align-toolbar-distribute-horizontal'));
    expect(mockOnObjectUpdate).toHaveBeenCalledTimes(3);
  });
});
