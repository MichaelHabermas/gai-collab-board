import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { createToolExecutor } from '@/modules/ai/toolExecutor';
import type { IBoardObject } from '@/types';

const mockCreateObject = vi.fn();
const mockUpdateObject = vi.fn();
const mockDeleteObject = vi.fn();

const now = Timestamp.now();
const mockBoardId = 'board-1';
const mockUserId = 'user-1';

const createContext = (objects: IBoardObject[] = []) => ({
  boardId: mockBoardId,
  createdBy: mockUserId,
  getObjects: () => objects,
  createObject: mockCreateObject as (boardId: string, params: unknown) => Promise<IBoardObject>,
  updateObject: mockUpdateObject as (
    boardId: string,
    objectId: string,
    updates: unknown
  ) => Promise<void>,
  deleteObject: mockDeleteObject as (boardId: string, objectId: string) => Promise<void>,
});

describe('toolExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObject.mockResolvedValue({ id: 'new-id', type: 'sticky', x: 0, y: 0 });
    mockUpdateObject.mockResolvedValue(undefined);
    mockDeleteObject.mockResolvedValue(undefined);
  });

  describe('createStickyNote', () => {
    it('calls createObject with sticky params', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'createStickyNote',
        arguments: { text: 'Hello', x: 100, y: 200, color: '#fef08a' },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(mockBoardId, {
        type: 'sticky',
        x: 100,
        y: 200,
        width: 200,
        height: 120,
        fill: '#fef08a',
        text: 'Hello',
        createdBy: mockUserId,
      });
    });
  });

  describe('moveObject', () => {
    it('calls updateObject with x and y', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'moveObject',
        arguments: { objectId: 'obj-1', x: 50, y: 60 },
      });
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'obj-1', { x: 50, y: 60 });
    });
  });

  describe('getBoardState', () => {
    it('returns object count and list from getObjects', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'a',
          type: 'sticky',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          fill: '#fff',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'getBoardState',
        arguments: { includeDetails: false },
      });
      expect(result).toEqual({
        objectCount: 1,
        objects: [{ id: 'a', type: 'sticky', x: 0, y: 0, text: undefined, fill: '#fff' }],
      });
    });
  });

  describe('findObjects', () => {
    it('filters by type and returns found count', async () => {
      const objects: IBoardObject[] = [
        {
          id: 's1',
          type: 'sticky',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          fill: '#fff',
          text: 'Note',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'r1',
          type: 'rectangle',
          x: 10,
          y: 10,
          width: 50,
          height: 50,
          rotation: 0,
          fill: '#333',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'findObjects',
        arguments: { type: 'sticky' },
      });
      expect(result).toEqual({
        found: 1,
        objects: [{ id: 's1', type: 'sticky', text: 'Note', x: 0, y: 0 }],
      });
    });
  });

  describe('deleteObject', () => {
    it('calls deleteObject with objectId', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({ name: 'deleteObject', arguments: { objectId: 'obj-99' } });
      expect(mockDeleteObject).toHaveBeenCalledWith(mockBoardId, 'obj-99');
    });
  });

  describe('arrangeInGrid', () => {
    it('calls updateObject for each object with new positions', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'o1',
          type: 'sticky',
          x: 0,
          y: 0,
          width: 100,
          height: 80,
          rotation: 0,
          fill: '#fff',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'o2',
          type: 'sticky',
          x: 200,
          y: 0,
          width: 100,
          height: 80,
          rotation: 0,
          fill: '#fff',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      await execute({
        name: 'arrangeInGrid',
        arguments: { objectIds: ['o1', 'o2'], columns: 2, spacing: 20, startX: 0, startY: 0 },
      });
      expect(mockUpdateObject).toHaveBeenCalledTimes(2);
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'o1', { x: 0, y: 0 });
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'o2', { x: 120, y: 0 });
    });
  });

  describe('createShape', () => {
    it('calls createObject with rectangle params and default color', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'createShape',
        arguments: { type: 'rectangle', x: 10, y: 20, width: 80, height: 60 },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(mockBoardId, {
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 80,
        height: 60,
        fill: '#93c5fd',
        points: undefined,
        createdBy: mockUserId,
      });
      expect(result).toEqual({ id: 'new-id', success: true, message: 'Created rectangle' });
    });

    it('calls createObject with circle and custom color', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'createShape',
        arguments: { type: 'circle', x: 0, y: 0, width: 40, height: 40, color: '#86efac' },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(mockBoardId, {
        type: 'circle',
        x: 0,
        y: 0,
        width: 40,
        height: 40,
        fill: '#86efac',
        points: undefined,
        createdBy: mockUserId,
      });
    });

    it('calls createObject with line and points', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'createShape',
        arguments: { type: 'line', x: 0, y: 0, width: 100, height: 50 },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(mockBoardId, {
        type: 'line',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        fill: '#93c5fd',
        points: [0, 0, 100, 50],
        createdBy: mockUserId,
      });
    });
  });

  describe('createFrame', () => {
    it('calls createObject with frame params and default size', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'createFrame',
        arguments: { title: 'Sprint 1', x: 50, y: 50 },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(mockBoardId, {
        type: 'frame',
        x: 50,
        y: 50,
        width: 300,
        height: 200,
        fill: 'rgba(255,255,255,0.15)',
        text: 'Sprint 1',
        createdBy: mockUserId,
      });
      expect(result).toEqual({ id: 'new-id', success: true, message: "Created frame: 'Sprint 1'" });
    });

    it('calls createObject with explicit width and height', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'createFrame',
        arguments: { title: 'Backlog', x: 0, y: 0, width: 400, height: 300 },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(mockBoardId, {
        type: 'frame',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        fill: 'rgba(255,255,255,0.15)',
        text: 'Backlog',
        createdBy: mockUserId,
      });
    });
  });

  describe('createConnector', () => {
    it('calls createObject with connector when source and target exist', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'from-1',
          type: 'sticky',
          x: 0,
          y: 0,
          width: 100,
          height: 80,
          rotation: 0,
          fill: '#fff',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'to-1',
          type: 'sticky',
          x: 200,
          y: 0,
          width: 100,
          height: 80,
          rotation: 0,
          fill: '#fff',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'createConnector',
        arguments: { fromId: 'from-1', toId: 'to-1', style: 'line' },
      });
      expect(mockCreateObject).toHaveBeenCalledTimes(1);
      const call = mockCreateObject.mock.calls[0];
      if (call === undefined) {
        throw new Error('Expected mock to be called with one argument set');
      }
      expect(call[0]).toBe(mockBoardId);
      expect(call[1]).toMatchObject({
        type: 'connector',
        fromObjectId: 'from-1',
        toObjectId: 'to-1',
        createdBy: mockUserId,
      });
      expect(result).toEqual({ id: 'new-id', success: true, message: 'Created connector' });
    });

    it('throws when source or target object not found', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'only-one',
          type: 'sticky',
          x: 0,
          y: 0,
          width: 100,
          height: 80,
          rotation: 0,
          fill: '#fff',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      await expect(
        execute({
          name: 'createConnector',
          arguments: { fromId: 'only-one', toId: 'missing' },
        })
      ).rejects.toThrow('Source or target object not found for connector');
      expect(mockCreateObject).not.toHaveBeenCalled();
    });
  });

  describe('createText', () => {
    it('calls createObject with text params and default fontSize and color', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'createText',
        arguments: { text: 'Hello', x: 30, y: 40 },
      });
      const width = Math.max(50, 5 * 16 * 0.6);
      const height = 16 * 1.5;
      expect(mockCreateObject).toHaveBeenCalledWith(mockBoardId, {
        type: 'text',
        x: 30,
        y: 40,
        width,
        height,
        fill: '#1e293b',
        text: 'Hello',
        fontSize: 16,
        createdBy: mockUserId,
      });
      expect(result).toEqual({ id: 'new-id', success: true, message: "Created text: 'Hello'" });
    });

    it('calls createObject with custom fontSize and color', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'createText',
        arguments: { text: 'Big', x: 0, y: 0, fontSize: 24, color: '#64748b' },
      });
      const width = Math.max(50, 3 * 24 * 0.6);
      const height = 24 * 1.5;
      expect(mockCreateObject).toHaveBeenCalledWith(mockBoardId, {
        type: 'text',
        x: 0,
        y: 0,
        width,
        height,
        fill: '#64748b',
        text: 'Big',
        fontSize: 24,
        createdBy: mockUserId,
      });
    });
  });

  describe('resizeObject', () => {
    it('calls updateObject with width and height', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'resizeObject',
        arguments: { objectId: 'obj-1', width: 150, height: 90 },
      });
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'obj-1', {
        width: 150,
        height: 90,
      });
      expect(result).toEqual({ success: true, message: 'Resized object to 150x90' });
    });
  });

  describe('updateText', () => {
    it('calls updateObject with text', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'updateText',
        arguments: { objectId: 'obj-1', newText: 'Updated content' },
      });
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'obj-1', {
        text: 'Updated content',
      });
      expect(result).toEqual({ success: true, message: "Updated text to 'Updated content'" });
    });
  });

  describe('changeColor', () => {
    it('calls updateObject with fill', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'changeColor',
        arguments: { objectId: 'obj-1', color: '#86efac' },
      });
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'obj-1', {
        fill: '#86efac',
      });
      expect(result).toEqual({ success: true, message: 'Changed color to #86efac' });
    });
  });

  describe('alignObjects', () => {
    it('calls updateObject for each object when aligning left', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'a1',
          type: 'sticky',
          x: 50,
          y: 0,
          width: 100,
          height: 80,
          rotation: 0,
          fill: '#fff',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'a2',
          type: 'sticky',
          x: 200,
          y: 0,
          width: 100,
          height: 80,
          rotation: 0,
          fill: '#fff',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'alignObjects',
        arguments: { objectIds: ['a1', 'a2'], alignment: 'left' },
      });
      expect(mockUpdateObject).toHaveBeenCalledTimes(2);
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'a1', { x: 50 });
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'a2', { x: 50 });
      expect(result).toEqual({ success: true, message: 'Aligned objects: left' });
    });

    it('returns no objects found when objectIds match nothing', async () => {
      const { execute } = createToolExecutor(createContext([]));
      const result = await execute({
        name: 'alignObjects',
        arguments: { objectIds: ['nonexistent'], alignment: 'left' },
      });
      expect(result).toEqual({ success: false, message: 'No objects found' });
      expect(mockUpdateObject).not.toHaveBeenCalled();
    });
  });

  describe('distributeObjects', () => {
    it('calls updateObject for positions when 3+ objects and horizontal', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'd1',
          type: 'sticky',
          x: 0,
          y: 0,
          width: 50,
          height: 50,
          rotation: 0,
          fill: '#fff',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'd2',
          type: 'sticky',
          x: 100,
          y: 0,
          width: 50,
          height: 50,
          rotation: 0,
          fill: '#fff',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'd3',
          type: 'sticky',
          x: 200,
          y: 0,
          width: 50,
          height: 50,
          rotation: 0,
          fill: '#fff',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'distributeObjects',
        arguments: { objectIds: ['d1', 'd2', 'd3'], direction: 'horizontal' },
      });
      expect(mockUpdateObject).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        success: true,
        message: 'Distributed 3 objects horizontally',
      });
    });

    it('returns success false when fewer than 3 objects', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'd1',
          type: 'sticky',
          x: 0,
          y: 0,
          width: 50,
          height: 50,
          rotation: 0,
          fill: '#fff',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'd2',
          type: 'sticky',
          x: 50,
          y: 0,
          width: 50,
          height: 50,
          rotation: 0,
          fill: '#fff',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'distributeObjects',
        arguments: { objectIds: ['d1', 'd2'], direction: 'vertical' },
      });
      expect(result).toEqual({
        success: false,
        message: 'Need at least 3 objects to distribute',
      });
      expect(mockUpdateObject).not.toHaveBeenCalled();
    });
  });

  describe('unknown tool', () => {
    it('returns success false and message for unknown tool name', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'unknownTool' as 'createStickyNote',
        arguments: {},
      });
      expect(result).toEqual({
        success: false,
        message: 'Unknown tool: unknownTool',
      });
      expect(mockCreateObject).not.toHaveBeenCalled();
      expect(mockUpdateObject).not.toHaveBeenCalled();
      expect(mockDeleteObject).not.toHaveBeenCalled();
    });
  });
});
