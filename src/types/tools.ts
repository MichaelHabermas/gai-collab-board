/**
 * Canvas tool mode. Moved from Toolbar so types are not exported from components.
 * Replace in: Toolbar, BoardCanvas.
 */

import type { ShapeType } from './board';

/** Active canvas tool: select, pan, or a shape type for drawing. */
export type ToolMode = 'select' | 'pan' | ShapeType;
