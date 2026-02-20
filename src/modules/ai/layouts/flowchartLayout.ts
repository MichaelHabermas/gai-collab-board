import type { ConnectorAnchor, ICreateObjectParams } from '@/types';
import {
  resolveStickyColor,
  findOpenSpace,
  DEFAULT_FRAME_PADDING,
  FRAME_PLACEHOLDER_ID,
  type BoundedObject,
  type ILayoutResult,
} from './layoutUtils';

interface IFlowchartNode {
  id: string;
  label: string;
  shape?: 'rectangle' | 'circle';
  color?: string;
}

interface IFlowchartEdge {
  from: string;
  to: string;
  label?: string;
}

interface IFlowchartConfig {
  title?: string;
  direction: 'top-to-bottom' | 'left-to-right';
  nodes: IFlowchartNode[];
  edges: IFlowchartEdge[];
  x?: number;
  y?: number;
}

const RECT_WIDTH = 160;
const RECT_HEIGHT = 80;
const CIRCLE_SIZE = 100;
const NODE_SEP = 50;
const RANK_SEP = 80;

/**
 * Minimal type surface for dagre graph operations.
 * Avoids importing dagre types (package may not be installed).
 */
interface IDagreGraph {
  setGraph(opts: Record<string, unknown>): void;
  setDefaultEdgeLabel(fn: () => Record<string, never>): void;
  setNode(id: string, meta: { width: number; height: number }): void;
  setEdge(from: string, to: string): void;
  node(id: string): { x: number; y: number; width: number; height: number } | undefined;
  nodes(): string[];
}

interface IDagreModule {
  graphlib: { Graph: new () => IDagreGraph };
  layout(graph: IDagreGraph): void;
}

function directionAnchors(
  direction: 'top-to-bottom' | 'left-to-right',
): { from: ConnectorAnchor; to: ConnectorAnchor } {
  if (direction === 'left-to-right') {
    return { from: 'right', to: 'left' };
  }

  return { from: 'bottom', to: 'top' };
}

function nodeDimensions(shape: 'rectangle' | 'circle' | undefined): {
  width: number;
  height: number;
} {
  if (shape === 'circle') {
    return { width: CIRCLE_SIZE, height: CIRCLE_SIZE };
  }

  return { width: RECT_WIDTH, height: RECT_HEIGHT };
}

function isDagreModule(mod: unknown): mod is IDagreModule {
  if (mod == null || typeof mod !== 'object') {
    return false;
  }

  if (!('graphlib' in mod) || !('layout' in mod)) {
    return false;
  }

  // 'in' narrows mod to have layout property; check it's callable
  return typeof mod.layout === 'function';
}

async function loadDagre(): Promise<IDagreModule> {
  let mod: unknown;
  try {
    // @ts-expect-error -- @dagrejs/dagre is an optional peer dep; resolved at runtime
    mod = await import('@dagrejs/dagre');
  } catch {
    throw new Error(
      'dagre package not installed. Run: bun add @dagrejs/dagre',
    );
  }

  if (!isDagreModule(mod)) {
    throw new Error('Unexpected dagre module shape');
  }

  return mod;
}

function buildNodeParams(
  node: IFlowchartNode,
  dagrePos: { x: number; y: number },
  dims: { width: number; height: number },
  createdBy: string,
  hasFrame: boolean,
): ICreateObjectParams {
  const color = resolveStickyColor(node.color);
  const base: ICreateObjectParams = {
    type: node.shape === 'circle' ? 'circle' : 'rectangle',
    x: dagrePos.x - dims.width / 2,
    y: dagrePos.y - dims.height / 2,
    width: dims.width,
    height: dims.height,
    fill: color,
    text: node.label,
    textFill: '#1e293b',
    fontSize: 14,
    createdBy,
  };

  if (hasFrame) {
    base.parentFrameId = FRAME_PLACEHOLDER_ID;
  }

  return base;
}

function buildEdgeConnector(
  edge: IFlowchartEdge,
  anchors: { from: ConnectorAnchor; to: ConnectorAnchor },
  createdBy: string,
  hasFrame: boolean,
): ICreateObjectParams {
  const conn: ICreateObjectParams = {
    type: 'connector',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fill: 'transparent',
    stroke: '#64748b',
    strokeWidth: 2,
    fromObjectId: `__node_${edge.from}__`,
    toObjectId: `__node_${edge.to}__`,
    fromAnchor: anchors.from,
    toAnchor: anchors.to,
    arrowheads: 'end',
    createdBy,
  };

  if (hasFrame) {
    conn.parentFrameId = FRAME_PLACEHOLDER_ID;
  }

  return conn;
}

async function computeFlowchartLayout(
  config: IFlowchartConfig,
  existingObjects: BoundedObject[],
  createdBy: string,
): Promise<ILayoutResult> {
  const dagre = await loadDagre();
  const graph = new dagre.graphlib.Graph();

  const rankdir = config.direction === 'left-to-right' ? 'LR' : 'TB';
  graph.setGraph({ rankdir, nodesep: NODE_SEP, ranksep: RANK_SEP });
  graph.setDefaultEdgeLabel(() => ({}));

  // Register nodes
  const nodeDimsMap = new Map<string, { width: number; height: number }>();
  for (const node of config.nodes) {
    const dims = nodeDimensions(node.shape);
    nodeDimsMap.set(node.id, dims);
    graph.setNode(node.id, { width: dims.width, height: dims.height });
  }

  // Register edges
  for (const edge of config.edges) {
    graph.setEdge(edge.from, edge.to);
  }

  dagre.layout(graph);

  // Extract positioned nodes
  const hasFrame = config.title != null;
  const anchors = directionAnchors(config.direction);
  const nodeParams: ICreateObjectParams[] = [];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of config.nodes) {
    const pos = graph.node(node.id);
    const dims = nodeDimsMap.get(node.id);
    if (!pos || !dims) continue;

    const params = buildNodeParams(node, pos, dims, createdBy, hasFrame);
    nodeParams.push(params);

    minX = Math.min(minX, params.x);
    minY = Math.min(minY, params.y);
    maxX = Math.max(maxX, params.x + dims.width);
    maxY = Math.max(maxY, params.y + dims.height);
  }

  // Build connectors
  const connectors: ICreateObjectParams[] = config.edges.map((edge) =>
    buildEdgeConnector(edge, anchors, createdBy, hasFrame),
  );

  // Compute shift to place at target position
  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const padding = hasFrame ? DEFAULT_FRAME_PADDING : 0;
  const totalW = contentW + padding * 2;
  const totalH = contentH + padding * 2;

  const origin =
    config.x != null && config.y != null
      ? { x: config.x, y: config.y }
      : findOpenSpace(existingObjects, totalW, totalH);

  const shiftX = origin.x + padding - minX;
  const shiftY = origin.y + padding - minY;

  for (const params of nodeParams) {
    params.x += shiftX;
    params.y += shiftY;
  }

  // Assemble result: frame first (if any), then nodes, then connectors
  const objects: ICreateObjectParams[] = [];

  if (hasFrame) {
    objects.push({
      type: 'frame',
      x: origin.x,
      y: origin.y,
      width: totalW,
      height: totalH,
      fill: 'rgba(255,255,255,0.15)',
      text: config.title,
      createdBy,
    });
  }

  objects.push(...nodeParams, ...connectors);

  return { objects, frameId: FRAME_PLACEHOLDER_ID };
}

export { computeFlowchartLayout };
export type { IFlowchartConfig, IFlowchartNode, IFlowchartEdge };
