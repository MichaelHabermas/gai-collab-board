import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Toolbar } from '@/components/canvas/Toolbar';

describe('Toolbar', () => {
  it('renders tools and disables edit tools when canEdit is false', () => {
    const onToolChange = vi.fn();
    const onColorChange = vi.fn();

    render(
      <Toolbar
        activeTool='select'
        onToolChange={onToolChange}
        activeColor='#fef08a'
        onColorChange={onColorChange}
        canEdit={false}
      />
    );

    const selectButton = screen.getByTestId('tool-select');
    const stickyButton = screen.getByTestId('tool-sticky');

    expect(selectButton).toBeEnabled();
    expect(stickyButton).toBeDisabled();

    fireEvent.click(selectButton);
    expect(onToolChange).toHaveBeenCalledWith('select');

    fireEvent.click(stickyButton);
    expect(onToolChange).toHaveBeenCalledTimes(1);
  });

  it('supports embedded mode and toggles color palette selection', () => {
    const onToolChange = vi.fn();
    const onColorChange = vi.fn();

    render(
      <Toolbar
        embedded
        activeTool='sticky'
        onToolChange={onToolChange}
        activeColor='#fef08a'
        onColorChange={onColorChange}
        canEdit={true}
      />
    );

    expect(screen.getByTestId('toolbar-embedded')).toBeInTheDocument();

    const colorToggle = screen.getByTestId('color-picker-toggle');
    fireEvent.click(colorToggle);

    const blueSwatch = screen.getByTitle('#3b82f6');
    fireEvent.click(blueSwatch);

    expect(onColorChange).toHaveBeenCalledWith('#3b82f6');
    expect(screen.queryByTitle('#ef4444')).not.toBeInTheDocument();
  });
});
