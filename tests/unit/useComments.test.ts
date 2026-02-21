import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useComments } from '@/hooks/useComments';
import * as commentService from '@/modules/sync/commentService';
import type { IComment } from '@/types';

vi.mock('@/modules/sync/commentService', () => ({
  subscribeToComments: vi.fn(),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
}));

describe('useComments', () => {
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn();
  });

  it('does nothing if boardId is not provided', () => {
    const { result } = renderHook(() => useComments({ boardId: undefined }));
    expect(commentService.subscribeToComments).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.comments).toEqual([]);
    expect(result.current.commentsError).toBe(null);
  });

  it('subscribes to comments and groups them', () => {
    const mockComments = [
      { id: 'c1', objectId: 'obj1', text: '1' },
      { id: 'c2', objectId: 'obj1', text: '2' },
      { id: 'c3', objectId: 'obj2', text: '3' },
    ] as IComment[];
    
    (commentService.subscribeToComments as any).mockImplementation((_id: string, cb: Function) => {
      cb(mockComments);
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useComments({ boardId: 'test-board' }));

    expect(commentService.subscribeToComments).toHaveBeenCalledWith(
      'test-board',
      expect.any(Function),
      expect.any(Function)
    );
    expect(result.current.comments).toEqual(mockComments);
    expect(result.current.loading).toBe(false);
    expect(result.current.commentsError).toBe(null);
    expect(result.current.commentsByObjectId.get('obj1')).toHaveLength(2);
    expect(result.current.commentsByObjectId.get('obj2')).toHaveLength(1);
  });

  it('updates state on error', () => {
    const mockError = new Error('Test Error');
    (commentService.subscribeToComments as any).mockImplementation((_id: string, _cb: Function, errorCb: Function) => {
      errorCb(mockError);
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useComments({ boardId: 'test-board' }));

    expect(result.current.comments).toEqual([]);
    expect(result.current.commentsError).toEqual(mockError);
  });

  it('unsubscribes on unmount', () => {
    (commentService.subscribeToComments as any).mockReturnValue(mockUnsubscribe);
    const { unmount } = renderHook(() => useComments({ boardId: 'test-board' }));
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('creates a comment', async () => {
    const { result } = renderHook(() => useComments({ boardId: 'test-board' }));
    const params = { objectId: 'obj1', authorId: 'u1', text: 'test' };
    (commentService.createComment as any).mockResolvedValue({ id: 'c1', ...params });

    const comment = await result.current.createComment(params);

    expect(commentService.createComment).toHaveBeenCalledWith('test-board', params);
    expect(comment?.id).toBe('c1');
  });

  it('deletes a comment', async () => {
    const { result } = renderHook(() => useComments({ boardId: 'test-board' }));
    
    await result.current.deleteComment('c1');

    expect(commentService.deleteComment).toHaveBeenCalledWith('test-board', 'c1');
  });
});