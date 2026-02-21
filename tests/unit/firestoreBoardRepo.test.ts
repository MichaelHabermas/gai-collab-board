import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { IBoardObject, ICreateObjectParams, IUpdateObjectParams } from '@/types';

const mockCreateObject = vi.fn();
const mockCreateObjectsBatch = vi.fn();
const mockUpdateObject = vi.fn();
const mockUpdateObjectsBatch = vi.fn();
const mockDeleteObject = vi.fn();
const mockDeleteObjectsBatch = vi.fn();
const mockSubscribeToObjectsWithChanges = vi.fn();

vi.mock('@/modules/sync/objectService', () => ({
  createObject: (...args: unknown[]) => mockCreateObject(...args),
  createObjectsBatch: (...args: unknown[]) => mockCreateObjectsBatch(...args),
  updateObject: (...args: unknown[]) => mockUpdateObject(...args),
  updateObjectsBatch: (...args: unknown[]) => mockUpdateObjectsBatch(...args),
  deleteObject: (...args: unknown[]) => mockDeleteObject(...args),
  deleteObjectsBatch: (...args: unknown[]) => mockDeleteObjectsBatch(...args),
  subscribeToObjectsWithChanges: (...args: unknown[]) => mockSubscribeToObjectsWithChanges(...args),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  writeBatch: vi.fn(),
  Timestamp: {
    now: () => ({ seconds: 0, nanoseconds: 0, toMillis: () => 0 }),
  },
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
}));

import { createFirestoreBoardRepo } from '@/modules/sync/firestoreBoardRepo';

const now = Timestamp.now();
const BOARD_ID = 'board-1';

const sampleObject: IBoardObject = {
  id: 'obj-1',
  type: 'sticky',
  x: 100,
  y: 200,
  width: 150,
  height: 150,
  rotation: 0,
  fill: '#fef08a',
  createdBy: 'user-1',
  createdAt: now,
  updatedAt: now,
};

describe('FirestoreBoardRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createObject delegates to objectService', async () => {
    mockCreateObject.mockResolvedValue(sampleObject);
    const repo = createFirestoreBoardRepo();
    const params: ICreateObjectParams = {
      type: 'sticky',
      x: 100,
      y: 200,
      width: 150,
      height: 150,
      fill: '#fef08a',
      createdBy: 'user-1',
    };

    const result = await repo.createObject(BOARD_ID, params);

    expect(mockCreateObject).toHaveBeenCalledWith(BOARD_ID, params);
    expect(result).toBe(sampleObject);
  });

  it('createObjectsBatch delegates to objectService', async () => {
    const objects = [sampleObject];
    mockCreateObjectsBatch.mockResolvedValue(objects);
    const repo = createFirestoreBoardRepo();
    const paramsList: ICreateObjectParams[] = [{
      type: 'sticky',
      x: 100,
      y: 200,
      width: 150,
      height: 150,
      fill: '#fef08a',
      createdBy: 'user-1',
    }];

    const result = await repo.createObjectsBatch(BOARD_ID, paramsList);

    expect(mockCreateObjectsBatch).toHaveBeenCalledWith(BOARD_ID, paramsList);
    expect(result).toBe(objects);
  });

  it('updateObject delegates to objectService', async () => {
    mockUpdateObject.mockResolvedValue(undefined);
    const repo = createFirestoreBoardRepo();
    const updates: IUpdateObjectParams = { x: 300, y: 400 };

    await repo.updateObject(BOARD_ID, 'obj-1', updates);

    expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'obj-1', updates);
  });

  it('updateObjectsBatch delegates to objectService', async () => {
    mockUpdateObjectsBatch.mockResolvedValue(undefined);
    const repo = createFirestoreBoardRepo();
    const batch = [{ objectId: 'obj-1', updates: { x: 300 } }];

    await repo.updateObjectsBatch(BOARD_ID, batch);

    expect(mockUpdateObjectsBatch).toHaveBeenCalledWith(BOARD_ID, batch);
  });

  it('deleteObject delegates to objectService', async () => {
    mockDeleteObject.mockResolvedValue(undefined);
    const repo = createFirestoreBoardRepo();

    await repo.deleteObject(BOARD_ID, 'obj-1');

    expect(mockDeleteObject).toHaveBeenCalledWith(BOARD_ID, 'obj-1');
  });

  it('deleteObjectsBatch delegates to objectService', async () => {
    mockDeleteObjectsBatch.mockResolvedValue(undefined);
    const repo = createFirestoreBoardRepo();

    await repo.deleteObjectsBatch(BOARD_ID, ['obj-1', 'obj-2']);

    expect(mockDeleteObjectsBatch).toHaveBeenCalledWith(BOARD_ID, ['obj-1', 'obj-2']);
  });

  it('subscribeToObjects delegates to subscribeToObjectsWithChanges', () => {
    const unsubFn = vi.fn();
    mockSubscribeToObjectsWithChanges.mockReturnValue(unsubFn);
    const repo = createFirestoreBoardRepo();
    const callback = vi.fn();

    const unsub = repo.subscribeToObjects(BOARD_ID, callback);

    expect(mockSubscribeToObjectsWithChanges).toHaveBeenCalledWith(BOARD_ID, callback);
    expect(unsub).toBe(unsubFn);
  });

  it('satisfies IBoardRepository interface shape', () => {
    const repo = createFirestoreBoardRepo();

    expect(typeof repo.createObject).toBe('function');
    expect(typeof repo.createObjectsBatch).toBe('function');
    expect(typeof repo.updateObject).toBe('function');
    expect(typeof repo.updateObjectsBatch).toBe('function');
    expect(typeof repo.deleteObject).toBe('function');
    expect(typeof repo.deleteObjectsBatch).toBe('function');
    expect(typeof repo.subscribeToObjects).toBe('function');
  });
});
