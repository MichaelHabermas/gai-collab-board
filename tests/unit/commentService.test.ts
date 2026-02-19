import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IComment, ICreateCommentParams } from '@/types';

// Mock firebase/firestore
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockOnSnapshot = vi.fn();
let docIdCounter = 0;

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, ...pathSegments: string[]) => ({
    path: pathSegments.join('/'),
  })),
  doc: vi.fn((_refOrDb: unknown, ...pathSegments: string[]) => {
    if (pathSegments.length === 0) {
      // Auto-ID doc
      docIdCounter++;
      return { id: `comment-${docIdCounter}`, path: `auto/${docIdCounter}` };
    }
    return { id: pathSegments[pathSegments.length - 1], path: pathSegments.join('/') };
  }),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  Timestamp: {
    now: () => ({ seconds: 1000, nanoseconds: 0, toMillis: () => 1000000 }),
  },
  query: vi.fn((...args: unknown[]) => args[0]),
  orderBy: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
}));

describe('commentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    docIdCounter = 0;
  });

  it('createComment creates a comment with auto-generated ID', async () => {
    const { createComment } = await import('@/modules/sync/commentService');

    const params: ICreateCommentParams = {
      objectId: 'obj-1',
      authorId: 'user-1',
      authorDisplayName: 'Alice',
      text: 'Great work!',
    };

    const result = await createComment('board-1', params);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('comment-1');
    expect(result.objectId).toBe('obj-1');
    expect(result.authorId).toBe('user-1');
    expect(result.authorDisplayName).toBe('Alice');
    expect(result.text).toBe('Great work!');
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('createComment includes parentId for threaded replies', async () => {
    const { createComment } = await import('@/modules/sync/commentService');

    const params: ICreateCommentParams = {
      objectId: 'obj-1',
      authorId: 'user-2',
      text: 'I agree!',
      parentId: 'comment-parent',
    };

    const result = await createComment('board-1', params);

    expect(result.parentId).toBe('comment-parent');
  });

  it('deleteComment calls deleteDoc with the correct reference', async () => {
    const { deleteComment } = await import('@/modules/sync/commentService');

    await deleteComment('board-1', 'comment-42');

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });

  it('subscribeToComments calls onSnapshot and returns unsubscribe', async () => {
    const unsubFn = vi.fn();
    mockOnSnapshot.mockReturnValue(unsubFn);

    const { subscribeToComments } = await import('@/modules/sync/commentService');
    const callback = vi.fn();

    const unsub = subscribeToComments('board-1', callback);

    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
    expect(unsub).toBe(unsubFn);

    // Simulate snapshot
    const snapshotHandler = mockOnSnapshot.mock.calls[0]?.[1] as (snapshot: unknown) => void;
    const mockComments: Partial<IComment>[] = [
      { id: 'c1', objectId: 'obj-1', text: 'Hello' },
      { id: 'c2', objectId: 'obj-1', text: 'World' },
    ];
    const mockSnapshot = {
      forEach: (fn: (doc: { data: () => Partial<IComment> }) => void) => {
        mockComments.forEach((c) => fn({ data: () => c }));
      },
    };

    snapshotHandler(mockSnapshot);
    expect(callback).toHaveBeenCalledWith(mockComments);
  });
});
