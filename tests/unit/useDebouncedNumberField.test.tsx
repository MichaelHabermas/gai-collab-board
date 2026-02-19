import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useDebouncedNumberField } from '@/hooks/useDebouncedNumberField';

function TestField({
  propValue,
  onCommit,
  debounceMs = 350,
  min,
  max,
}: {
  propValue: string;
  onCommit: (value: number) => void;
  debounceMs?: number;
  min?: number;
  max?: number;
}) {
  const { value, onChange, onBlur } = useDebouncedNumberField(propValue, onCommit, {
    debounceMs,
    min,
    max,
  });
  return (
    <input
      data-testid='debounced-number-input'
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      aria-label='number field'
    />
  );
}

describe('useDebouncedNumberField', () => {
  const mockOnCommit = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('syncs displayed value from propValue', () => {
    const { rerender } = render(
      <TestField propValue='10' onCommit={mockOnCommit} />
    );
    expect(screen.getByTestId('debounced-number-input')).toHaveValue('10');

    rerender(<TestField propValue='20' onCommit={mockOnCommit} />);
    expect(screen.getByTestId('debounced-number-input')).toHaveValue('20');
  });

  it('updates display immediately on change', () => {
    render(<TestField propValue='5' onCommit={mockOnCommit} />);
    const input = screen.getByTestId('debounced-number-input');
    fireEvent.change(input, { target: { value: '7' } });
    expect(input).toHaveValue('7');
    expect(mockOnCommit).not.toHaveBeenCalled();
  });

  it('commits after debounce delay', () => {
    render(<TestField propValue='5' onCommit={mockOnCommit} debounceMs={350} />);
    const input = screen.getByTestId('debounced-number-input');
    fireEvent.change(input, { target: { value: '12' } });
    expect(mockOnCommit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(349);
    expect(mockOnCommit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(mockOnCommit).toHaveBeenCalledTimes(1);
    expect(mockOnCommit).toHaveBeenCalledWith(12);
  });

  it('blur flushes pending value without waiting for debounce', () => {
    render(<TestField propValue='5' onCommit={mockOnCommit} debounceMs={500} />);
    const input = screen.getByTestId('debounced-number-input');
    fireEvent.change(input, { target: { value: '9' } });
    expect(mockOnCommit).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(mockOnCommit).toHaveBeenCalledTimes(1);
    expect(mockOnCommit).toHaveBeenCalledWith(9);
  });

  it('rapid changes result in single commit after debounce', () => {
    render(<TestField propValue='0' onCommit={mockOnCommit} debounceMs={400} />);
    const input = screen.getByTestId('debounced-number-input');
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.change(input, { target: { value: '3' } });
    expect(mockOnCommit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(mockOnCommit).toHaveBeenCalledTimes(1);
    expect(mockOnCommit).toHaveBeenCalledWith(3);
  });

  it('does not commit invalid value (NaN)', () => {
    render(<TestField propValue='10' onCommit={mockOnCommit} debounceMs={100} />);
    const input = screen.getByTestId('debounced-number-input');
    fireEvent.change(input, { target: { value: 'abc' } });
    vi.advanceTimersByTime(100);
    expect(mockOnCommit).not.toHaveBeenCalled();
  });

  it('does not commit when value is below min', () => {
    render(
      <TestField propValue='10' onCommit={mockOnCommit} debounceMs={100} min={0} max={100} />
    );
    const input = screen.getByTestId('debounced-number-input');
    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.blur(input);
    expect(mockOnCommit).not.toHaveBeenCalled();
  });

  it('does not commit when value is above max', () => {
    render(
      <TestField propValue='10' onCommit={mockOnCommit} debounceMs={100} min={0} max={72} />
    );
    const input = screen.getByTestId('debounced-number-input');
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.blur(input);
    expect(mockOnCommit).not.toHaveBeenCalled();
  });

  it('clears pending debounce when propValue changes', () => {
    const { rerender } = render(
      <TestField propValue='5' onCommit={mockOnCommit} debounceMs={400} />
    );
    const input = screen.getByTestId('debounced-number-input');
    fireEvent.change(input, { target: { value: '99' } });
    rerender(<TestField propValue='10' onCommit={mockOnCommit} debounceMs={400} />);
    vi.advanceTimersByTime(400);
    expect(mockOnCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId('debounced-number-input')).toHaveValue('10');
  });
});
