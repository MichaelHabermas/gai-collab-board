import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBoardSubscription } from '@/hooks/useBoardSubscription';
import * as boardService from '@/modules/sync/boardService';
import type { IBoard } from '@/types';

vi.mock('@/modules/sync/boardService', () => ({
  subscribeToBoard: vi.fn(),
}));

describe('useBoardSubscription', () => {
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn();
  });

  it('does nothing if boardId is not provided', () => {
    const { result } = renderHook(() => useBoardSubscription(''));
    expect(boardService.subscribeToBoard).not.toHaveBeenCalled();
    expect(result.current.boardLoading).toBe(true);
    expect(result.current.boardError).toBe(null);
  });

  it('subscribes to board and updates state on success', () => {
    const mockBoard = { id: 'test-board', name: 'Test' } as IBoard;
    (boardService.subscribeToBoard as any).mockImplementation((_id: string, cb: Function) => {
      cb(mockBoard);
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useBoardSubscription('test-board'));

    expect(boardService.subscribeToBoard).toHaveBeenCalledWith(
      'test-board',
      expect.any(Function),
      expect.any(Function)
    );
    expect(result.current.board).toEqual(mockBoard);
    expect(result.current.boardLoading).toBe(false);
    expect(result.current.boardError).toBe(null);
  });

  it('updates state on error', () => {
    const mockError = new Error('Test Error');
    (boardService.subscribeToBoard as any).mockImplementation((_id: string, cb: Function, errorCb: Function) => {
      errorCb(mockError);
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useBoardSubscription('test-board'));

    expect(result.current.board).toBe(null);
    expect(result.current.boardLoading).toBe(false);
    expect(result.current.boardError).toEqual(mockError);
  });

  it('unsubscribes on unmount', () => {
    (boardService.subscribeToBoard as any).mockReturnValue(mockUnsubscribe);
    const { unmount } = renderHook(() => useBoardSubscription('test-board'));
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});