import { describe, it, expect } from 'vitest';
import {
  BOARD_CANVAS_CONTAINER_CLASS,
  getBoardCanvasBackgroundColor,
  getBoardGridColor,
  BOARD_CANVAS_BACKGROUND_LIGHT,
  BOARD_CANVAS_BACKGROUND_DARK,
  BOARD_GRID_COLOR_LIGHT,
  BOARD_GRID_COLOR_DARK,
  GRID_LINE_OPACITY,
} from '@/components/canvas/BoardCanvas';

describe('BoardCanvas background', () => {
  it('uses app theme only for background (no token class); container has layout class', () => {
    expect(BOARD_CANVAS_CONTAINER_CLASS).not.toContain('bg-background');
    expect(BOARD_CANVAS_CONTAINER_CLASS).toContain('relative');
  });

  it('returns light background for light theme', () => {
    expect(getBoardCanvasBackgroundColor('light')).toBe(BOARD_CANVAS_BACKGROUND_LIGHT);
    expect(BOARD_CANVAS_BACKGROUND_LIGHT).toBe('#ffffff');
  });

  it('returns dark background for dark theme', () => {
    expect(getBoardCanvasBackgroundColor('dark')).toBe(BOARD_CANVAS_BACKGROUND_DARK);
    expect(BOARD_CANVAS_BACKGROUND_DARK).toBe('#1e293b');
  });

  it('uses 50% gridline opacity for lighter grid rendering', () => {
    expect(GRID_LINE_OPACITY).toBe(0.5);
  });

  it('uses app-theme grid colors instead of computed CSS token colors', () => {
    expect(getBoardGridColor('light')).toBe(BOARD_GRID_COLOR_LIGHT);
    expect(getBoardGridColor('dark')).toBe(BOARD_GRID_COLOR_DARK);
  });
});
