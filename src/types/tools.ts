/**
 * Canvas tool mode. Moved from Toolbar so types are not exported from components.
 */

import type { ShapeType } from './board';

/** Active canvas tool: select, pan, or a shape type for drawing. */
export type ToolMode = 'select' | 'pan' | ShapeType;

/** Returns true if the tool creates a shape via drag. */
export function isDrawingTool(tool: ToolMode): boolean {
  return ['rectangle', 'circle', 'line', 'connector', 'frame'].includes(tool);
}
