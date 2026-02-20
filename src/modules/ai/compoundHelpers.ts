import type {
  IUpdateObjectParams,
  ShapeType,
  ArrowheadMode,
  StrokeStyle,
  ConnectorAnchor,
} from '@/types';
import type { IQuadrantConfig } from './layouts/quadrantLayout';
import type { IColumnConfig } from './layouts/columnLayout';
import type { IFlowchartConfig } from './layouts/flowchartLayout';
import type { IMindMapConfig } from './layouts/mindmapLayout';

// ---------------------------------------------------------------------------
// Type guards (no `as` casts — use Set<string>.has)
// ---------------------------------------------------------------------------

const SHAPE_TYPE_SET = new Set<string>([
  'sticky',
  'rectangle',
  'circle',
  'line',
  'text',
  'frame',
  'connector',
]);

function isShapeType(value: string): value is ShapeType {
  return SHAPE_TYPE_SET.has(value);
}

const ARROWHEAD_SET = new Set<string>(['none', 'start', 'end', 'both']);

function isArrowheadMode(value: unknown): value is ArrowheadMode {
  return typeof value === 'string' && ARROWHEAD_SET.has(value);
}

const STROKE_STYLE_SET = new Set<string>(['solid', 'dashed', 'dotted']);

function isStrokeStyle(value: unknown): value is StrokeStyle {
  return typeof value === 'string' && STROKE_STYLE_SET.has(value);
}

const CONNECTOR_ANCHOR_SET = new Set<string>(['top', 'right', 'bottom', 'left']);

function isConnectorAnchor(value: unknown): value is ConnectorAnchor {
  return typeof value === 'string' && CONNECTOR_ANCHOR_SET.has(value);
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const BATCH_CAP = 50;

const DEFAULT_WIDTHS: Record<string, number> = {
  sticky: 200,
  rectangle: 150,
  circle: 100,
  line: 200,
  text: 200,
  frame: 300,
  connector: 0,
};

const DEFAULT_HEIGHTS: Record<string, number> = {
  sticky: 120,
  rectangle: 100,
  circle: 100,
  line: 0,
  text: 30,
  frame: 200,
  connector: 0,
};

function resolveShapeType(input: string): ShapeType {
  const lower = input.toLowerCase().trim();

  if (isShapeType(lower)) {
    return lower;
  }

  return 'sticky';
}

function defaultWidthForType(type: string): number {
  return DEFAULT_WIDTHS[type.toLowerCase()] ?? 200;
}

function defaultHeightForType(type: string): number {
  return DEFAULT_HEIGHTS[type.toLowerCase()] ?? 120;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/** Safely extracts known update fields from an untyped changes object. */
function toUpdateParams(raw: unknown): IUpdateObjectParams {
  if (!isRecord(raw)) {
    return {};
  }

  const out: IUpdateObjectParams = {};
  if (typeof raw.x === 'number') out.x = raw.x;

  if (typeof raw.y === 'number') out.y = raw.y;

  if (typeof raw.width === 'number') out.width = raw.width;

  if (typeof raw.height === 'number') out.height = raw.height;

  if (typeof raw.fill === 'string') out.fill = raw.fill;

  if (typeof raw.text === 'string') out.text = raw.text;

  if (typeof raw.fontSize === 'number') out.fontSize = raw.fontSize;

  if (typeof raw.opacity === 'number') out.opacity = raw.opacity;

  if (typeof raw.stroke === 'string') out.stroke = raw.stroke;

  if (typeof raw.strokeWidth === 'number') out.strokeWidth = raw.strokeWidth;

  if (typeof raw.rotation === 'number') out.rotation = raw.rotation;

  return out;
}

// ---------------------------------------------------------------------------
// Layout config builders
// ---------------------------------------------------------------------------

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) {
    return [];
  }

  return val.map(String);
}

function buildQuadrantInput(
  raw: unknown
): { label: string; color?: string; items: string[] } | null {
  if (!isRecord(raw) || typeof raw.label !== 'string' || !Array.isArray(raw.items)) {
    return null;
  }

  return {
    label: raw.label,
    ...(typeof raw.color === 'string' && { color: raw.color }),
    items: toStringArray(raw.items),
  };
}

function buildQuadrantConfig(args: Record<string, unknown>): IQuadrantConfig | null {
  if (typeof args.title !== 'string' || !isRecord(args.quadrants)) {
    return null;
  }

  const q = args.quadrants;
  const tl = buildQuadrantInput(q.topLeft);
  const tr = buildQuadrantInput(q.topRight);
  const bl = buildQuadrantInput(q.bottomLeft);
  const br = buildQuadrantInput(q.bottomRight);
  if (!tl || !tr || !bl || !br) {
    return null;
  }

  return {
    title: args.title,
    ...(typeof args.xAxisLabel === 'string' && { xAxisLabel: args.xAxisLabel }),
    ...(typeof args.yAxisLabel === 'string' && { yAxisLabel: args.yAxisLabel }),
    quadrants: { topLeft: tl, topRight: tr, bottomLeft: bl, bottomRight: br },
    ...(typeof args.x === 'number' && { x: args.x }),
    ...(typeof args.y === 'number' && { y: args.y }),
  };
}

function buildColumnConfig(args: Record<string, unknown>): IColumnConfig | null {
  if (typeof args.title !== 'string' || !Array.isArray(args.columns)) {
    return null;
  }

  const columns = args.columns
    .filter(isRecord)
    .filter((c) => typeof c.heading === 'string' && Array.isArray(c.items))
    .map((c) => ({
      heading: String(c.heading),
      ...(typeof c.color === 'string' && { color: c.color }),
      items: toStringArray(c.items),
    }));

  if (columns.length === 0) {
    return null;
  }

  return {
    title: args.title,
    columns,
    ...(typeof args.x === 'number' && { x: args.x }),
    ...(typeof args.y === 'number' && { y: args.y }),
  };
}

function buildFlowchartConfig(args: Record<string, unknown>): IFlowchartConfig | null {
  if (!Array.isArray(args.nodes) || !Array.isArray(args.edges)) {
    return null;
  }

  const direction = args.direction === 'left-to-right' ? 'left-to-right' : 'top-to-bottom';
  const nodes = args.nodes.filter(isRecord).map((n) => {
    const shape: 'rectangle' | 'circle' | undefined =
      n.shape === 'circle' ? 'circle' : n.shape === 'rectangle' ? 'rectangle' : undefined;

    return {
      id: String(n.id),
      label: String(n.label),
      ...(shape && { shape }),
      ...(typeof n.color === 'string' && { color: n.color }),
    };
  });

  const edges = args.edges.filter(isRecord).map((e) => ({
    from: String(e.from),
    to: String(e.to),
    ...(typeof e.label === 'string' && { label: e.label }),
  }));

  return {
    direction,
    nodes,
    edges,
    ...(typeof args.title === 'string' && { title: args.title }),
    ...(typeof args.x === 'number' && { x: args.x }),
    ...(typeof args.y === 'number' && { y: args.y }),
  };
}

function buildMindMapConfig(args: Record<string, unknown>): IMindMapConfig | null {
  if (typeof args.centralTopic !== 'string' || !Array.isArray(args.branches)) {
    return null;
  }

  const branches = args.branches
    .filter(isRecord)
    .filter((b) => typeof b.label === 'string' && Array.isArray(b.children))
    .map((b) => ({
      label: String(b.label),
      ...(typeof b.color === 'string' && { color: b.color }),
      children: toStringArray(b.children),
    }));

  return {
    centralTopic: args.centralTopic,
    branches,
    ...(typeof args.x === 'number' && { x: args.x }),
    ...(typeof args.y === 'number' && { y: args.y }),
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  BATCH_CAP,
  isArrowheadMode,
  isStrokeStyle,
  isConnectorAnchor,
  resolveShapeType,
  defaultWidthForType,
  defaultHeightForType,
  toUpdateParams,
  buildQuadrantConfig,
  buildColumnConfig,
  buildFlowchartConfig,
  buildMindMapConfig,
};
