/** Single source for board object default dimensions, colors, and options. Constants only. */

export const DEFAULT_STICKY_WIDTH = 200;
export const DEFAULT_STICKY_HEIGHT = 120;

export const DEFAULT_FILL = '#fef08a';
export const DEFAULT_FONT_COLOR = '#1e293b';

export const DEFAULT_FRAME_WIDTH = 300;
export const DEFAULT_FRAME_HEIGHT = 200;
export const DEFAULT_FRAME_PADDING = 30;

export const DEFAULT_SHAPE_FILL = '#93c5fd';
export const DEFAULT_SHAPE_STROKE = '#1e293b';
export const DEFAULT_SHAPE_STROKE_WIDTH = 2;

export const DEFAULT_CONNECTOR_STROKE = '#64748b';

export const DEFAULT_TEXT_WIDTH = 200;
export const DEFAULT_TEXT_HEIGHT = 30;
export const DEFAULT_TEXT_FONT_SIZE = 16;

export const STICKY_COLORS = {
  yellow: '#fef08a',
  pink: '#fda4af',
  blue: '#93c5fd',
  green: '#86efac',
  purple: '#c4b5fd',
  orange: '#fed7aa',
  red: '#ef4444',
} as const;

export type StickyColor = keyof typeof STICKY_COLORS;
