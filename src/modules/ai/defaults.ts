import type { ConnectorAnchor } from '@/types';

// ---------------------------------------------------------------------------
// Shared constants (single source of truth for executors and layouts)
// ---------------------------------------------------------------------------

export const DEFAULT_STICKY_WIDTH = 200;
export const DEFAULT_STICKY_HEIGHT = 120;
export const DEFAULT_FRAME_WIDTH = 300;
export const DEFAULT_FRAME_HEIGHT = 200;
export const DEFAULT_FRAME_PADDING = 30;
export const DEFAULT_FILL = '#fef08a';
export const DEFAULT_FONT_COLOR = '#1e293b';
export const DEFAULT_SHAPE_FILL = '#93c5fd';
export const DEFAULT_CONNECTOR_STROKE = '#64748b';

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
  width: 150,
  height: 100,
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
  fontSize: 16,
  fill: DEFAULT_FONT_COLOR,
};

export const CONNECTOR_TEMPLATE: IConnectorDefaults = {
  stroke: DEFAULT_CONNECTOR_STROKE,
  strokeWidth: 2,
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
  text: 200,
  frame: DEFAULT_FRAME_WIDTH,
  connector: 0,
};

const DEFAULT_HEIGHTS: Record<string, number> = {
  sticky: DEFAULT_STICKY_HEIGHT,
  rectangle: SHAPE_RECTANGLE_TEMPLATE.height,
  circle: SHAPE_CIRCLE_TEMPLATE.height,
  line: 0,
  text: 30,
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
    if (value !== undefined) {
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
