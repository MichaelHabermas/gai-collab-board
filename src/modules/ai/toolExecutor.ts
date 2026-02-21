import type { IToolCall } from './tools';
import type { IBoardObject, ShapeType, ConnectorAnchor } from '@/types';
import type { ICreateObjectParams, IUpdateObjectParams } from '@/modules/sync/objectService';
import { getBoard } from '@/modules/sync/boardService';
import {
  getUserPreferences,
  toggleFavoriteBoardId as toggleFavoriteBoardIdService,
} from '@/modules/sync/userPreferencesService';
import { getAnchorPosition } from '@/lib/connectorAnchors';
import { computeAlignUpdates, computeDistributeUpdates } from '@/lib/alignDistribute';
import { STICKY_COLORS } from '@/components/canvas/shapes';
import { createCompoundExecutor, COMPOUND_TOOL_NAMES } from './compoundExecutor';
import { createBoardStateManager, type IBoardStateProvider } from '@/lib/boardStateManager';
import {
  mergeWithTemplate,
  STICKY_TEMPLATE,
  FRAME_TEMPLATE,
  TEXT_TEMPLATE,
  CONNECTOR_TEMPLATE,
  getShapeTemplate,
  DEFAULT_FILL,
  DEFAULT_FONT_COLOR,
} from './defaults';

/** Resolves a color name or hex string to a sticky-note fill hex. */
function resolveStickyColor(input: string): string {
  const key = input.toLowerCase().trim() as keyof typeof STICKY_COLORS;
  if (key in STICKY_COLORS) {
    return STICKY_COLORS[key];
  }

  if (/^#[0-9A-Fa-f]{6}$/.test(input.trim())) {
    return input.trim();
  }

  return DEFAULT_FILL;
}

/** Resolves a color name or hex string to a valid text color. */
function resolveTextColor(input: string): string {
  const key = input.toLowerCase().trim() as keyof typeof STICKY_COLORS;
  if (key in STICKY_COLORS) {
    return STICKY_COLORS[key];
  }

  if (/^#[0-9A-Fa-f]{6}$/.test(input.trim())) {
    return input.trim();
  }

  return DEFAULT_FONT_COLOR;
}

/** Optional viewport actions; when absent, zoom tools return success with a stub message */
export interface IViewportActions {
  onZoomToFitAll?: () => void | Promise<void>;
  onZoomToSelection?: (objectIds: string[]) => void | Promise<void>;
  onSetZoomLevel?: (percent: number) => void | Promise<void>;
}

export interface IToolExecutorContext {
  boardId: string;
  createdBy: string;
  userId: string;
  getObjects: () => IBoardObject[];
  createObject: (boardId: string, params: ICreateObjectParams) => Promise<IBoardObject>;
  createObjectsBatch: (boardId: string, objects: ICreateObjectParams[]) => Promise<IBoardObject[]>;
  updateObject: (boardId: string, objectId: string, updates: IUpdateObjectParams) => Promise<void>;
  updateObjectsBatch: (
    boardId: string,
    updates: Array<{ objectId: string; updates: IUpdateObjectParams }>
  ) => Promise<void>;
  deleteObject: (boardId: string, objectId: string) => Promise<void>;
  deleteObjectsBatch: (boardId: string, objectIds: string[]) => Promise<void>;
  onZoomToFitAll?: () => void | Promise<void>;
  onZoomToSelection?: (objectIds: string[]) => void | Promise<void>;
  onSetZoomLevel?: (percent: number) => void | Promise<void>;
  onExportViewport?: (format?: 'png' | 'jpeg') => void;
  onExportFullBoard?: (format?: 'png' | 'jpeg') => void;
}

export const createToolExecutor = (ctx: IToolExecutorContext) => {
  const { boardId, createdBy, userId, getObjects } = ctx;

  const stateProvider: IBoardStateProvider = {
    getObjects() {
      const arr = getObjects();
      const record: Record<string, IBoardObject> = {};
      for (const obj of arr) {
        record[obj.id] = obj;
      }

      return record;
    },
    getViewport: () => ({ position: { x: 0, y: 0 }, scale: { x: 1, y: 1 } }),
  };
  const stateManager = createBoardStateManager(stateProvider);

  const compoundExecutor = createCompoundExecutor({
    boardId,
    createdBy,
    getObjects,
    createObject: ctx.createObject,
    createObjectsBatch: ctx.createObjectsBatch,
    updateObject: ctx.updateObject,
    updateObjectsBatch: ctx.updateObjectsBatch,
  });

  const execute = async (tool: IToolCall): Promise<unknown> => {
    if (COMPOUND_TOOL_NAMES.has(tool.name)) {
      return await compoundExecutor.execute(tool);
    }

    switch (tool.name) {
      case 'createStickyNote': {
        const {
          text,
          x,
          y,
          color,
          fontSize: rawFontSize,
          fontColor,
          opacity: rawOpacity,
        } = tool.arguments as {
          text: string;
          x: number;
          y: number;
          color?: string;
          fontSize?: number;
          fontColor?: string;
          opacity?: number;
        };
        const MIN_FONT_SIZE = 8;
        const MAX_FONT_SIZE = 72;
        const clampedFontSize = rawFontSize
          ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, rawFontSize))
          : undefined;
        const clampedOpacity = rawOpacity ? Math.min(1, Math.max(0, rawOpacity)) : undefined;
        const userProvided = {
          ...(color !== undefined && { fill: resolveStickyColor(color) }),
          ...(fontColor !== undefined && { textFill: resolveTextColor(fontColor) }),
          ...(clampedFontSize !== undefined && { fontSize: clampedFontSize }),
          ...(clampedOpacity !== undefined && { opacity: clampedOpacity }),
        };
        const merged = mergeWithTemplate(STICKY_TEMPLATE, userProvided);
        const obj = await ctx.createObject(boardId, {
          type: 'sticky',
          x,
          y,
          width: merged.width,
          height: merged.height,
          fill: merged.fill,
          text,
          createdBy,
          ...(userProvided.textFill !== undefined && { textFill: merged.textFill }),
          ...(userProvided.fontSize !== undefined && { fontSize: merged.fontSize }),
          ...(userProvided.opacity !== undefined && { opacity: merged.opacity }),
        });
        return { id: obj.id, success: true, message: `Created sticky note: '${text}'` };
      }

      case 'createShape': {
        const { type, x, y, width, height, color } = tool.arguments as {
          type: 'rectangle' | 'circle' | 'line';
          x: number;
          y: number;
          width?: number;
          height?: number;
          color?: string;
        };
        const shapeType: ShapeType = type;
        const template = getShapeTemplate(type);
        const userProvided = {
          ...(width !== undefined && { width }),
          ...(height !== undefined && { height }),
          ...(color !== undefined && { fill: color }),
        };
        const merged = mergeWithTemplate(template, userProvided);
        const points = type === 'line' ? [0, 0, merged.width, merged.height] : undefined;
        const obj = await ctx.createObject(boardId, {
          type: shapeType,
          x,
          y,
          width: merged.width,
          height: merged.height,
          fill: merged.fill,
          points,
          createdBy,
        });
        return { id: obj.id, success: true, message: `Created ${type}` };
      }

      case 'createFrame': {
        const { title, x, y, width, height } = tool.arguments as {
          title: string;
          x: number;
          y: number;
          width?: number;
          height?: number;
        };
        const userProvided = {
          ...(width !== undefined && { width }),
          ...(height !== undefined && { height }),
        };
        const merged = mergeWithTemplate(FRAME_TEMPLATE, userProvided);
        const obj = await ctx.createObject(boardId, {
          type: 'frame',
          x,
          y,
          width: merged.width,
          height: merged.height,
          fill: merged.fill,
          text: title,
          createdBy,
        });
        return { id: obj.id, success: true, message: `Created frame: '${title}'` };
      }

      case 'createConnector': {
        const {
          fromId,
          toId,
          style: _style = 'line',
          fromAnchor: rawFromAnchor,
          toAnchor: rawToAnchor,
        } = tool.arguments as {
          fromId: string;
          toId: string;
          style?: string;
          fromAnchor?: string;
          toAnchor?: string;
        };
        const objects = getObjects();
        const fromObj = objects.find((o) => o.id === fromId);
        const toObj = objects.find((o) => o.id === toId);
        if (!fromObj || !toObj) {
          throw new Error('Source or target object not found for connector');
        }

        const VALID_ANCHORS: ConnectorAnchor[] = ['top', 'right', 'bottom', 'left'];
        const fromAnchor: ConnectorAnchor =
          rawFromAnchor && VALID_ANCHORS.includes(rawFromAnchor as ConnectorAnchor)
            ? (rawFromAnchor as ConnectorAnchor)
            : CONNECTOR_TEMPLATE.fromAnchor;
        const toAnchor: ConnectorAnchor =
          rawToAnchor && VALID_ANCHORS.includes(rawToAnchor as ConnectorAnchor)
            ? (rawToAnchor as ConnectorAnchor)
            : CONNECTOR_TEMPLATE.toAnchor;
        const fromPos = getAnchorPosition(fromObj, fromAnchor);
        const toPos = getAnchorPosition(toObj, toAnchor);
        const { x } = fromPos;
        const { y } = fromPos;
        const points: [number, number, number, number] = [
          0,
          0,
          toPos.x - fromPos.x,
          toPos.y - fromPos.y,
        ];
        const obj = await ctx.createObject(boardId, {
          type: 'connector',
          x,
          y,
          width: Math.abs(points[2] - points[0]),
          height: Math.abs(points[3] - points[1]),
          fill: CONNECTOR_TEMPLATE.stroke,
          stroke: CONNECTOR_TEMPLATE.stroke,
          strokeWidth: CONNECTOR_TEMPLATE.strokeWidth,
          points,
          fromObjectId: fromId,
          toObjectId: toId,
          fromAnchor,
          toAnchor,
          createdBy,
        });
        return { id: obj.id, success: true, message: 'Created connector' };
      }

      case 'createText': {
        const { text, x, y, fontSize, color } = tool.arguments as {
          text: string;
          x: number;
          y: number;
          fontSize?: number;
          color?: string;
        };
        const userProvided = {
          ...(fontSize !== undefined && { fontSize }),
          ...(color !== undefined && { fill: color }),
        };
        const merged = mergeWithTemplate(TEXT_TEMPLATE, userProvided);
        const width = Math.max(50, text.length * merged.fontSize * 0.6);
        const height = merged.fontSize * 1.5;
        const obj = await ctx.createObject(boardId, {
          type: 'text',
          x,
          y,
          width,
          height,
          fill: merged.fill,
          text,
          fontSize: merged.fontSize,
          createdBy,
        });
        return { id: obj.id, success: true, message: `Created text: '${text}'` };
      }

      case 'moveObject': {
        const { objectId, x, y } = tool.arguments as {
          objectId: string;
          x: number;
          y: number;
        };
        await ctx.updateObject(boardId, objectId, { x, y });
        return { success: true, message: `Moved object to (${x}, ${y})` };
      }

      case 'resizeObject': {
        const { objectId, width, height } = tool.arguments as {
          objectId: string;
          width: number;
          height: number;
        };
        await ctx.updateObject(boardId, objectId, { width, height });
        return { success: true, message: `Resized object to ${width}x${height}` };
      }

      case 'updateText': {
        const { objectId, newText } = tool.arguments as {
          objectId: string;
          newText: string;
        };
        await ctx.updateObject(boardId, objectId, { text: newText });
        return { success: true, message: `Updated text to '${newText}'` };
      }

      case 'changeColor': {
        const { objectId, color } = tool.arguments as {
          objectId: string;
          color: string;
        };
        await ctx.updateObject(boardId, objectId, { fill: color });
        return { success: true, message: `Changed color to ${color}` };
      }

      case 'setFontSize': {
        const { objectId, fontSize } = tool.arguments as {
          objectId: string;
          fontSize: number;
        };
        if (fontSize < 8 || fontSize > 72) {
          return { success: false, message: 'Font size must be between 8 and 72' };
        }

        await ctx.updateObject(boardId, objectId, { fontSize });
        return { success: true, message: `Set font size to ${fontSize}px` };
      }

      case 'setFontColor': {
        const { objectId, color } = tool.arguments as {
          objectId: string;
          color: string;
        };
        const object = getObjects().find((item) => item.id === objectId);
        if (!object) {
          return { success: false, message: `Object not found: ${objectId}` };
        }

        const resolvedColor = resolveTextColor(color);
        if (object.type === 'sticky') {
          await ctx.updateObject(boardId, objectId, { textFill: resolvedColor });
          return { success: true, message: `Set font color to ${resolvedColor}` };
        }

        if (object.type === 'text') {
          await ctx.updateObject(boardId, objectId, { fill: resolvedColor });
          return { success: true, message: `Set font color to ${resolvedColor}` };
        }

        return { success: false, message: 'Font color can only be set on sticky notes and text.' };
      }

      case 'setStroke': {
        const { objectId, color } = tool.arguments as {
          objectId: string;
          color: string;
        };
        await ctx.updateObject(boardId, objectId, { stroke: color });
        return { success: true, message: `Set stroke color to ${color}` };
      }

      case 'setStrokeWidth': {
        const { objectId, strokeWidth } = tool.arguments as {
          objectId: string;
          strokeWidth: number;
        };
        if (strokeWidth < 0) {
          return { success: false, message: 'Stroke width must be at least 1' };
        }

        const clamped = Math.max(1, strokeWidth);
        await ctx.updateObject(boardId, objectId, { strokeWidth: clamped });
        return { success: true, message: `Set stroke width to ${clamped}px` };
      }

      case 'setOpacity': {
        const { objectId, opacity } = tool.arguments as {
          objectId: string;
          opacity: number;
        };
        if (opacity < 0 || opacity > 1) {
          return { success: false, message: 'Opacity must be between 0 and 1' };
        }

        await ctx.updateObject(boardId, objectId, { opacity });
        return { success: true, message: `Set opacity to ${Math.round(opacity * 100)}%` };
      }

      case 'deleteObject': {
        const { objectId } = tool.arguments as { objectId: string };
        await ctx.deleteObject(boardId, objectId);
        return { success: true, message: 'Deleted object' };
      }

      case 'deleteObjects': {
        const { objectIds } = tool.arguments as { objectIds: string[] };
        if (!Array.isArray(objectIds) || objectIds.length === 0) {
          return {
            success: false,
            message: 'objectIds must be a non-empty array',
          };
        }

        await ctx.deleteObjectsBatch(boardId, objectIds);
        return {
          success: true,
          message: `Deleted ${objectIds.length} object(s)`,
          deletedCount: objectIds.length,
        };
      }

      case 'duplicateObject': {
        const {
          objectId,
          offsetX = 20,
          offsetY = 20,
        } = tool.arguments as {
          objectId: string;
          offsetX?: number;
          offsetY?: number;
        };
        const source = getObjects().find((o) => o.id === objectId);
        if (!source) {
          return { success: false, message: 'Object not found' };
        }

        const params: ICreateObjectParams = {
          type: source.type as ShapeType,
          x: source.x + offsetX,
          y: source.y + offsetY,
          width: source.width,
          height: source.height,
          fill: source.fill,
          createdBy,
        };
        if (source.rotation && source.rotation !== 0) {
          params.rotation = source.rotation;
        }

        if (source.stroke) params.stroke = source.stroke;

        if (source.strokeWidth) params.strokeWidth = source.strokeWidth;

        if (source.text) params.text = source.text;

        if (source.textFill) params.textFill = source.textFill;

        if (source.fontSize) params.fontSize = source.fontSize;

        if (source.opacity) params.opacity = source.opacity;

        if (source.points?.length) params.points = [...source.points];

        if (source.fromObjectId) params.fromObjectId = source.fromObjectId;

        if (source.toObjectId) params.toObjectId = source.toObjectId;

        if (source.fromAnchor) params.fromAnchor = source.fromAnchor;

        if (source.toAnchor) params.toAnchor = source.toAnchor;

        if (source.arrowheads) params.arrowheads = source.arrowheads;

        if (source.strokeStyle) params.strokeStyle = source.strokeStyle;

        const obj = await ctx.createObject(boardId, params);
        return { id: obj.id, success: true, message: 'Duplicated object' };
      }

      case 'getBoardState': {
        const { includeDetails = false } = tool.arguments as { includeDetails?: boolean };
        const elements = stateManager.getElementsForAI(includeDetails);

        return {
          objectCount: elements.length,
          objects: elements,
        };
      }

      case 'findObjects': {
        const { type, color, textContains } = tool.arguments as {
          type?: string;
          color?: string;
          textContains?: string;
        };
        let filtered = getObjects();
        if (type) filtered = filtered.filter((o) => o.type === type);

        if (color) filtered = filtered.filter((o) => o.fill === color);

        if (textContains != null && textContains !== '')
          filtered = filtered.filter((o) =>
            o.text?.toLowerCase().includes(textContains.toLowerCase())
          );

        return {
          found: filtered.length,
          objects: filtered.map((o) => ({ id: o.id, type: o.type, text: o.text, x: o.x, y: o.y })),
        };
      }

      case 'arrangeInGrid': {
        const {
          objectIds,
          columns,
          spacing = 20,
          startX = 100,
          startY = 100,
        } = tool.arguments as {
          objectIds: string[];
          columns: number;
          spacing?: number;
          startX?: number;
          startY?: number;
        };
        const objects = getObjects().filter((o) => objectIds.includes(o.id));
        for (let i = 0; i < objects.length; i++) {
          const row = Math.floor(i / columns);
          const col = i % columns;
          const obj = objects[i];
          if (!obj) {
            continue;
          }

          const newX = startX + col * (obj.width + spacing);
          const newY = startY + row * (obj.height + spacing);
          await ctx.updateObject(boardId, obj.id, { x: newX, y: newY });
        }
        return {
          success: true,
          message: `Arranged ${objects.length} objects in a ${columns}-column grid`,
        };
      }

      case 'alignObjects': {
        const { objectIds, alignment } = tool.arguments as {
          objectIds: string[];
          alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
        };
        const objects = getObjects().filter((o) => objectIds.includes(o.id));
        if (objects.length === 0) return { success: false, message: 'No objects found' };

        const rects = objects.map((o) => ({
          id: o.id,
          x: o.x,
          y: o.y,
          width: o.width,
          height: o.height,
        }));
        const updates = computeAlignUpdates(rects, alignment);
        for (const u of updates) {
          const payload: IUpdateObjectParams = {};
          // x/y can be 0; must use !== undefined so first position is applied
          /* eslint-disable local/prefer-falsy-over-explicit-nullish -- 0 is valid for x/y */
          if (u.x !== undefined) {
            payload.x = u.x;
          }

          if (u.y !== undefined) {
            payload.y = u.y;
          }

          /* eslint-enable local/prefer-falsy-over-explicit-nullish */
          if (Object.keys(payload).length > 0) {
            await ctx.updateObject(boardId, u.id, payload);
          }
        }
        return { success: true, message: `Aligned objects: ${alignment}` };
      }

      case 'distributeObjects': {
        const { objectIds, direction } = tool.arguments as {
          objectIds: string[];
          direction: 'horizontal' | 'vertical';
        };
        const objects = getObjects().filter((o) => objectIds.includes(o.id));
        if (objects.length < 3) {
          return { success: false, message: 'Need at least 3 objects to distribute' };
        }

        const rects = objects.map((o) => ({
          id: o.id,
          x: o.x,
          y: o.y,
          width: o.width,
          height: o.height,
        }));
        const updates = computeDistributeUpdates(rects, direction);
        for (const u of updates) {
          const payload: IUpdateObjectParams = {};
          // x/y can be 0; must use !== undefined so first position is applied
          /* eslint-disable local/prefer-falsy-over-explicit-nullish -- 0 is valid for x/y */
          if (u.x !== undefined) {
            payload.x = u.x;
          }

          if (u.y !== undefined) {
            payload.y = u.y;
          }

          /* eslint-enable local/prefer-falsy-over-explicit-nullish */
          if (Object.keys(payload).length > 0) {
            await ctx.updateObject(boardId, u.id, payload);
          }
        }
        return { success: true, message: `Distributed ${objects.length} objects ${direction}ly` };
      }

      case 'zoomToFitAll': {
        if (ctx.onZoomToFitAll) {
          await ctx.onZoomToFitAll();
          return { success: true, message: 'Zoomed to fit all.' };
        }

        return {
          success: true,
          message: 'Zoom to fit all requested; use the zoom control in the UI if needed.',
        };
      }

      case 'zoomToSelection': {
        const { objectIds } = tool.arguments as { objectIds?: string[] };
        if (!objectIds || !Array.isArray(objectIds) || objectIds.length === 0) {
          return { success: false, message: 'objectIds (non-empty array) is required.' };
        }

        if (ctx.onZoomToSelection) {
          await ctx.onZoomToSelection(objectIds);
          return { success: true, message: `Zoomed to fit ${objectIds.length} object(s).` };
        }

        return {
          success: true,
          message: 'Zoom to selection requested; use the zoom control in the UI if needed.',
        };
      }

      case 'setZoomLevel': {
        const { percent } = tool.arguments as { percent?: number };
        const allowed = [50, 100, 200];
        if (typeof percent !== 'number' || !allowed.includes(percent)) {
          return {
            success: false,
            message: `percent must be one of ${allowed.join(', ')}.`,
          };
        }

        if (ctx.onSetZoomLevel) {
          await ctx.onSetZoomLevel(percent);
          return { success: true, message: `Zoom set to ${percent}%.` };
        }

        return {
          success: true,
          message: `Set zoom to ${percent}% requested; use the zoom control in the UI if needed.`,
        };
      }

      case 'exportBoardAsImage': {
        const { scope, format } = tool.arguments as {
          scope?: 'viewport' | 'full';
          format?: 'png' | 'jpeg';
        };
        const f = format ?? 'png';
        if (scope === 'viewport' && ctx.onExportViewport) {
          ctx.onExportViewport(f);
          return { success: true, message: 'Exported current view as image.' };
        }

        if (scope === 'full' && ctx.onExportFullBoard) {
          ctx.onExportFullBoard(f);
          return { success: true, message: 'Exported full board as image.' };
        }

        if (scope === 'viewport' || scope === 'full') {
          return {
            success: true,
            exportTriggered: false,
            message:
              'Export requested but not available in this context; use the Export button in the UI.',
          };
        }

        return {
          success: false,
          message: 'scope must be "viewport" or "full".',
        };
      }

      case 'getRecentBoards': {
        const prefs = await getUserPreferences(userId);
        const boardsWithNames = await Promise.all(
          prefs.recentBoardIds.map(async (id) => {
            const board = await getBoard(id);
            return { id, name: board?.name ?? 'Unknown board' };
          })
        );
        return {
          recentBoardIds: prefs.recentBoardIds,
          boards: boardsWithNames,
          message: `Recently opened: ${boardsWithNames.map((b) => b.name).join(', ') || 'none'}`,
        };
      }

      case 'getFavoriteBoards': {
        const prefs = await getUserPreferences(userId);
        const boardsWithNames = await Promise.all(
          prefs.favoriteBoardIds.map(async (id) => {
            const board = await getBoard(id);
            return { id, name: board?.name ?? 'Unknown board' };
          })
        );
        return {
          favoriteBoardIds: prefs.favoriteBoardIds,
          boards: boardsWithNames,
          message: `Favorites: ${boardsWithNames.map((b) => b.name).join(', ') || 'none'}`,
        };
      }

      case 'toggleBoardFavorite': {
        const { boardId: targetBoardId } = tool.arguments as { boardId: string };
        if (!targetBoardId || typeof targetBoardId !== 'string') {
          return { success: false, message: 'boardId is required.' };
        }

        await toggleFavoriteBoardIdService(userId, targetBoardId);
        const prefs = await getUserPreferences(userId);
        const isFavorite = prefs.favoriteBoardIds.includes(targetBoardId);
        return {
          success: true,
          boardId: targetBoardId,
          isFavorite,
          message: isFavorite ? 'Board added to favorites.' : 'Board removed from favorites.',
        };
      }

      default: {
        return { success: false, message: `Unknown tool: ${String(tool.name)}` };
      }
    }
  };

  return { execute };
};
