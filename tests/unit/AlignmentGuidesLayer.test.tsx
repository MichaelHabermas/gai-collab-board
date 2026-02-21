import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { AlignmentGuidesLayer } from '@/components/canvas/AlignmentGuidesLayer';
import { useTheme } from '@/hooks/useTheme';

vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(),
}));

// Mock react-konva components to render as simple DOM elements for testing
vi.mock('react-konva', () => ({
  Group: ({ children, listening, ...props }: any) => <g data-testid="konva-group" data-listening={listening} {...props}>{children}</g>,
  Line: ({ listening, ...props }: any) => <line data-testid="konva-line" data-listening={listening} {...props} />
}));

describe('AlignmentGuidesLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useTheme as any).mockReturnValue({ theme: 'light' });
  });

  it('returns null when guides is null', () => {
    const { container } = render(<AlignmentGuidesLayer guides={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when both horizontal and vertical guides are empty', () => {
    const { container } = render(
      <AlignmentGuidesLayer guides={{ horizontal: [], vertical: [] }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a Group with Lines when horizontal and vertical guides are provided', () => {
    const { getAllByTestId, getByTestId } = render(
      <AlignmentGuidesLayer guides={{ horizontal: [100], vertical: [200, 300] }} />
    );

    const group = getByTestId('konva-group');
    expect(group).toBeTruthy();
    
    const lines = getAllByTestId('konva-line');
    expect(lines).toHaveLength(3); // 1 horizontal, 2 vertical
  });

  it('uses default fallback color if theme is falsy', () => {
    (useTheme as any).mockReturnValue({ theme: null });
    const { getAllByTestId } = render(
      <AlignmentGuidesLayer guides={{ horizontal: [100], vertical: [] }} />
    );
    
    const line = getAllByTestId('konva-line')[0];
    expect(line.getAttribute('stroke')).toBe('#3b82f6');
  });

  it('computes color from CSS variable when theme is present', () => {
    (useTheme as any).mockReturnValue({ theme: 'dark' });
    
    // Mock getComputedStyle
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = vi.fn().mockImplementation(() => {
      return {
        getPropertyValue: (prop: string) => {
          if (prop === '--color-primary') return ' #ff0000 ';
          return '';
        }
      } as any;
    });

    const { getAllByTestId } = render(
      <AlignmentGuidesLayer guides={{ horizontal: [100], vertical: [] }} />
    );
    
    const line = getAllByTestId('konva-line')[0];
    expect(line.getAttribute('stroke')).toBe('#ff0000');

    // Restore original
    window.getComputedStyle = originalGetComputedStyle;
  });
});