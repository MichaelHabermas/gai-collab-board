import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeUndo, executeRedo } from '@/modules/history/historyService';
import type { IHistoryEntry } from '@/types';
import type { IBoardObject } from '@/types';
import { Timestamp } from 'firebase/firestore';

const makeObj = (id: string): IBoardObject => ({
  id,
  type: 'sticky',
  x: 10,
  y: 20,
  width: 100,
  height: 100,
  rotation: 0,
  fill: '#fbbf24',
  createdBy: 'user-1',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
});

describe('historyService', () => {
  const mockCtx = {
    createObject: vi.fn().mockResolvedValue(null),
    updateObject: vi.fn().mockResolvedValue(undefined),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    getObjects: vi.fn().mockReturnValue([]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeUndo', () => {
    it('undoes create by deleting the object', async () => {
      const entry: IHistoryEntry = [
        { type: 'create', objectId: 'obj-1', after: makeObj('obj-1') },
      ];

      await executeUndo(entry, mockCtx);
      expect(mockCtx.deleteObject).toHaveBeenCalledWith('obj-1');
    });

    it('undoes delete by recreating the object', async () => {
      const obj = makeObj('obj-2');
      const entry: IHistoryEntry = [
        { type: 'delete', objectId: 'obj-2', before: obj },
      ];

      await executeUndo(entry, mockCtx);
      expect(mockCtx.createObject).toHaveBeenCalledTimes(1);
    });

    it('undoes update by applying before state', async () => {
      const before = makeObj('obj-3');
      const after = { ...before, x: 50 };
      const entry: IHistoryEntry = [
        { type: 'update', objectId: 'obj-3', before, after },
      ];

      await executeUndo(entry, mockCtx);
      expect(mockCtx.updateObject).toHaveBeenCalledTimes(1);
      expect(mockCtx.updateObject.mock.calls[0]?.[0]).toBe('obj-3');
    });

    it('processes batch entries in reverse order', async () => {
      const callOrder: string[] = [];
      mockCtx.deleteObject.mockImplementation((id: string) => {
        callOrder.push(`delete-${id}`);
        return Promise.resolve();
      });
      mockCtx.createObject.mockImplementation(() => {
        callOrder.push('create');
        return Promise.resolve(null);
      });

      const entry: IHistoryEntry = [
        { type: 'create', objectId: 'a', after: makeObj('a') },
        { type: 'create', objectId: 'b', after: makeObj('b') },
      ];

      await executeUndo(entry, mockCtx);
      // 'b' should be undone first (reverse order)
      expect(callOrder[0]).toBe('delete-b');
      expect(callOrder[1]).toBe('delete-a');
    });
  });

  describe('executeRedo', () => {
    it('redoes create by creating the object', async () => {
      const obj = makeObj('obj-1');
      const entry: IHistoryEntry = [
        { type: 'create', objectId: 'obj-1', after: obj },
      ];

      await executeRedo(entry, mockCtx);
      expect(mockCtx.createObject).toHaveBeenCalledTimes(1);
    });

    it('redoes delete by deleting the object', async () => {
      const entry: IHistoryEntry = [
        { type: 'delete', objectId: 'obj-2', before: makeObj('obj-2') },
      ];

      await executeRedo(entry, mockCtx);
      expect(mockCtx.deleteObject).toHaveBeenCalledWith('obj-2');
    });

    it('redoes update by applying after state', async () => {
      const before = makeObj('obj-3');
      const after = { ...before, x: 99 };
      const entry: IHistoryEntry = [
        { type: 'update', objectId: 'obj-3', before, after },
      ];

      await executeRedo(entry, mockCtx);
      expect(mockCtx.updateObject).toHaveBeenCalledTimes(1);
      expect(mockCtx.updateObject.mock.calls[0]?.[0]).toBe('obj-3');
    });
  });

  describe('undo boundaries and missing data', () => {
    it('undoes empty entry without calling context', async () => {
      await executeUndo([], mockCtx);
      expect(mockCtx.createObject).not.toHaveBeenCalled();
      expect(mockCtx.updateObject).not.toHaveBeenCalled();
      expect(mockCtx.deleteObject).not.toHaveBeenCalled();
    });

    it('skips undefined command slot in entry (sparse array)', async () => {
      const entry: IHistoryEntry = [
        { type: 'create', objectId: 'obj-1', after: makeObj('obj-1') },
        undefined as unknown as IHistoryEntry[0],
        { type: 'create', objectId: 'obj-2', after: makeObj('obj-2') },
      ];
      await executeUndo(entry, mockCtx);
      expect(mockCtx.deleteObject).toHaveBeenCalledTimes(2);
      expect(mockCtx.deleteObject).toHaveBeenCalledWith('obj-2');
      expect(mockCtx.deleteObject).toHaveBeenCalledWith('obj-1');
    });

    it('undo delete without before does not call createObject', async () => {
      const entry: IHistoryEntry = [
        { type: 'delete', objectId: 'obj-2' },
      ];
      await executeUndo(entry, mockCtx);
      expect(mockCtx.createObject).not.toHaveBeenCalled();
    });

    it('undo update without before does not call updateObject', async () => {
      const entry: IHistoryEntry = [
        { type: 'update', objectId: 'obj-3', after: makeObj('obj-3') },
      ];
      await executeUndo(entry, mockCtx);
      expect(mockCtx.updateObject).not.toHaveBeenCalled();
    });

    it('continues when a command throws (best effort)', async () => {
      mockCtx.deleteObject.mockRejectedValueOnce(new Error('external delete'));
      const entry: IHistoryEntry = [
        { type: 'create', objectId: 'a', after: makeObj('a') },
        { type: 'create', objectId: 'b', after: makeObj('b') },
      ];
      await executeUndo(entry, mockCtx);
      expect(mockCtx.deleteObject).toHaveBeenCalledWith('a');
      expect(mockCtx.deleteObject).toHaveBeenCalledWith('b');
    });
  });

  describe('redo boundaries and missing data', () => {
    it('redoes empty entry without calling context', async () => {
      await executeRedo([], mockCtx);
      expect(mockCtx.createObject).not.toHaveBeenCalled();
      expect(mockCtx.updateObject).not.toHaveBeenCalled();
      expect(mockCtx.deleteObject).not.toHaveBeenCalled();
    });

    it('redo create without after does not call createObject', async () => {
      const entry: IHistoryEntry = [
        { type: 'create', objectId: 'obj-1' },
      ];
      await executeRedo(entry, mockCtx);
      expect(mockCtx.createObject).not.toHaveBeenCalled();
    });

    it('redo update without after does not call updateObject', async () => {
      const entry: IHistoryEntry = [
        { type: 'update', objectId: 'obj-3', before: makeObj('obj-3') },
      ];
      await executeRedo(entry, mockCtx);
      expect(mockCtx.updateObject).not.toHaveBeenCalled();
    });

    it('continues when a command throws (best effort)', async () => {
      mockCtx.createObject.mockRejectedValueOnce(new Error('create failed'));
      const entry: IHistoryEntry = [
        { type: 'create', objectId: 'a', after: makeObj('a') },
        { type: 'create', objectId: 'b', after: makeObj('b') },
      ];
      await executeRedo(entry, mockCtx);
      expect(mockCtx.createObject).toHaveBeenCalledTimes(2);
    });
  });
});
