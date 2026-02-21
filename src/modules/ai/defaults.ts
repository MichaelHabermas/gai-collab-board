import type { ConnectorAnchor } from '@/types';
import {
  DEFAULT_STICKY_WIDTH,
  DEFAULT_STICKY_HEIGHT,
  DEFAULT_RECTANGLE_WIDTH,
  DEFAULT_RECTANGLE_HEIGHT,
  DEFAULT_FRAME_WIDTH,
  DEFAULT_FRAME_HEIGHT,
  DEFAULT_FRAME_PADDING,
  DEFAULT_FILL,
  DEFAULT_FONT_COLOR,
  DEFAULT_SHAPE_FILL,
  DEFAULT_SHAPE_STROKE_WIDTH,
  DEFAULT_CONNECTOR_STROKE,
  DEFAULT_TEXT_WIDTH,
  DEFAULT_TEXT_HEIGHT,
  DEFAULT_TEXT_FONT_SIZE,
} from '@/lib/boardObjectDefaults';

export type { StickyColor } from '@/lib/boardObjectDefaults';
export {
  DEFAULT_STICKY_WIDTH,
  DEFAULT_STICKY_HEIGHT,
  DEFAULT_RECTANGLE_WIDTH,
  DEFAULT_RECTANGLE_HEIGHT,
  DEFAULT_FRAME_WIDTH,
  DEFAULT_FRAME_HEIGHT,
  DEFAULT_FRAME_PADDING,
  DEFAULT_FILL,
  DEFAULT_FONT_COLOR,
  DEFAULT_SHAPE_FILL,
  DEFAULT_SHAPE_STROKE_WIDTH,
  DEFAULT_CONNECTOR_STROKE,
  DEFAULT_TEXT_WIDTH,
  DEFAULT_TEXT_HEIGHT,
  DEFAULT_TEXT_FONT_SIZE,
  STICKY_COLORS,
} from '@/lib/boardObjectDefaults';

// ---------------------------------------------------------------------------
// Typed default objects per intent
// ---------------------------------------------------------------------------

export interface IStickyDefaults {
  width: number;
  height: number;
  fill: string;
  textFill: string;
  fontSize?: number;
  opacity?: number;
}

export interface IShapeDefaults {
  width: number;
  height: number;
  fill: string;
}

export interface IFrameDefaults {
  width: number;
  height: number;
  fill: string;
}

export interface ITextDefaults {
  fontSize: number;
  fill: string;
}

export interface IConnectorDefaults {
  stroke: string;
  strokeWidth: number;
  fromAnchor: ConnectorAnchor;
  toAnchor: ConnectorAnchor;
}

/** Default options used when building quadrant layout (stickies + frame). */
export interface IQuadrantDefaults {
  stickyWidth: number;
  stickyHeight: number;
  framePadding: number;
}

/** Default options used when building column layout. */
export interface IColumnLayoutDefaults {
  stickyWidth: number;
  stickyHeight: number;
  framePadding: number;
}

/** Default options used when building flowchart (nodes + connectors). */
export interface IFlowchartDefaults {
  rectWidth: number;
  rectHeight: number;
  circleSize: number;
}

/** Default options used when building mind map. */
export interface IMindMapDefaults {
  centerWidth: number;
  centerHeight: number;
  branchWidth: number;
  branchHeight: number;
  childWidth: number;
  childHeight: number;
  framePadding: number;
}

export const STICKY_TEMPLATE: IStickyDefaults = {
  width: DEFAULT_STICKY_WIDTH,
  height: DEFAULT_STICKY_HEIGHT,
  fill: DEFAULT_FILL,
  textFill: DEFAULT_FONT_COLOR,
};

export const SHAPE_RECTANGLE_TEMPLATE: IShapeDefaults = {
  width: DEFAULT_RECTANGLE_WIDTH,
  height: DEFAULT_RECTANGLE_HEIGHT,
  fill: DEFAULT_SHAPE_FILL,
};

export const SHAPE_CIRCLE_TEMPLATE: IShapeDefaults = {
  width: 100,
  height: 100,
  fill: DEFAULT_SHAPE_FILL,
};

export const SHAPE_LINE_TEMPLATE: IShapeDefaults = {
  width: 200,
  height: 0,
  fill: DEFAULT_SHAPE_FILL,
};

export const FRAME_TEMPLATE: IFrameDefaults = {
  width: DEFAULT_FRAME_WIDTH,
  height: DEFAULT_FRAME_HEIGHT,
  fill: 'rgba(255,255,255,0.15)',
};

export const TEXT_TEMPLATE: ITextDefaults = {
  fontSize: DEFAULT_TEXT_FONT_SIZE,
  fill: DEFAULT_FONT_COLOR,
};

export const CONNECTOR_TEMPLATE: IConnectorDefaults = {
  stroke: DEFAULT_CONNECTOR_STROKE,
  strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
  fromAnchor: 'right',
  toAnchor: 'left',
};

export const QUADRANT_TEMPLATE: IQuadrantDefaults = {
  stickyWidth: DEFAULT_STICKY_WIDTH,
  stickyHeight: DEFAULT_STICKY_HEIGHT,
  framePadding: DEFAULT_FRAME_PADDING,
};

export const COLUMN_LAYOUT_TEMPLATE: IColumnLayoutDefaults = {
  stickyWidth: DEFAULT_STICKY_WIDTH,
  stickyHeight: DEFAULT_STICKY_HEIGHT,
  framePadding: DEFAULT_FRAME_PADDING,
};

export const FLOWCHART_TEMPLATE: IFlowchartDefaults = {
  rectWidth: 160,
  rectHeight: 80,
  circleSize: 100,
};

export const MINDMAP_TEMPLATE: IMindMapDefaults = {
  centerWidth: 220,
  centerHeight: 100,
  branchWidth: DEFAULT_STICKY_WIDTH,
  branchHeight: DEFAULT_STICKY_HEIGHT,
  childWidth: 160,
  childHeight: 90,
  framePadding: DEFAULT_FRAME_PADDING,
};

// ---------------------------------------------------------------------------
// Default width/height by shape type (for compoundHelpers and batchCreate)
// ---------------------------------------------------------------------------

const DEFAULT_WIDTHS: Record<string, number> = {
  sticky: DEFAULT_STICKY_WIDTH,
  rectangle: SHAPE_RECTANGLE_TEMPLATE.width,
  circle: SHAPE_CIRCLE_TEMPLATE.width,
  line: 200,
  text: DEFAULT_TEXT_WIDTH,
  frame: DEFAULT_FRAME_WIDTH,
  connector: 0,
};

const DEFAULT_HEIGHTS: Record<string, number> = {
  sticky: DEFAULT_STICKY_HEIGHT,
  rectangle: SHAPE_RECTANGLE_TEMPLATE.height,
  circle: SHAPE_CIRCLE_TEMPLATE.height,
  line: 0,
  text: DEFAULT_TEXT_HEIGHT,
  frame: DEFAULT_FRAME_HEIGHT,
  connector: 0,
};

export function getDefaultWidthForType(type: string): number {
  return DEFAULT_WIDTHS[type.toLowerCase()] ?? DEFAULT_STICKY_WIDTH;
}

export function getDefaultHeightForType(type: string): number {
  return DEFAULT_HEIGHTS[type.toLowerCase()] ?? DEFAULT_STICKY_HEIGHT;
}

// ---------------------------------------------------------------------------
// Merge helper: start from template, overwrite only user-provided keys
// ---------------------------------------------------------------------------

function isKeyOfPartial<T extends object>(
  obj: Partial<T>,
  key: string
): key is Extract<keyof T, string> {
  return key in obj;
}

/**
 * Merges user-provided keys over a template. Only keys present in userProvided
 * (with value !== undefined) overwrite the template; omitted fields stay as template values.
 * Explicit falsy values (e.g. opacity: 0, false, '') overwrite the template.
 */
export function mergeWithTemplate<T extends object>(template: T, userProvided: Partial<T>): T {
  const result: T = { ...template };

  for (const key of Object.keys(userProvided)) {
    if (!isKeyOfPartial(userProvided, key)) {
      continue;
    }

    const value = userProvided[key];
    if (value) {
      result[key] = value;
    }
  }

  return result;
}

export function getShapeTemplate(type: 'rectangle' | 'circle' | 'line'): IShapeDefaults {
  if (type === 'rectangle') {
    return SHAPE_RECTANGLE_TEMPLATE;
  }

  if (type === 'circle') {
    return SHAPE_CIRCLE_TEMPLATE;
  }

  return SHAPE_LINE_TEMPLATE;
}
