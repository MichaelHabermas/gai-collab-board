import type { Theme } from '@/hooks/useTheme';

/** Board background colors driven only by app theme (ignore system/browser theme). */
export const BOARD_CANVAS_BACKGROUND_LIGHT = '#ffffff';
export const BOARD_CANVAS_BACKGROUND_DARK = '#1e293b';
export const BOARD_GRID_COLOR_LIGHT = '#94a3b8';
export const BOARD_GRID_COLOR_DARK = '#334155';

export function getBoardCanvasBackgroundColor(theme: Theme): string {
  return theme === 'dark' ? BOARD_CANVAS_BACKGROUND_DARK : BOARD_CANVAS_BACKGROUND_LIGHT;
}

export function getBoardGridColor(theme: Theme): string {
  return theme === 'dark' ? BOARD_GRID_COLOR_DARK : BOARD_GRID_COLOR_LIGHT;
}

/** Board canvas container class; background is set via inline style from app theme. */
export const BOARD_CANVAS_CONTAINER_CLASS = 'w-full h-full overflow-hidden relative';
