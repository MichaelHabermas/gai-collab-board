/**
 * Integration test: AI command flow from raw input → validate → dispatch → repository.
 * Verifies the full pipeline with a mock repository (no real Firebase).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCommandDispatcher } from '@/modules/ai/commandDispatcher';
import { validateCommand } from '@/modules/ai/commandValidator';
import { createBoardStateManager, AI_STATE_VERSION } from '@/lib/boardStateManager';
import type { IBoardRepository, IBoardObject } from '@/types';
import { Timestamp } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  Timestamp: {
    now: () => ({ seconds: 0, nanoseconds: 0, toMillis: () => 0 }),
  },
}));

function makeObject(overrides: Partial<IBoardObject> & { id: string }): IBoardObject {
  return {
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

describe('AI Command Integration', () => {
  let repo: IBoardRepository;
  let objects: IBoardObject[];

  beforeEach(() => {
    objects = [makeObject({ id: 'existing-1', text: 'First note' })];

    repo = {
      createObject: vi.fn().mockImplementation((_boardId, params) => {
        const newObj = makeObject({ id: 'created-1', ...params });
        objects.push(newObj);

        return Promise.resolve(newObj);
      }),
      createObjectsBatch: vi.fn().mockResolvedValue([]),
      updateObject: vi.fn().mockImplementation((_boardId, objectId, updates) => {
        const idx = objects.findIndex((o) => o.id === objectId);
        if (idx >= 0 && objects[idx]) {
          objects[idx] = { ...objects[idx], ...updates };
        }

        return Promise.resolve();
      }),
      updateObjectsBatch: vi.fn().mockResolvedValue(undefined),
      deleteObject: vi.fn().mockImplementation((_boardId, objectId) => {
        objects = objects.filter((o) => o.id !== objectId);

        return Promise.resolve();
      }),
      deleteObjectsBatch: vi.fn().mockResolvedValue(undefined),
      subscribeToObjects: vi.fn().mockReturnValue(() => {}),
      fetchObjectsBatch: vi.fn().mockResolvedValue([]),
      fetchObjectsPaginated: vi.fn().mockResolvedValue([]),
      subscribeToDeltaUpdates: vi.fn().mockReturnValue(() => {}),
    };
  });

  it('full CREATE flow: raw input → validate → dispatch → verify state', async () => {
    const dispatcher = createCommandDispatcher({
      boardId: 'board-1',
      createdBy: 'user-1',
      repository: repo,
      getObjects: () => objects,
    });

    const rawCommand = {
      action: 'CREATE',
      payload: {
        type: 'rectangle',
        x: 100,
        y: 200,
        width: 150,
        height: 100,
        fill: '#93c5fd',
      },
    };

    const validation = validateCommand(rawCommand);

    expect(validation.valid).toBe(true);

    const result = await dispatcher.applyRaw(rawCommand);

    expect(result.success).toBe(true);
    expect(result.objectId).toBe('created-1');
    expect(objects).toHaveLength(2);
  });

  it('full UPDATE flow: raw input → validate → dispatch → verify state', async () => {
    const dispatcher = createCommandDispatcher({
      boardId: 'board-1',
      createdBy: 'user-1',
      repository: repo,
      getObjects: () => objects,
    });

    const result = await dispatcher.applyRaw({
      action: 'UPDATE',
      payload: { objectId: 'existing-1', updates: { fill: '#ff0000', x: 300 } },
    });

    expect(result.success).toBe(true);
    expect(objects[0]?.fill).toBe('#ff0000');
    expect(objects[0]?.x).toBe(300);
  });

  it('full DELETE flow: raw input → validate → dispatch → verify state', async () => {
    const dispatcher = createCommandDispatcher({
      boardId: 'board-1',
      createdBy: 'user-1',
      repository: repo,
      getObjects: () => objects,
    });

    const result = await dispatcher.applyRaw({
      action: 'DELETE',
      payload: { objectId: 'existing-1' },
    });

    expect(result.success).toBe(true);
    expect(objects).toHaveLength(0);
  });

  it('rejects invalid command without touching repository', async () => {
    const dispatcher = createCommandDispatcher({
      boardId: 'board-1',
      createdBy: 'user-1',
      repository: repo,
      getObjects: () => objects,
    });

    const result = await dispatcher.applyRaw({
      action: 'CREATE',
      payload: { type: 'invalid-shape' },
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Validation failed/);
    expect(repo.createObject).not.toHaveBeenCalled();
    expect(objects).toHaveLength(1);
  });

  it('batch commands: CREATE then UPDATE the created object', async () => {
    const dispatcher = createCommandDispatcher({
      boardId: 'board-1',
      createdBy: 'user-1',
      repository: repo,
      getObjects: () => objects,
    });

    const results = await dispatcher.applyCommands([
      {
        action: 'CREATE',
        payload: {
          type: 'sticky',
          x: 0,
          y: 0,
          width: 200,
          height: 120,
          fill: '#fef08a',
          text: 'New note',
        },
      },
      {
        action: 'UPDATE',
        payload: { objectId: 'created-1', updates: { text: 'Updated note' } },
      },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]?.success).toBe(true);
    expect(results[1]?.success).toBe(true);
    const updated = objects.find((o) => o.id === 'created-1');

    expect(updated?.text).toBe('Updated note');
  });

  it('versioned state includes correct version after mutations', async () => {
    const provider = {
      getObjects: () => {
        const map: Record<string, IBoardObject> = {};
        for (const obj of objects) {
          map[obj.id] = obj;
        }

        return map;
      },
      getViewport: () => ({ position: { x: 0, y: 0 }, scale: { x: 1, y: 1 } }),
    };
    const stateManager = createBoardStateManager(provider);

    const before = stateManager.getVersionedStateForAI(false);

    expect(before.version).toBe(AI_STATE_VERSION);
    expect(before.elementCount).toBe(1);

    const dispatcher = createCommandDispatcher({
      boardId: 'board-1',
      createdBy: 'user-1',
      repository: repo,
      getObjects: () => objects,
    });

    await dispatcher.applyCommand({
      action: 'CREATE',
      payload: { type: 'circle', x: 50, y: 50, width: 80, height: 80, fill: '#f0f' },
    });

    const after = stateManager.getVersionedStateForAI(false);

    expect(after.version).toBe(AI_STATE_VERSION);
    expect(after.elementCount).toBe(2);
  });
});
