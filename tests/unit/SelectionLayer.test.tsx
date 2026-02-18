import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectionLayer } from '@/components/canvas/SelectionLayer';

let rectProps: Record<string, unknown> | null = null;

vi.mock('react-konva', () => ({
  Rect: (props: Record<string, unknown>) => {
    rectProps = props;
    return <div data-testid='selection-rect' />;
  },
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

describe('SelectionLayer', () => {
  beforeEach(() => {
    rectProps = null;
  });

  it('returns null when selection rectangle is hidden', () => {
    render(
      <SelectionLayer
        selectionRect={{
          visible: false,
          x1: 10,
          y1: 10,
          x2: 20,
          y2: 20,
        }}
      />
    );

    expect(screen.queryByTestId('selection-rect')).not.toBeInTheDocument();
    expect(rectProps).toBeNull();
  });

  it('renders normalized selection rectangle props when visible', () => {
    render(
      <SelectionLayer
        selectionRect={{
          visible: true,
          x1: 120,
          y1: 80,
          x2: 40,
          y2: 20,
        }}
      />
    );

    expect(screen.getByTestId('selection-rect')).toBeInTheDocument();
    expect(rectProps).not.toBeNull();
    expect(rectProps?.x).toBe(40);
    expect(rectProps?.y).toBe(20);
    expect(rectProps?.width).toBe(80);
    expect(rectProps?.height).toBe(60);
    expect(rectProps?.stroke).toBe('#3b82f6');
    expect(rectProps?.fill).toBe('rgba(59, 130, 246, 0.1)');
    expect(rectProps?.listening).toBe(false);
  });
});
