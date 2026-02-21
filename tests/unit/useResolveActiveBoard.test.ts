import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResolveActiveBoard } from '@/hooks/useResolveActiveBoard';
import { useNavigate } from 'react-router-dom';
import * as boardService from '@/modules/sync/boardService';
import * as prefService from '@/modules/sync/userPreferencesService';
import * as activeBoardLib from '@/lib/activeBoard';
import type { IBoard, IUserPreferences } from '@/types';

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@/modules/sync/boardService', () => ({
  createBoard: vi.fn(),
  subscribeToUserBoards: vi.fn(),
}));

vi.mock('@/modules/sync/userPreferencesService', () => ({
  getUserPreferences: vi.fn(),
}));

vi.mock('@/lib/activeBoard', () => ({
  getActiveBoardId: vi.fn(),
}));

describe('useResolveActiveBoard', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate = vi.fn();
    mockUnsubscribe = vi.fn();
    (useNavigate as any).mockReturnValue(mockNavigate);
  });

  it('does nothing if user is null', () => {
    renderHook(() => useResolveActiveBoard(null));
    expect(prefService.getUserPreferences).not.toHaveBeenCalled();
    expect(boardService.subscribeToUserBoards).not.toHaveBeenCalled();
  });

  it('subscribes and loads preferences when user is provided', () => {
    const user = { uid: 'u1' } as any;
    (prefService.getUserPreferences as any).mockResolvedValue({} as IUserPreferences);
    (boardService.subscribeToUserBoards as any).mockReturnValue(mockUnsubscribe);

    renderHook(() => useResolveActiveBoard(user));

    expect(prefService.getUserPreferences).toHaveBeenCalledWith('u1');
    expect(boardService.subscribeToUserBoards).toHaveBeenCalledWith('u1', expect.any(Function));
  });

  it('navigates to active board id if resolved', async () => {
    const user = { uid: 'u1' } as any;
    const pref = {} as IUserPreferences;
    const boards = [{ id: 'b1' }] as IBoard[];
    
    (prefService.getUserPreferences as any).mockResolvedValue(pref);
    (boardService.subscribeToUserBoards as any).mockImplementation((_uid: string, cb: Function) => {
      cb(boards);
      return mockUnsubscribe;
    });
    (activeBoardLib.getActiveBoardId as any).mockReturnValue('resolved-id');

    await act(async () => {
      renderHook(() => useResolveActiveBoard(user));
      // flush promises
      await Promise.resolve();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/board/resolved-id', { replace: true });
  });

  it('creates a new board if user has no boards', async () => {
    const user = { uid: 'u1' } as any;
    const pref = {} as IUserPreferences;
    const boards = [] as IBoard[];
    
    (prefService.getUserPreferences as any).mockResolvedValue(pref);
    (boardService.subscribeToUserBoards as any).mockImplementation((_uid: string, cb: Function) => {
      cb(boards);
      return mockUnsubscribe;
    });
    (activeBoardLib.getActiveBoardId as any).mockReturnValue(null);
    (boardService.createBoard as any).mockResolvedValue({ id: 'new-board' });

    await act(async () => {
      renderHook(() => useResolveActiveBoard(user));
      await Promise.resolve();
    });

    expect(boardService.createBoard).toHaveBeenCalledWith({ name: 'Untitled Board', ownerId: 'u1' });
    expect(mockNavigate).toHaveBeenCalledWith('/board/new-board', { replace: true });
  });

  it('navigates to the first board if active id is not resolved and boards exist', async () => {
    const user = { uid: 'u1' } as any;
    const pref = {} as IUserPreferences;
    const boards = [{ id: 'first-board' }] as IBoard[];
    
    (prefService.getUserPreferences as any).mockResolvedValue(pref);
    (boardService.subscribeToUserBoards as any).mockImplementation((_uid: string, cb: Function) => {
      cb(boards);
      return mockUnsubscribe;
    });
    (activeBoardLib.getActiveBoardId as any).mockReturnValue(null);

    await act(async () => {
      renderHook(() => useResolveActiveBoard(user));
      await Promise.resolve();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/board/first-board', { replace: true });
  });

  it('handles createBoard failure gracefully', async () => {
    const user = { uid: 'u1' } as any;
    const pref = {} as IUserPreferences;
    const boards = [] as IBoard[];
    
    (prefService.getUserPreferences as any).mockResolvedValue(pref);
    (boardService.subscribeToUserBoards as any).mockImplementation((_uid: string, cb: Function) => {
      cb(boards);
      return mockUnsubscribe;
    });
    (activeBoardLib.getActiveBoardId as any).mockReturnValue(null);
    (boardService.createBoard as any).mockRejectedValue(new Error('fail'));

    await act(async () => {
      renderHook(() => useResolveActiveBoard(user));
      await Promise.resolve();
    });

    // It resets navigatedRef on catch, but shouldn't throw or navigate
    expect(boardService.createBoard).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});