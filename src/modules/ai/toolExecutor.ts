import type { IToolCall } from './tools';
import type { IBoardObject, ShapeType, ConnectorAnchor } from '@/types';
import type {
  ICreateObjectParams,
  IUpdateObjectParams,
} from '@/modules/sync/objectService';
import { getAnchorPosition } from '@/lib/connectorAnchors';

const DEFAULT_STICKY_WIDTH = 200;
const DEFAULT_STICKY_HEIGHT = 120;
const DEFAULT_FRAME_WIDTH = 300;
const DEFAULT_FRAME_HEIGHT = 200;
const DEFAULT_FILL = '#fef08a';

export interface IToolExecutorContext {
  boardId: string;
  createdBy: string;
  getObjects: () => IBoardObject[];
  createObject: (boardId: string, params: ICreateObjectParams) => Promise<IBoardObject>;
  updateObject: (boardId: string, objectId: string, updates: IUpdateObjectParams) => Promise<void>;
  deleteObject: (boardId: string, objectId: string) => Promise<void>;
}

export const createToolExecutor = (ctx: IToolExecutorContext) => {
  const { boardId, createdBy, getObjects } = ctx;

  const execute = async (tool: IToolCall): Promise<unknown> => {
    switch (tool.name) {
      case 'createStickyNote': {
        const {
          text,
          x,
          y,
          color = DEFAULT_FILL,
        } = tool.arguments as {
          text: string;
          x: number;
          y: number;
          color?: string;
        };
        const obj = await ctx.createObject(boardId, {
          type: 'sticky',
          x,
          y,
          width: DEFAULT_STICKY_WIDTH,
          height: DEFAULT_STICKY_HEIGHT,
          fill: color,
          text,
          createdBy,
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
        const x = fromPos.x;
        const y = fromPos.y;
        const points = [0, 0, toPos.x - fromPos.x, toPos.y - fromPos.y];
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

        if (alignment === 'left') {
          const targetX = Math.min(...objects.map((o) => o.x));
          for (const obj of objects) await ctx.updateObject(boardId, obj.id, { x: targetX });
        } else if (alignment === 'right') {
          const targetRight = Math.max(...objects.map((o) => o.x + o.width));
          for (const obj of objects)
            await ctx.updateObject(boardId, obj.id, { x: targetRight - obj.width });
        } else if (alignment === 'center') {
          const minX = Math.min(...objects.map((o) => o.x));
          const maxRight = Math.max(...objects.map((o) => o.x + o.width));
          const centerX = (minX + maxRight) / 2;
          for (const obj of objects)
            await ctx.updateObject(boardId, obj.id, { x: centerX - obj.width / 2 });
        } else if (alignment === 'top') {
          const targetY = Math.min(...objects.map((o) => o.y));
          for (const obj of objects) await ctx.updateObject(boardId, obj.id, { y: targetY });
        } else if (alignment === 'bottom') {
          const targetBottom = Math.max(...objects.map((o) => o.y + o.height));
          for (const obj of objects)
            await ctx.updateObject(boardId, obj.id, { y: targetBottom - obj.height });
        } else if (alignment === 'middle') {
          const minY = Math.min(...objects.map((o) => o.y));
          const maxBottom = Math.max(...objects.map((o) => o.y + o.height));
          const centerY = (minY + maxBottom) / 2;
          for (const obj of objects)
            await ctx.updateObject(boardId, obj.id, { y: centerY - obj.height / 2 });
        }
        return { success: true, message: `Aligned objects: ${alignment}` };
      }

      case 'distributeObjects': {
        const { objectIds, direction } = tool.arguments as {
          objectIds: string[];
          direction: 'horizontal' | 'vertical';
        };
        const objects = getObjects()
          .filter((o) => objectIds.includes(o.id))
          .sort((a, b) => (direction === 'horizontal' ? a.x - b.x : a.y - b.y));
        if (objects.length < 3)
          return { success: false, message: 'Need at least 3 objects to distribute' };
        const first = objects[0];
        const last = objects[objects.length - 1];
        if (direction === 'horizontal') {
          const totalWidth = last.x + last.width - first.x;
          const objectsWidth = objects.reduce((s, o) => s + o.width, 0);
          const spacing = (totalWidth - objectsWidth) / (objects.length - 1);
          let currentX = first.x;
          for (const obj of objects) {
            await ctx.updateObject(boardId, obj.id, { x: currentX });
            currentX += obj.width + spacing;
          }
        } else {
          const totalHeight = last.y + last.height - first.y;
          const objectsHeight = objects.reduce((s, o) => s + o.height, 0);
          const spacing = (totalHeight - objectsHeight) / (objects.length - 1);
          let currentY = first.y;
          for (const obj of objects) {
            await ctx.updateObject(boardId, obj.id, { y: currentY });
            currentY += obj.height + spacing;
          }
        }
        return { success: true, message: `Distributed ${objects.length} objects ${direction}ly` };
      }

      default: {
        throw new Error(`Unknown tool: ${String(tool.name)}`);
      }
    }
  };

  return { execute };
};
