import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { createToolExecutor } from '@/modules/ai/toolExecutor';
import type { IBoardObject } from '@/types';

const mockGetBoard = vi.fn();
const mockGetUserPreferences = vi.fn();
const mockToggleFavoriteBoardId = vi.fn();

vi.mock('@/modules/sync/boardService', () => ({
  getBoard: (id: string) => mockGetBoard(id),
}));

vi.mock('@/modules/sync/userPreferencesService', () => ({
  getUserPreferences: (userId: string) => mockGetUserPreferences(userId),
  toggleFavoriteBoardId: (userId: string, boardId: string) =>
    mockToggleFavoriteBoardId(userId, boardId),
}));

const mockCreateObject = vi.fn();
const mockCreateObjectsBatch = vi.fn();
const mockUpdateObject = vi.fn();
const mockUpdateObjectsBatch = vi.fn();
const mockDeleteObject = vi.fn();
const mockDeleteObjectsBatch = vi.fn();

const now = Timestamp.now();
const mockBoardId = 'board-1';
const mockUserId = 'user-1';

const createContext = (objects: IBoardObject[] = []) => ({
  boardId: mockBoardId,
  createdBy: mockUserId,
  userId: mockUserId,
  getObjects: () => objects,
  createObject: mockCreateObject as (boardId: string, params: unknown) => Promise<IBoardObject>,
  createObjectsBatch: mockCreateObjectsBatch as (
    boardId: string,
    objects: unknown[]
  ) => Promise<IBoardObject[]>,
  updateObject: mockUpdateObject as (
    boardId: string,
    objectId: string,
    updates: unknown
  ) => Promise<void>,
  updateObjectsBatch: mockUpdateObjectsBatch as (
    boardId: string,
    updates: unknown[]
  ) => Promise<void>,
  deleteObject: mockDeleteObject as (boardId: string, objectId: string) => Promise<void>,
  deleteObjectsBatch: mockDeleteObjectsBatch as (
    boardId: string,
    objectIds: string[]
  ) => Promise<void>,
});

describe('toolExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObject.mockResolvedValue({ id: 'new-id', type: 'sticky', x: 0, y: 0 });
    mockCreateObjectsBatch.mockResolvedValue([]);
    mockUpdateObject.mockResolvedValue(undefined);
    mockUpdateObjectsBatch.mockResolvedValue(undefined);
    mockDeleteObject.mockResolvedValue(undefined);
    mockDeleteObjectsBatch.mockResolvedValue(undefined);
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

    it('passes fontSize and opacity to createObject when provided', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'createStickyNote',
        arguments: {
          text: 'Hello Bob World',
          x: 100,
          y: 100,
          color: '#93c5fd',
          fontSize: 60,
          opacity: 0.75,
        },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(mockBoardId, {
        type: 'sticky',
        x: 100,
        y: 100,
        width: 200,
        height: 120,
        fill: '#93c5fd',
        text: 'Hello Bob World',
        createdBy: mockUserId,
        fontSize: 60,
        opacity: 0.75,
      });
    });

    it('passes textFill when fontColor is provided', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'createStickyNote',
        arguments: {
          text: 'Sticky with color',
          x: 100,
          y: 100,
          color: '#93c5fd',
          fontColor: '#ef4444',
        },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(
        mockBoardId,
        expect.objectContaining({
          type: 'sticky',
          fill: '#93c5fd',
          textFill: '#ef4444',
          text: 'Sticky with color',
        })
      );
    });

    it('clamps fontSize to 8–72 and opacity to 0–1 when out of range', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'createStickyNote',
        arguments: {
          text: 'Test',
          x: 0,
          y: 0,
          fontSize: 100,
          opacity: 1.5,
        },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(mockBoardId, {
        type: 'sticky',
        x: 0,
        y: 0,
        width: 200,
        height: 120,
        fill: '#fef08a',
        text: 'Test',
        createdBy: mockUserId,
        fontSize: 72,
        opacity: 1,
      });
    });

    it('resolves color names (e.g. red, blue) to hex', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'createStickyNote',
        arguments: { text: 'Hi', x: 0, y: 0, color: 'red' },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(
        mockBoardId,
        expect.objectContaining({ fill: '#ef4444', text: 'Hi' })
      );
      mockCreateObject.mockClear();
      await execute({
        name: 'createStickyNote',
        arguments: { text: 'Bye', x: 10, y: 10, color: 'blue' },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(
        mockBoardId,
        expect.objectContaining({ fill: '#93c5fd', text: 'Bye' })
      );
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
        objects: [
          {
            id: 'a',
            type: 'sticky',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            rotation: 0,
            fill: '#fff',
          },
        ],
      });
    });

    it('includes connector fromObjectId and toObjectId when includeDetails is true', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'conn-1',
          type: 'connector',
          x: 100,
          y: 40,
          width: 100,
          height: 0,
          rotation: 0,
          fill: '#64748b',
          fromObjectId: 'sticky-a',
          toObjectId: 'sticky-b',
          fromAnchor: 'right',
          toAnchor: 'left',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'getBoardState',
        arguments: { includeDetails: true },
      });
      expect(result).toMatchObject({
        objectCount: 1,
        objects: [
          {
            id: 'conn-1',
            type: 'connector',
            x: 100,
            y: 40,
            fromObjectId: 'sticky-a',
            toObjectId: 'sticky-b',
            fromAnchor: 'right',
            toAnchor: 'left',
          },
        ],
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

    it('returns connector objects when filtering by type connector', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'c1',
          type: 'connector',
          x: 100,
          y: 40,
          width: 100,
          height: 0,
          rotation: 0,
          fill: '#64748b',
          stroke: '#64748b',
          points: [0, 0, 100, 0],
          fromObjectId: 'from-1',
          toObjectId: 'to-1',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 's1',
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
      const result = await execute({
        name: 'findObjects',
        arguments: { type: 'connector' },
      });
      expect(result).toEqual({
        found: 1,
        objects: [
          {
            id: 'c1',
            type: 'connector',
            text: undefined,
            x: 100,
            y: 40,
          },
        ],
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

  describe('deleteObjects', () => {
    it('calls deleteObjectsBatch with boardId and objectIds', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'deleteObjects',
        arguments: { objectIds: ['id1', 'id2'] },
      });
      expect(mockDeleteObjectsBatch).toHaveBeenCalledTimes(1);
      expect(mockDeleteObjectsBatch).toHaveBeenCalledWith(mockBoardId, ['id1', 'id2']);
      expect(result).toMatchObject({
        success: true,
        deletedCount: 2,
        message: 'Deleted 2 object(s)',
      });
    });

    it('returns failure when objectIds is empty', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'deleteObjects',
        arguments: { objectIds: [] },
      });
      expect(mockDeleteObjectsBatch).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'objectIds must be a non-empty array',
      });
    });
  });

  describe('duplicateObject', () => {
    it('creates a copy of a sticky with offset position', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'sticky-1',
          type: 'sticky',
          x: 100,
          y: 200,
          width: 200,
          height: 120,
          rotation: 0,
          fill: '#fef08a',
          text: 'Original',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'duplicateObject',
        arguments: { objectId: 'sticky-1', offsetX: 30, offsetY: 10 },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(mockBoardId, {
        type: 'sticky',
        x: 130,
        y: 210,
        width: 200,
        height: 120,
        fill: '#fef08a',
        text: 'Original',
        createdBy: mockUserId,
      });
      expect(result).toMatchObject({ success: true, id: 'new-id', message: 'Duplicated object' });
    });

    it('preserves connector fromObjectId and toObjectId when duplicating connector', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'conn-1',
          type: 'connector',
          x: 100,
          y: 40,
          width: 80,
          height: 0,
          rotation: 0,
          fill: '#64748b',
          points: [0, 0, 80, 0],
          fromObjectId: 'from-1',
          toObjectId: 'to-1',
          fromAnchor: 'right',
          toAnchor: 'left',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      await execute({
        name: 'duplicateObject',
        arguments: { objectId: 'conn-1' },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(
        mockBoardId,
        expect.objectContaining({
          type: 'connector',
          fromObjectId: 'from-1',
          toObjectId: 'to-1',
          fromAnchor: 'right',
          toAnchor: 'left',
          x: 120,
          y: 60,
        })
      );
    });

    it('returns failure when object not found', async () => {
      const { execute } = createToolExecutor(createContext([]));
      const result = await execute({
        name: 'duplicateObject',
        arguments: { objectId: 'missing' },
      });
      expect(mockCreateObject).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, message: 'Object not found' });
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

    it('calls createObject with explicit fromAnchor and toAnchor when provided', async () => {
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
          y: 100,
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
        name: 'createConnector',
        arguments: {
          fromId: 'from-1',
          toId: 'to-1',
          fromAnchor: 'bottom',
          toAnchor: 'top',
        },
      });
      const call = mockCreateObject.mock.calls[0];
      if (call === undefined) {
        throw new Error('Expected mock to be called');
      }
      expect(call[1]).toMatchObject({
        type: 'connector',
        fromObjectId: 'from-1',
        toObjectId: 'to-1',
        fromAnchor: 'bottom',
        toAnchor: 'top',
      });
    });

    it('uses default right/left anchors when fromAnchor/toAnchor omitted', async () => {
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
      await execute({
        name: 'createConnector',
        arguments: { fromId: 'from-1', toId: 'to-1' },
      });
      const call = mockCreateObject.mock.calls[0];
      if (call === undefined) {
        throw new Error('Expected mock to be called');
      }
      expect(call[1]).toMatchObject({
        fromAnchor: 'right',
        toAnchor: 'left',
      });
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

  describe('setFontSize', () => {
    it('calls updateObject with fontSize', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'setFontSize',
        arguments: { objectId: 'obj-1', fontSize: 18 },
      });
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'obj-1', {
        fontSize: 18,
      });
      expect(result).toEqual({ success: true, message: 'Set font size to 18px' });
    });

    it('returns failure when fontSize is out of range', async () => {
      const { execute } = createToolExecutor(createContext());
      const resultTooSmall = await execute({
        name: 'setFontSize',
        arguments: { objectId: 'obj-1', fontSize: 5 },
      });
      expect(mockUpdateObject).not.toHaveBeenCalled();
      expect(resultTooSmall).toEqual({
        success: false,
        message: 'Font size must be between 8 and 72',
      });
      const resultTooLarge = await execute({
        name: 'setFontSize',
        arguments: { objectId: 'obj-1', fontSize: 100 },
      });
      expect(resultTooLarge).toEqual({
        success: false,
        message: 'Font size must be between 8 and 72',
      });
    });
  });

  describe('setFontColor', () => {
    it('updates sticky note textFill', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'sticky-1',
          type: 'sticky',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          fill: '#fef08a',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'setFontColor',
        arguments: { objectId: 'sticky-1', color: '#3b82f6' },
      });
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'sticky-1', { textFill: '#3b82f6' });
      expect(result).toEqual({ success: true, message: 'Set font color to #3b82f6' });
    });

    it('updates text fill color', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'text-1',
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 20,
          rotation: 0,
          fill: '#1e293b',
          text: 'Hello',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'setFontColor',
        arguments: { objectId: 'text-1', color: '#ef4444' },
      });
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'text-1', { fill: '#ef4444' });
      expect(result).toEqual({ success: true, message: 'Set font color to #ef4444' });
    });

    it('returns failure for unsupported object type', async () => {
      const objects: IBoardObject[] = [
        {
          id: 'rect-1',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          fill: '#93c5fd',
          createdBy: 'u',
          createdAt: now,
          updatedAt: now,
        },
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'setFontColor',
        arguments: { objectId: 'rect-1', color: '#ef4444' },
      });
      expect(mockUpdateObject).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Font color can only be set on sticky notes and text.',
      });
    });
  });

  describe('setStroke', () => {
    it('calls updateObject with stroke color', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'setStroke',
        arguments: { objectId: 'obj-1', color: '#1e40af' },
      });
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'obj-1', {
        stroke: '#1e40af',
      });
      expect(result).toEqual({ success: true, message: 'Set stroke color to #1e40af' });
    });
  });

  describe('setStrokeWidth', () => {
    it('calls updateObject with strokeWidth', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'setStrokeWidth',
        arguments: { objectId: 'obj-1', strokeWidth: 4 },
      });
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'obj-1', {
        strokeWidth: 4,
      });
      expect(result).toEqual({ success: true, message: 'Set stroke width to 4px' });
    });

    it('returns failure when strokeWidth is negative', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'setStrokeWidth',
        arguments: { objectId: 'obj-1', strokeWidth: -1 },
      });
      expect(mockUpdateObject).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Stroke width must be at least 1',
      });
    });
  });

  describe('setOpacity', () => {
    it('calls updateObject with opacity', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'setOpacity',
        arguments: { objectId: 'obj-1', opacity: 0.5 },
      });
      expect(mockUpdateObject).toHaveBeenCalledWith(mockBoardId, 'obj-1', {
        opacity: 0.5,
      });
      expect(result).toEqual({ success: true, message: 'Set opacity to 50%' });
    });

    it('returns failure when opacity is out of range', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'setOpacity',
        arguments: { objectId: 'obj-1', opacity: 1.5 },
      });
      expect(mockUpdateObject).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Opacity must be between 0 and 1',
      });
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

  describe('zoomToFitAll', () => {
    it('calls onZoomToFitAll when provided and returns success', async () => {
      const onZoomToFitAll = vi.fn().mockResolvedValue(undefined);
      const { execute } = createToolExecutor({
        ...createContext(),
        onZoomToFitAll,
      });
      const result = await execute({
        name: 'zoomToFitAll',
        arguments: {},
      });
      expect(onZoomToFitAll).toHaveBeenCalledOnce();
      expect(result).toEqual({ success: true, message: 'Zoomed to fit all.' });
    });

    it('returns stub success when onZoomToFitAll not provided', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'zoomToFitAll',
        arguments: {},
      });
      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('Zoom to fit all'),
      });
    });
  });

  describe('zoomToSelection', () => {
    it('calls onZoomToSelection with objectIds when provided', async () => {
      const onZoomToSelection = vi.fn().mockResolvedValue(undefined);
      const { execute } = createToolExecutor({
        ...createContext(),
        onZoomToSelection,
      });
      const result = await execute({
        name: 'zoomToSelection',
        arguments: { objectIds: ['id1', 'id2'] },
      });
      expect(onZoomToSelection).toHaveBeenCalledWith(['id1', 'id2']);
      expect(result).toEqual({ success: true, message: 'Zoomed to fit 2 object(s).' });
    });

    it('returns failure when objectIds is empty', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'zoomToSelection',
        arguments: { objectIds: [] },
      });
      expect(result).toEqual({
        success: false,
        message: 'objectIds (non-empty array) is required.',
      });
    });

    it('returns stub success when onZoomToSelection not provided', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'zoomToSelection',
        arguments: { objectIds: ['id1'] },
      });
      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('Zoom to selection'),
      });
    });
  });

  describe('setZoomLevel', () => {
    it('calls onSetZoomLevel when provided and returns success', async () => {
      const onSetZoomLevel = vi.fn().mockResolvedValue(undefined);
      const { execute } = createToolExecutor({
        ...createContext(),
        onSetZoomLevel,
      });
      const result = await execute({
        name: 'setZoomLevel',
        arguments: { percent: 100 },
      });
      expect(onSetZoomLevel).toHaveBeenCalledWith(100);
      expect(result).toEqual({ success: true, message: 'Zoom set to 100%.' });
    });

    it('returns failure when percent is invalid', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'setZoomLevel',
        arguments: { percent: 75 },
      });
      expect(result).toEqual({
        success: false,
        message: 'percent must be one of 50, 100, 200.',
      });
    });

    it('returns stub success when onSetZoomLevel not provided', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'setZoomLevel',
        arguments: { percent: 50 },
      });
      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('50%'),
      });
    });
  });

  describe('exportBoardAsImage', () => {
    it('calls onExportViewport when scope is viewport', async () => {
      const mockExportViewport = vi.fn();
      const ctx = {
        ...createContext(),
        onExportViewport: mockExportViewport,
      };
      const { execute } = createToolExecutor(ctx);
      const result = await execute({
        name: 'exportBoardAsImage',
        arguments: { scope: 'viewport', format: 'png' },
      });
      expect(mockExportViewport).toHaveBeenCalledWith('png');
      expect(result).toEqual({ success: true, message: 'Exported current view as image.' });
    });

    it('calls onExportFullBoard when scope is full', async () => {
      const mockExportFullBoard = vi.fn();
      const ctx = {
        ...createContext(),
        onExportFullBoard: mockExportFullBoard,
      };
      const { execute } = createToolExecutor(ctx);
      const result = await execute({
        name: 'exportBoardAsImage',
        arguments: { scope: 'full', format: 'jpeg' },
      });
      expect(mockExportFullBoard).toHaveBeenCalledWith('jpeg');
      expect(result).toEqual({ success: true, message: 'Exported full board as image.' });
    });

    it('defaults format to png when omitted', async () => {
      const mockExportViewport = vi.fn();
      const ctx = {
        ...createContext(),
        onExportViewport: mockExportViewport,
      };
      const { execute } = createToolExecutor(ctx);
      await execute({
        name: 'exportBoardAsImage',
        arguments: { scope: 'viewport' },
      });
      expect(mockExportViewport).toHaveBeenCalledWith('png');
    });

    it('returns exportTriggered false and clear message when export callbacks not provided', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'exportBoardAsImage',
        arguments: { scope: 'viewport' },
      });
      expect(result).toMatchObject({
        success: true,
        exportTriggered: false,
        message:
          'Export requested but not available in this context; use the Export button in the UI.',
      });
    });

    it('returns failure when scope is invalid', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'exportBoardAsImage',
        arguments: { scope: 'invalid' },
      });
      expect(result).toEqual({
        success: false,
        message: 'scope must be "viewport" or "full".',
      });
    });
  });

  describe('getRecentBoards', () => {
    it('returns recent board IDs and names from preferences', async () => {
      mockGetUserPreferences.mockResolvedValue({
        recentBoardIds: ['b1', 'b2'],
        favoriteBoardIds: [],
      });
      mockGetBoard
        .mockResolvedValueOnce({ id: 'b1', name: 'Board One' })
        .mockResolvedValueOnce({ id: 'b2', name: 'Board Two' });

      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'getRecentBoards',
        arguments: {},
      });

      expect(mockGetUserPreferences).toHaveBeenCalledWith(mockUserId);
      expect(result).toMatchObject({
        recentBoardIds: ['b1', 'b2'],
        boards: [
          { id: 'b1', name: 'Board One' },
          { id: 'b2', name: 'Board Two' },
        ],
      });
    });
  });

  describe('getFavoriteBoards', () => {
    it('returns favorite board IDs and names from preferences', async () => {
      mockGetUserPreferences.mockResolvedValue({
        recentBoardIds: [],
        favoriteBoardIds: ['fav1'],
      });
      mockGetBoard.mockResolvedValueOnce({ id: 'fav1', name: 'My Favorite' });

      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'getFavoriteBoards',
        arguments: {},
      });

      expect(mockGetUserPreferences).toHaveBeenCalledWith(mockUserId);
      expect(result).toMatchObject({
        favoriteBoardIds: ['fav1'],
        boards: [{ id: 'fav1', name: 'My Favorite' }],
      });
    });
  });

  describe('toggleBoardFavorite', () => {
    it('toggles favorite and returns new state', async () => {
      mockToggleFavoriteBoardId.mockResolvedValue(undefined);
      // Executor calls getUserPreferences once after toggle to get new state
      mockGetUserPreferences.mockResolvedValue({
        recentBoardIds: [],
        favoriteBoardIds: ['target-board'],
      });

      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'toggleBoardFavorite',
        arguments: { boardId: 'target-board' },
      });

      expect(mockToggleFavoriteBoardId).toHaveBeenCalledWith(mockUserId, 'target-board');
      expect(result).toMatchObject({
        success: true,
        boardId: 'target-board',
        isFavorite: true,
      });
    });

    it('returns error when boardId is missing', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'toggleBoardFavorite',
        arguments: {},
      });
      expect(result).toEqual({ success: false, message: 'boardId is required.' });
      expect(mockToggleFavoriteBoardId).not.toHaveBeenCalled();
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
