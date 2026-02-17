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
  updateObject: mockUpdateObject as (boardId: string, objectId: string, updates: unknown) => Promise<void>,
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
});
