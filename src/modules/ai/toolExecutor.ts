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

const DEFAULT_STICKY_WIDTH = 200;
const DEFAULT_STICKY_HEIGHT = 120;
const DEFAULT_FRAME_WIDTH = 300;
const DEFAULT_FRAME_HEIGHT = 200;
const DEFAULT_FILL = '#fef08a';
const DEFAULT_FONT_COLOR = '#1e293b';

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
  updateObject: (boardId: string, objectId: string, updates: IUpdateObjectParams) => Promise<void>;
  deleteObject: (boardId: string, objectId: string) => Promise<void>;
  onZoomToFitAll?: () => void | Promise<void>;
  onZoomToSelection?: (objectIds: string[]) => void | Promise<void>;
  onSetZoomLevel?: (percent: number) => void | Promise<void>;
  onExportViewport?: (format?: 'png' | 'jpeg') => void;
  onExportFullBoard?: (format?: 'png' | 'jpeg') => void;
}

export const createToolExecutor = (ctx: IToolExecutorContext) => {
  const { boardId, createdBy, userId, getObjects } = ctx;

  const execute = async (tool: IToolCall): Promise<unknown> => {
    switch (tool.name) {
      case 'createStickyNote': {
        const {
          text,
          x,
          y,
          color = DEFAULT_FILL,
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
        const clampedFontSize =
          rawFontSize
            ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, rawFontSize))
            : undefined;
        const clampedOpacity =
          rawOpacity ? Math.min(1, Math.max(0, rawOpacity)) : undefined;
        const obj = await ctx.createObject(boardId, {
          type: 'sticky',
          x,
          y,
          width: DEFAULT_STICKY_WIDTH,
          height: DEFAULT_STICKY_HEIGHT,
          fill: resolveStickyColor(color),
          text,
          createdBy,
          ...(fontColor !== undefined && { textFill: resolveTextColor(fontColor) }),
          ...(clampedFontSize !== undefined && { fontSize: clampedFontSize }),
          ...(clampedOpacity !== undefined && { opacity: clampedOpacity }),
        });
        return { id: obj.id, success: true, message: `Created sticky note: '${text}'` };
      }

      case 'createShape': {
        const {
          type,
          x,
          y,
          width,
          height,
          color = '#93c5fd',
        } = tool.arguments as {
          type: 'rectangle' | 'circle' | 'line';
          x: number;
          y: number;
          width: number;
          height: number;
          color?: string;
        };
        const shapeType: ShapeType = type;
        const points = type === 'line' ? [0, 0, width, height] : undefined;
        const obj = await ctx.createObject(boardId, {
          type: shapeType,
          x,
          y,
          width,
          height,
          fill: color,
          points,
          createdBy,
        });
        return { id: obj.id, success: true, message: `Created ${type}` };
      }

      case 'createFrame': {
        const {
          title,
          x,
          y,
          width = DEFAULT_FRAME_WIDTH,
          height = DEFAULT_FRAME_HEIGHT,
        } = tool.arguments as {
          title: string;
          x: number;
          y: number;
          width?: number;
          height?: number;
        };
        const obj = await ctx.createObject(boardId, {
          type: 'frame',
          x,
          y,
          width,
          height,
          fill: 'rgba(255,255,255,0.15)',
          text: title,
          createdBy,
        });
        return { id: obj.id, success: true, message: `Created frame: '${title}'` };
      }

      case 'createConnector': {
        const {
          fromId,
          toId,
          style = 'line',
        } = tool.arguments as {
          fromId: string;
          toId: string;
          style?: string;
        };
        const objects = getObjects();
        const fromObj = objects.find((o) => o.id === fromId);
        const toObj = objects.find((o) => o.id === toId);
        if (!fromObj || !toObj) {
          throw new Error('Source or target object not found for connector');
        }

        const fromAnchor: ConnectorAnchor = 'right';
        const toAnchor: ConnectorAnchor = 'left';
        const fromPos = getAnchorPosition(fromObj, fromAnchor);
        const toPos = getAnchorPosition(toObj, toAnchor);
        const {x} = fromPos;
        const {y} = fromPos;
        const points: [number, number, number, number] = [
          0,
          0,
          toPos.x - fromPos.x,
          toPos.y - fromPos.y,
        ];
        const stroke = style === 'arrow' || style === 'dashed' ? '#64748b' : '#64748b';
        const obj = await ctx.createObject(boardId, {
          type: 'connector',
          x,
          y,
          width: Math.abs(points[2] - points[0]),
          height: Math.abs(points[3] - points[1]),
          fill: stroke,
          stroke,
          strokeWidth: 2,
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
        const {
          text,
          x,
          y,
          fontSize = 16,
          color = '#1e293b',
        } = tool.arguments as {
          text: string;
          x: number;
          y: number;
          fontSize?: number;
          color?: string;
        };
        const width = Math.max(50, text.length * fontSize * 0.6);
        const height = fontSize * 1.5;
        const obj = await ctx.createObject(boardId, {
          type: 'text',
          x,
          y,
          width,
          height,
          fill: color,
          text,
          fontSize,
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
          return { success: false, message: 'Stroke width must be non-negative' };
        }

        await ctx.updateObject(boardId, objectId, { strokeWidth });
        return { success: true, message: `Set stroke width to ${strokeWidth}px` };
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

      case 'getBoardState': {
        const { includeDetails = false } = tool.arguments as { includeDetails?: boolean };
        const objects = getObjects();
        return {
          objectCount: objects.length,
          objects: objects.map((obj) =>
            includeDetails
              ? {
                  id: obj.id,
                  type: obj.type,
                  x: obj.x,
                  y: obj.y,
                  width: obj.width,
                  height: obj.height,
                  text: obj.text,
                  fill: obj.fill,
                }
              : { id: obj.id, type: obj.type, x: obj.x, y: obj.y, text: obj.text, fill: obj.fill }
          ),
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
          if (u.x) payload.x = u.x;

          if (u.y) payload.y = u.y;

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
          if (u.x) payload.x = u.x;

          if (u.y) payload.y = u.y;

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
            message: `Export ${scope} requested; use the Export button in the UI if the download did not start.`,
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
