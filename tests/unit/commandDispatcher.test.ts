import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCommandDispatcher } from '@/modules/ai/commandDispatcher';
import type { IBoardRepository, IBoardObject } from '@/types';
import type { AICommand } from '@/types/aiCommand';
import { Timestamp } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  Timestamp: {
    now: () => ({ seconds: 0, nanoseconds: 0, toMillis: () => 0 }),
  },
}));

function makeObject(overrides: Partial<IBoardObject> = {}): IBoardObject {
  return {
    id: 'obj-1',
    type: 'sticky',
    x: 0,
    y: 0,
    width: 200,
    height: 120,
    rotation: 0,
    fill: '#fef08a',
    createdBy: 'user-1',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

function createMockRepo(): IBoardRepository {
  return {
    createObject: vi.fn().mockResolvedValue(makeObject({ id: 'new-obj-1' })),
    createObjectsBatch: vi.fn().mockResolvedValue([]),
    updateObject: vi.fn().mockResolvedValue(undefined),
    updateObjectsBatch: vi.fn().mockResolvedValue(undefined),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    deleteObjectsBatch: vi.fn().mockResolvedValue(undefined),
    subscribeToObjects: vi.fn().mockReturnValue(() => {}),
    fetchObjectsBatch: vi.fn().mockResolvedValue([]),
    fetchObjectsPaginated: vi.fn().mockResolvedValue([]),
    subscribeToDeltaUpdates: vi.fn().mockReturnValue(() => {}),
  };
}

describe('createCommandDispatcher', () => {
  let repo: IBoardRepository;
  let objects: IBoardObject[];

  beforeEach(() => {
    repo = createMockRepo();
    objects = [makeObject({ id: 'obj-1' }), makeObject({ id: 'obj-2' })];
  });

  function makeDispatcher() {
    return createCommandDispatcher({
      boardId: 'board-1',
      createdBy: 'user-1',
      repository: repo,
      getObjects: () => objects,
    });
  }

  describe('applyCommand — CREATE', () => {
    const createCmd: AICommand = {
      action: 'CREATE',
      payload: {
        type: 'sticky',
        x: 100,
        y: 200,
        width: 200,
        height: 120,
        fill: '#fef08a',
        text: 'Hello',
      },
    };

    it('calls repository.createObject with correct params', async () => {
      const dispatcher = makeDispatcher();
      const result = await dispatcher.applyCommand(createCmd);

      expect(result.success).toBe(true);
      expect(result.action).toBe('CREATE');
      expect(result.objectId).toBe('new-obj-1');
      expect(repo.createObject).toHaveBeenCalledWith('board-1', {
        type: 'sticky',
        x: 100,
        y: 200,
        width: 200,
        height: 120,
        fill: '#fef08a',
        text: 'Hello',
        createdBy: 'user-1',
      });
    });

    it('returns error when repository throws', async () => {
      vi.mocked(repo.createObject).mockRejectedValueOnce(new Error('Firestore error'));
      const dispatcher = makeDispatcher();
      const result = await dispatcher.applyCommand(createCmd);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Firestore error');
    });
  });

  describe('applyCommand — UPDATE', () => {
    const updateCmd: AICommand = {
      action: 'UPDATE',
      payload: { objectId: 'obj-1', updates: { x: 50, fill: '#ff0000' } },
    };

    it('calls repository.updateObject with correct params', async () => {
      const dispatcher = makeDispatcher();
      const result = await dispatcher.applyCommand(updateCmd);

      expect(result.success).toBe(true);
      expect(result.action).toBe('UPDATE');
      expect(result.objectId).toBe('obj-1');
      expect(repo.updateObject).toHaveBeenCalledWith('board-1', 'obj-1', {
        x: 50,
        fill: '#ff0000',
      });
    });

    it('returns error when object not found', async () => {
      const dispatcher = makeDispatcher();
      const result = await dispatcher.applyCommand({
        action: 'UPDATE',
        payload: { objectId: 'nonexistent', updates: { x: 50 } },
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/);
      expect(repo.updateObject).not.toHaveBeenCalled();
    });

    it('returns error when repository throws', async () => {
      vi.mocked(repo.updateObject).mockRejectedValueOnce(new Error('Permission denied'));
      const dispatcher = makeDispatcher();
      const result = await dispatcher.applyCommand(updateCmd);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('applyCommand — DELETE', () => {
    const deleteCmd: AICommand = {
      action: 'DELETE',
      payload: { objectId: 'obj-2' },
    };

    it('calls repository.deleteObject with correct params', async () => {
      const dispatcher = makeDispatcher();
      const result = await dispatcher.applyCommand(deleteCmd);

      expect(result.success).toBe(true);
      expect(result.action).toBe('DELETE');
      expect(result.objectId).toBe('obj-2');
      expect(repo.deleteObject).toHaveBeenCalledWith('board-1', 'obj-2');
    });

    it('returns error when object not found', async () => {
      const dispatcher = makeDispatcher();
      const result = await dispatcher.applyCommand({
        action: 'DELETE',
        payload: { objectId: 'nonexistent' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/);
      expect(repo.deleteObject).not.toHaveBeenCalled();
    });
  });

  describe('applyCommands — batch', () => {
    it('executes commands sequentially and returns all results', async () => {
      const dispatcher = makeDispatcher();
      const commands: AICommand[] = [
        {
          action: 'CREATE',
          payload: { type: 'rectangle', x: 0, y: 0, width: 100, height: 100, fill: '#93c5fd' },
        },
        {
          action: 'UPDATE',
          payload: { objectId: 'obj-1', updates: { fill: '#ff0000' } },
        },
        {
          action: 'DELETE',
          payload: { objectId: 'obj-2' },
        },
      ];

      const results = await dispatcher.applyCommands(commands);

      expect(results).toHaveLength(3);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.action).toBe('CREATE');
      expect(results[1]?.success).toBe(true);
      expect(results[1]?.action).toBe('UPDATE');
      expect(results[2]?.success).toBe(true);
      expect(results[2]?.action).toBe('DELETE');
    });

    it('continues after a failed command', async () => {
      const dispatcher = makeDispatcher();
      const commands: AICommand[] = [
        {
          action: 'UPDATE',
          payload: { objectId: 'nonexistent', updates: { x: 0 } },
        },
        {
          action: 'DELETE',
          payload: { objectId: 'obj-1' },
        },
      ];

      const results = await dispatcher.applyCommands(commands);

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(false);
      expect(results[1]?.success).toBe(true);
    });

    it('returns empty array for empty input', async () => {
      const dispatcher = makeDispatcher();
      const results = await dispatcher.applyCommands([]);

      expect(results).toEqual([]);
    });
  });

  describe('applyRaw — validation + dispatch', () => {
    it('validates and dispatches a valid command', async () => {
      const dispatcher = makeDispatcher();
      const result = await dispatcher.applyRaw({
        action: 'CREATE',
        payload: { type: 'sticky', x: 0, y: 0, width: 200, height: 120, fill: '#fef08a' },
      });

      expect(result.success).toBe(true);
      expect(repo.createObject).toHaveBeenCalled();
    });

    it('returns validation error for invalid input', async () => {
      const dispatcher = makeDispatcher();
      const result = await dispatcher.applyRaw({ action: 'PATCH', payload: {} });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Validation failed/);
      expect(repo.createObject).not.toHaveBeenCalled();
    });

    it('returns validation error for missing fields', async () => {
      const dispatcher = makeDispatcher();
      const result = await dispatcher.applyRaw({
        action: 'CREATE',
        payload: { type: 'sticky' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Validation failed/);
    });
  });
});
