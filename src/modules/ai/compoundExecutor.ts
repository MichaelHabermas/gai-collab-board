import type {
  IBoardObject,
  ICreateObjectParams,
  IUpdateObjectParams,
  ConnectorAnchor,
  ArrowheadMode,
  StrokeStyle,
} from '@/types';
import { getAnchorPosition } from '@/lib/connectorAnchors';
import {
  resolveStickyColor,
  computeBoundingBox,
  FRAME_PLACEHOLDER_ID,
  type ILayoutResult,
} from './layouts/layoutUtils';
import { computeQuadrantLayout } from './layouts/quadrantLayout';
import { computeColumnLayout } from './layouts/columnLayout';
import { computeFlowchartLayout } from './layouts/flowchartLayout';
import { computeMindMapLayout } from './layouts/mindmapLayout';
import { DEFAULT_SHAPE_STROKE_WIDTH } from './defaults';
import {
  BATCH_CAP,
  isArrowheadMode,
  isStrokeStyle,
  resolveShapeType,
  defaultWidthForType,
  defaultHeightForType,
  toUpdateParams,
  buildQuadrantConfig,
  buildColumnConfig,
  buildFlowchartConfig,
  buildMindMapConfig,
} from './compoundHelpers';
interface ICompoundToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ICompoundExecutorContext {
  boardId: string;
  createdBy: string;
  getObjects: () => IBoardObject[];
  createObject: (boardId: string, params: ICreateObjectParams) => Promise<IBoardObject>;
  createObjectsBatch: (boardId: string, objects: ICreateObjectParams[]) => Promise<IBoardObject[]>;
  updateObject: (boardId: string, objectId: string, updates: IUpdateObjectParams) => Promise<void>;
  updateObjectsBatch: (
    boardId: string,
    updates: Array<{ objectId: string; updates: IUpdateObjectParams }>
  ) => Promise<void>;
}
export const COMPOUND_TOOL_NAMES = new Set([
  'batchCreate',
  'batchUpdate',
  'groupIntoFrame',
  'connectSequence',
  'setArrowheads',
  'setStrokeStyle',
  'setRotation',
  'getObjectDetails',
  'createQuadrant',
  'createColumnLayout',
  'createFlowchart',
  'createMindMap',
]);
export const createCompoundExecutor = (ctx: ICompoundExecutorContext) => {
  async function executeLayout(layout: ILayoutResult): Promise<unknown> {
    const frameParams = layout.objects[0];
    if (!frameParams) {
      return { success: false, message: 'Layout produced no objects' };
    }

    const frame = await ctx.createObject(ctx.boardId, frameParams);
    const childParams = layout.objects.slice(1).map((p) => ({
      ...p,
      ...(p.parentFrameId === FRAME_PLACEHOLDER_ID && { parentFrameId: frame.id }),
    }));
    const children =
      childParams.length > 0 ? await ctx.createObjectsBatch(ctx.boardId, childParams) : [];
    const allIds = [frame.id, ...children.map((c) => c.id)];

    return {
      success: true,
      frameId: frame.id,
      objectIds: allIds,
      message: `Created layout with ${String(allIds.length)} objects`,
    };
  }

  async function handleBatchCreate(args: Record<string, unknown>): Promise<unknown> {
    const raw = args.objects;
    if (!Array.isArray(raw) || raw.length === 0) {
      return { success: false, message: 'objects must be a non-empty array' };
    }

    const params: ICreateObjectParams[] = raw
      .slice(0, BATCH_CAP)
      .map((obj: Record<string, unknown>) => ({
        type: resolveShapeType(String(obj.type ?? 'sticky')),
        x: Number(obj.x ?? 0),
        y: Number(obj.y ?? 0),
        width: Number(obj.width ?? defaultWidthForType(String(obj.type ?? 'sticky'))),
        height: Number(obj.height ?? defaultHeightForType(String(obj.type ?? 'sticky'))),
        fill: resolveStickyColor(obj.color != null ? String(obj.color) : undefined),
        ...(obj.text !== undefined && { text: String(obj.text) }),
        ...(obj.fontSize !== undefined && { fontSize: Number(obj.fontSize) }),
        ...(obj.opacity !== undefined && { opacity: Number(obj.opacity) }),
        createdBy: ctx.createdBy,
      }));
    const created = await ctx.createObjectsBatch(ctx.boardId, params);

    return {
      success: true,
      ids: created.map((o) => o.id),
      message: `Created ${String(created.length)} objects`,
    };
  }

  async function handleBatchUpdate(args: Record<string, unknown>): Promise<unknown> {
    const raw = args.updates;
    if (!Array.isArray(raw) || raw.length === 0) {
      return { success: false, message: 'updates must be a non-empty array' };
    }

    const mapped = raw
      .slice(0, BATCH_CAP)
      .filter((u: Record<string, unknown>) => typeof u.objectId === 'string' && u.changes)
      .map((u: Record<string, unknown>) => ({
        objectId: String(u.objectId),
        updates: toUpdateParams(u.changes),
      }));
    if (mapped.length === 0) {
      return { success: false, message: 'No valid updates provided' };
    }

    await ctx.updateObjectsBatch(ctx.boardId, mapped);

    return { success: true, message: `Updated ${String(mapped.length)} objects` };
  }

  async function handleGroupIntoFrame(args: Record<string, unknown>): Promise<unknown> {
    const { objectIds } = args;
    if (!Array.isArray(objectIds) || objectIds.length === 0) {
      return { success: false, message: 'objectIds must be a non-empty array' };
    }

    const ids = objectIds.map(String);
    const objects = ctx.getObjects().filter((o) => ids.includes(o.id));
    if (objects.length === 0) {
      return { success: false, message: 'No matching objects found' };
    }

    const title = String(args.title ?? 'Group');
    const padding = Number(args.padding ?? 30);
    const bbox = computeBoundingBox(objects);
    const frame = await ctx.createObject(ctx.boardId, {
      type: 'frame',
      x: bbox.x - padding,
      y: bbox.y - padding,
      width: bbox.width + padding * 2,
      height: bbox.height + padding * 2,
      fill: 'rgba(255,255,255,0.15)',
      text: title,
      createdBy: ctx.createdBy,
    });
    await ctx.updateObjectsBatch(
      ctx.boardId,
      objects.map((o) => ({ objectId: o.id, updates: { parentFrameId: frame.id } }))
    );

    return {
      success: true,
      frameId: frame.id,
      message: `Grouped ${String(objects.length)} objects into frame '${title}'`,
    };
  }

  function buildConnectorParam(
    fromObj: IBoardObject,
    toObj: IBoardObject,
    fromAnchor: ConnectorAnchor,
    toAnchor: ConnectorAnchor,
    arrowheads: ArrowheadMode,
    strokeStyle: StrokeStyle | undefined
  ): ICreateObjectParams {
    const fromPos = getAnchorPosition(fromObj, fromAnchor);
    const toPos = getAnchorPosition(toObj, toAnchor);

    return {
      type: 'connector',
      x: fromPos.x,
      y: fromPos.y,
      width: Math.abs(toPos.x - fromPos.x),
      height: Math.abs(toPos.y - fromPos.y),
      fill: '#64748b',
      stroke: '#64748b',
      strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
      points: [0, 0, toPos.x - fromPos.x, toPos.y - fromPos.y],
      fromObjectId: fromObj.id,
      toObjectId: toObj.id,
      fromAnchor,
      toAnchor,
      arrowheads,
      ...(strokeStyle && { strokeStyle }),
      createdBy: ctx.createdBy,
    };
  }

  async function handleConnectSequence(args: Record<string, unknown>): Promise<unknown> {
    const { objectIds } = args;
    if (!Array.isArray(objectIds) || objectIds.length < 2) {
      return { success: false, message: 'Need at least 2 objectIds' };
    }

    const ids = objectIds.map(String);
    const styleRaw = String(args.style ?? 'arrow');
    const dirRaw = String(args.direction ?? 'horizontal');
    const objects = ctx.getObjects();
    const fromAnchor: ConnectorAnchor = dirRaw === 'vertical' ? 'bottom' : 'right';
    const toAnchor: ConnectorAnchor = dirRaw === 'vertical' ? 'top' : 'left';
    const arrowheads: ArrowheadMode = styleRaw === 'line' ? 'none' : 'end';
    const strokeStyle: StrokeStyle | undefined = styleRaw === 'dashed' ? 'dashed' : undefined;

    const connParams: ICreateObjectParams[] = [];
    for (let i = 0; i < ids.length - 1; i++) {
      const fromObj = objects.find((o) => o.id === ids[i]);
      const toObj = objects.find((o) => o.id === ids[i + 1]);
      if (fromObj && toObj) {
        connParams.push(
          buildConnectorParam(fromObj, toObj, fromAnchor, toAnchor, arrowheads, strokeStyle)
        );
      }
    }

    if (connParams.length === 0) {
      return { success: false, message: 'No valid object pairs found' };
    }

    const created = await ctx.createObjectsBatch(ctx.boardId, connParams);

    return {
      success: true,
      connectorIds: created.map((c) => c.id),
      message: `Connected ${String(ids.length)} objects in sequence`,
    };
  }

  async function handleSetArrowheads(args: Record<string, unknown>): Promise<unknown> {
    if (typeof args.objectId !== 'string') {
      return { success: false, message: 'objectId is required' };
    }

    if (!isArrowheadMode(args.arrowheads)) {
      return { success: false, message: 'Invalid arrowhead mode' };
    }

    await ctx.updateObject(ctx.boardId, args.objectId, { arrowheads: args.arrowheads });

    return { success: true, message: `Set arrowheads to ${args.arrowheads}` };
  }

  async function handleSetStrokeStyle(args: Record<string, unknown>): Promise<unknown> {
    if (typeof args.objectId !== 'string') {
      return { success: false, message: 'objectId is required' };
    }

    if (!isStrokeStyle(args.strokeStyle)) {
      return { success: false, message: 'Invalid stroke style' };
    }

    await ctx.updateObject(ctx.boardId, args.objectId, { strokeStyle: args.strokeStyle });

    return { success: true, message: `Set stroke style to ${args.strokeStyle}` };
  }

  async function handleSetRotation(args: Record<string, unknown>): Promise<unknown> {
    if (typeof args.objectId !== 'string') {
      return { success: false, message: 'objectId is required' };
    }

    const degrees = ((Number(args.rotation) % 360) + 360) % 360;
    await ctx.updateObject(ctx.boardId, args.objectId, { rotation: degrees });

    return { success: true, message: `Set rotation to ${String(degrees)}deg` };
  }

  function handleGetObjectDetails(args: Record<string, unknown>): unknown {
    if (typeof args.objectId !== 'string') {
      return { success: false, message: 'objectId is required' };
    }

    const obj = ctx.getObjects().find((o) => o.id === args.objectId);
    if (!obj) {
      return { success: false, message: `Object not found: ${args.objectId}` };
    }

    return {
      success: true,
      object: {
        id: obj.id,
        type: obj.type,
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        rotation: obj.rotation,
        fill: obj.fill,
        stroke: obj.stroke,
        strokeWidth: obj.strokeWidth,
        text: obj.text,
        textFill: obj.textFill,
        fontSize: obj.fontSize,
        opacity: obj.opacity,
        arrowheads: obj.arrowheads,
        strokeStyle: obj.strokeStyle,
        parentFrameId: obj.parentFrameId,
        ...(obj.fromObjectId && { fromObjectId: obj.fromObjectId, toObjectId: obj.toObjectId }),
      },
    };
  }

  async function handleCreateQuadrant(args: Record<string, unknown>): Promise<unknown> {
    const config = buildQuadrantConfig(args);
    if (!config) return { success: false, message: 'Invalid quadrant config' };

    return await executeLayout(computeQuadrantLayout(config, ctx.getObjects(), ctx.createdBy));
  }

  async function handleCreateColumnLayout(args: Record<string, unknown>): Promise<unknown> {
    const config = buildColumnConfig(args);
    if (!config) return { success: false, message: 'Invalid column config' };

    return await executeLayout(computeColumnLayout(config, ctx.getObjects(), ctx.createdBy));
  }

  async function handleCreateFlowchart(args: Record<string, unknown>): Promise<unknown> {
    const config = buildFlowchartConfig(args);
    if (!config) return { success: false, message: 'Invalid flowchart config' };

    return await executeLayout(
      await computeFlowchartLayout(config, ctx.getObjects(), ctx.createdBy)
    );
  }

  async function handleCreateMindMap(args: Record<string, unknown>): Promise<unknown> {
    const config = buildMindMapConfig(args);
    if (!config) return { success: false, message: 'Invalid mind map config' };

    return await executeLayout(computeMindMapLayout(config, ctx.getObjects(), ctx.createdBy));
  }

  const execute = async (tool: ICompoundToolCall): Promise<unknown> => {
    if (!COMPOUND_TOOL_NAMES.has(tool.name)) {
      return null;
    }

    switch (tool.name) {
      case 'batchCreate':
        return await handleBatchCreate(tool.arguments);
      case 'batchUpdate':
        return await handleBatchUpdate(tool.arguments);
      case 'groupIntoFrame':
        return await handleGroupIntoFrame(tool.arguments);
      case 'connectSequence':
        return await handleConnectSequence(tool.arguments);
      case 'setArrowheads':
        return await handleSetArrowheads(tool.arguments);
      case 'setStrokeStyle':
        return await handleSetStrokeStyle(tool.arguments);
      case 'setRotation':
        return await handleSetRotation(tool.arguments);
      case 'getObjectDetails':
        return handleGetObjectDetails(tool.arguments);
      case 'createQuadrant':
        return await handleCreateQuadrant(tool.arguments);
      case 'createColumnLayout':
        return await handleCreateColumnLayout(tool.arguments);
      case 'createFlowchart':
        return await handleCreateFlowchart(tool.arguments);
      case 'createMindMap':
        return await handleCreateMindMap(tool.arguments);
      default:
        return null;
    }
  };

  return { execute };
};
