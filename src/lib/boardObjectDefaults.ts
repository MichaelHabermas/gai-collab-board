/** Single source for board object default dimensions, colors, and options. Constants only. */

import { IDimensions, IPosition } from '@/types';

export const DEFAULT_WIDTH = 200;
export const DEFAULT_HEIGHT = 200;

export const DEFAULT_STICKY_WIDTH = DEFAULT_WIDTH;
export const DEFAULT_STICKY_HEIGHT = DEFAULT_HEIGHT;
/** Default sticky note text when user does not specify content (e.g. "add a note"). */
export const DEFAULT_STICKY_TEXT = 'New note';

/** Default size for rectangle (square) shape when not specified. */
export const DEFAULT_RECTANGLE_WIDTH = DEFAULT_WIDTH;
export const DEFAULT_RECTANGLE_HEIGHT = DEFAULT_HEIGHT;
export const DEFAULT_DIMENSIONS: IDimensions = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
export const DEFAULT_POSITION: IPosition = { x: 100, y: 100 };

export const DEFAULT_FILL = '#fef08a';
export const DEFAULT_FONT_COLOR = '#1e293b';

export const DEFAULT_FRAME_WIDTH = 300;
export const DEFAULT_FRAME_HEIGHT = 200;
export const DEFAULT_FRAME_PADDING = 30;
/** Default frame title when user does not specify one (e.g. "add a frame"). */
export const DEFAULT_FRAME_TITLE = 'Frame';

export const DEFAULT_SHAPE_FILL = '#93c5fd';
export const DEFAULT_SHAPE_STROKE = '#1e293b';
export const DEFAULT_SHAPE_STROKE_WIDTH = 2;

export const DEFAULT_CONNECTOR_STROKE = '#64748b';

export const DEFAULT_TEXT_WIDTH = 200;
export const DEFAULT_TEXT_HEIGHT = 30;
export const DEFAULT_TEXT_FONT_SIZE = 16;
/** Default standalone text content when user does not specify (e.g. "add text"). */
export const DEFAULT_TEXT_CONTENT = 'Text';

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
