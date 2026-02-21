import { describe, it, expect, beforeEach } from 'vitest';
import type { IBoardRepository, IRealtimeSyncRepository } from '@/types';
import {
  initRepository,
  getBoardRepository,
  getRealtimeSyncRepository,
} from '@/lib/repositoryProvider';

function createStubBoardRepo(): IBoardRepository {
  return {
    createObject: async () => ({}) as never,
    createObjectsBatch: async () => [],
    updateObject: async () => {},
    updateObjectsBatch: async () => {},
    deleteObject: async () => {},
    deleteObjectsBatch: async () => {},
    subscribeToObjects: () => () => {},
    fetchObjectsBatch: async () => [],
    fetchObjectsPaginated: async () => [],
    subscribeToDeltaUpdates: () => () => {},
  };
}

function createStubRealtimeRepo(): IRealtimeSyncRepository {
  return {
    publishDragUpdate: () => {},
    subscribeToDragUpdates: () => () => {},
  };
}

describe('repositoryProvider', () => {
  beforeEach(() => {
    initRepository(createStubBoardRepo());
  });

  it('getBoardRepository returns the initialized repo', () => {
    const repo = createStubBoardRepo();
    initRepository(repo);

    expect(getBoardRepository()).toBe(repo);
  });

  it('getRealtimeSyncRepository returns null when not provided', () => {
    initRepository(createStubBoardRepo());

    expect(getRealtimeSyncRepository()).toBeNull();
  });

  it('getRealtimeSyncRepository returns the repo when provided', () => {
    const realtimeRepo = createStubRealtimeRepo();
    initRepository(createStubBoardRepo(), realtimeRepo);

    expect(getRealtimeSyncRepository()).toBe(realtimeRepo);
  });

  it('IBoardRepository interface has all required methods', () => {
    const repo = getBoardRepository();

    expect(typeof repo.createObject).toBe('function');
    expect(typeof repo.createObjectsBatch).toBe('function');
    expect(typeof repo.updateObject).toBe('function');
    expect(typeof repo.updateObjectsBatch).toBe('function');
    expect(typeof repo.deleteObject).toBe('function');
    expect(typeof repo.deleteObjectsBatch).toBe('function');
    expect(typeof repo.subscribeToObjects).toBe('function');
  });

  it('IRealtimeSyncRepository interface has all required methods', () => {
    const realtimeRepo = createStubRealtimeRepo();
    initRepository(createStubBoardRepo(), realtimeRepo);

    const repo = getRealtimeSyncRepository();

    expect(repo).not.toBeNull();
    expect(typeof repo?.publishDragUpdate).toBe('function');
    expect(typeof repo?.subscribeToDragUpdates).toBe('function');
  });
});
