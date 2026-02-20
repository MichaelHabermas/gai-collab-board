import type { ConnectorAnchor, ICreateObjectParams } from '@/types';
import {
  resolveStickyColor,
  findOpenSpace,
  computeBoundingBox,
  DEFAULT_STICKY_WIDTH,
  DEFAULT_STICKY_HEIGHT,
  DEFAULT_FRAME_PADDING,
  FRAME_PLACEHOLDER_ID,
  type BoundedObject,
  type ILayoutResult,
} from './layoutUtils';

interface IMindMapConfig {
  centralTopic: string;
  branches: Array<{
    label: string;
    color?: string;
    children: string[];
  }>;
  x?: number;
  y?: number;
}

const BRANCH_RADIUS = 280;
const CHILD_RADIUS = 180;
const CHILD_ARC_SPREAD = Math.PI / 3; // 60 degrees
const CENTER_WIDTH = 220;
const CENTER_HEIGHT = 100;
const BRANCH_WIDTH = DEFAULT_STICKY_WIDTH;
const BRANCH_HEIGHT = DEFAULT_STICKY_HEIGHT;
const CHILD_WIDTH = 160;
const CHILD_HEIGHT = 90;

/** Maps an angle (radians) to the closest cardinal anchor. */
function anchorFromAngle(angle: number): ConnectorAnchor {
  const normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  if (normalized < Math.PI / 4 || normalized >= (7 * Math.PI) / 4) {
    return 'right';
  }

  if (normalized < (3 * Math.PI) / 4) {
    return 'bottom';
  }

  if (normalized < (5 * Math.PI) / 4) {
    return 'left';
  }

  return 'top';
}

/** Returns the opposite anchor (source faces target, target faces source). */
function oppositeAnchor(anchor: ConnectorAnchor): ConnectorAnchor {
  const map: Record<ConnectorAnchor, ConnectorAnchor> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  };

  return map[anchor];
}

function buildConnector(
  fromId: string,
  toId: string,
  fromAnchor: ConnectorAnchor,
  toAnchor: ConnectorAnchor,
  createdBy: string
): ICreateObjectParams {
  return {
    type: 'connector',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fill: 'transparent',
    stroke: '#94a3b8',
    strokeWidth: 2,
    fromObjectId: fromId,
    toObjectId: toId,
    fromAnchor,
    toAnchor,
    arrowheads: 'none',
    parentFrameId: FRAME_PLACEHOLDER_ID,
    createdBy,
  };
}

function computeMindMapLayout(
  config: IMindMapConfig,
  existingObjects: BoundedObject[],
  createdBy: string
): ILayoutResult {
  const branchCount = config.branches.length;

  // Collect all node positions to compute bounding box for the frame
  const allNodes: Array<{ x: number; y: number; width: number; height: number }> = [];
  const objects: ICreateObjectParams[] = [];
  // Track placeholder IDs for connectors: index 1 = center, then branches and children
  const nodeIds: string[] = [];

  // -- Center node (ID assigned after frame at index 0, so index 1) --
  // Place at temporary origin; shift after bounding box calc
  const cx = 0;
  const cy = 0;
  const centerId = '__center__';
  nodeIds.push(centerId);

  const centerNode: ICreateObjectParams = {
    type: 'sticky',
    x: cx - CENTER_WIDTH / 2,
    y: cy - CENTER_HEIGHT / 2,
    width: CENTER_WIDTH,
    height: CENTER_HEIGHT,
    fill: '#fef08a',
    text: config.centralTopic,
    fontSize: 16,
    parentFrameId: FRAME_PLACEHOLDER_ID,
    createdBy,
  };
  allNodes.push({ x: centerNode.x, y: centerNode.y, width: CENTER_WIDTH, height: CENTER_HEIGHT });

  // -- Branches --
  const branchEntries: Array<{
    angle: number;
    id: string;
    params: ICreateObjectParams;
  }> = [];

  for (let i = 0; i < branchCount; i++) {
    const branch = config.branches[i];
    if (!branch) continue;

    const angle = branchCount === 1 ? 0 : i * ((2 * Math.PI) / branchCount);
    const bx = cx + BRANCH_RADIUS * Math.cos(angle) - BRANCH_WIDTH / 2;
    const by = cy + BRANCH_RADIUS * Math.sin(angle) - BRANCH_HEIGHT / 2;
    const color = resolveStickyColor(branch.color);
    const branchId = `__branch_${String(i)}__`;
    nodeIds.push(branchId);

    const params: ICreateObjectParams = {
      type: 'sticky',
      x: bx,
      y: by,
      width: BRANCH_WIDTH,
      height: BRANCH_HEIGHT,
      fill: color,
      text: branch.label,
      parentFrameId: FRAME_PLACEHOLDER_ID,
      createdBy,
    };

    branchEntries.push({ angle, id: branchId, params });
    allNodes.push({ x: bx, y: by, width: BRANCH_WIDTH, height: BRANCH_HEIGHT });

    // -- Children of this branch --
    const childCount = branch.children.length;
    for (let j = 0; j < childCount; j++) {
      const childText = branch.children[j];
      if (childText == null) continue;

      const childAngle = computeChildAngle(angle, j, childCount);
      const cxChild = cx + (BRANCH_RADIUS + CHILD_RADIUS) * Math.cos(childAngle) - CHILD_WIDTH / 2;
      const cyChild = cy + (BRANCH_RADIUS + CHILD_RADIUS) * Math.sin(childAngle) - CHILD_HEIGHT / 2;
      const childId = `__branch_${String(i)}_child_${String(j)}__`;
      nodeIds.push(childId);

      const childParams: ICreateObjectParams = {
        type: 'sticky',
        x: cxChild,
        y: cyChild,
        width: CHILD_WIDTH,
        height: CHILD_HEIGHT,
        fill: color,
        text: childText,
        opacity: 0.85,
        parentFrameId: FRAME_PLACEHOLDER_ID,
        createdBy,
      };

      branchEntries.push({ angle: childAngle, id: childId, params: childParams });
      allNodes.push({ x: cxChild, y: cyChild, width: CHILD_WIDTH, height: CHILD_HEIGHT });
    }
  }

  // -- Compute bounding box and determine final position --
  const bbox = computeBoundingBox(allNodes);
  const totalW = bbox.width + DEFAULT_FRAME_PADDING * 2;
  const totalH = bbox.height + DEFAULT_FRAME_PADDING * 2;

  const origin =
    config.x != null && config.y != null
      ? { x: config.x, y: config.y }
      : findOpenSpace(existingObjects, totalW, totalH);

  // Shift: move everything so bbox.topLeft aligns with origin + padding
  const shiftX = origin.x + DEFAULT_FRAME_PADDING - bbox.x;
  const shiftY = origin.y + DEFAULT_FRAME_PADDING - bbox.y;

  // Frame
  const frame: ICreateObjectParams = {
    type: 'frame',
    x: origin.x,
    y: origin.y,
    width: totalW,
    height: totalH,
    fill: 'rgba(255,255,255,0.15)',
    text: config.centralTopic,
    createdBy,
  };
  objects.push(frame);

  // Shift center node
  centerNode.x += shiftX;
  centerNode.y += shiftY;
  objects.push(centerNode);

  // Shift and add branch/child nodes
  for (const entry of branchEntries) {
    entry.params.x += shiftX;
    entry.params.y += shiftY;
    objects.push(entry.params);
  }

  // -- Connectors: center -> branches, branches -> children --
  for (let i = 0; i < branchCount; i++) {
    const branch = config.branches[i];
    if (!branch) continue;

    const angle = branchCount === 1 ? 0 : i * ((2 * Math.PI) / branchCount);
    const fromAnchor = anchorFromAngle(angle);
    const toAnchor = oppositeAnchor(fromAnchor);
    const branchId = `__branch_${String(i)}__`;

    objects.push(buildConnector(centerId, branchId, fromAnchor, toAnchor, createdBy));

    for (let j = 0; j < branch.children.length; j++) {
      const childAngle = computeChildAngle(angle, j, branch.children.length);
      const cFromAnchor = anchorFromAngle(childAngle);
      const cToAnchor = oppositeAnchor(cFromAnchor);
      const childId = `__branch_${String(i)}_child_${String(j)}__`;

      objects.push(buildConnector(branchId, childId, cFromAnchor, cToAnchor, createdBy));
    }
  }

  return { objects, frameId: FRAME_PLACEHOLDER_ID };
}

function computeChildAngle(branchAngle: number, childIndex: number, childCount: number): number {
  if (childCount <= 1) {
    return branchAngle;
  }

  const startAngle = branchAngle - CHILD_ARC_SPREAD / 2;
  const step = CHILD_ARC_SPREAD / (childCount - 1);

  return startAngle + childIndex * step;
}

export { computeMindMapLayout };
export type { IMindMapConfig };
