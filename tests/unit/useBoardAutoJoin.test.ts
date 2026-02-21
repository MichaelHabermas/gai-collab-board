import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBoardAutoJoin } from '@/hooks/useBoardAutoJoin';
import * as boardService from '@/modules/sync/boardService';
import type { IBoard } from '@/types';

vi.mock('@/modules/sync/boardService', () => ({
  addBoardMember: vi.fn(),
  isGuestBoard: vi.fn(),
}));

describe('useBoardAutoJoin', () => {
  it('does nothing if it is a guest board', () => {
    (boardService.isGuestBoard as any).mockReturnValue(true);
    const joinedRef = { current: new Set<string>() };
    
    renderHook(() => useBoardAutoJoin({
      board: null,
      user: null,
      boardId: 'guest-1',
      joinedBoardIdsRef: joinedRef
    }));
    
    expect(boardService.addBoardMember).not.toHaveBeenCalled();
  });

  it('skips auto join if boardId matches skip ref', () => {
    (boardService.isGuestBoard as any).mockReturnValue(false);
    const joinedRef = { current: new Set<string>() };
    const skipRef = { current: 'b1' };
    
    renderHook(() => useBoardAutoJoin({
      board: null,
      user: null,
      boardId: 'b1',
      joinedBoardIdsRef: joinedRef,
      skipAutoJoinBoardIdRef: skipRef
    }));
    
    expect(boardService.addBoardMember).not.toHaveBeenCalled();
    expect(skipRef.current).toBe(null); // It should reset the skip ref
  });

  it('does not add member if user or board is null, or user already a member, or already joined', () => {
    (boardService.isGuestBoard as any).mockReturnValue(false);
    const joinedRef = { current: new Set<string>() };
    
    // User is null
    renderHook(() => useBoardAutoJoin({
      board: { id: 'b1', members: {} } as IBoard,
      user: null,
      boardId: 'b1',
      joinedBoardIdsRef: joinedRef
    }));
    
    // User is already a member
    renderHook(() => useBoardAutoJoin({
      board: { id: 'b1', members: { 'u1': 'viewer' } } as any,
      user: { uid: 'u1' } as any,
      boardId: 'b1',
      joinedBoardIdsRef: joinedRef
    }));

    // Already joined
    joinedRef.current.add('b1');
    renderHook(() => useBoardAutoJoin({
      board: { id: 'b1', members: {} } as IBoard,
      user: { uid: 'u1' } as any,
      boardId: 'b1',
      joinedBoardIdsRef: joinedRef
    }));

    expect(boardService.addBoardMember).not.toHaveBeenCalled();
  });

  it('adds member to board and tracks it in ref', () => {
    (boardService.isGuestBoard as any).mockReturnValue(false);
    const joinedRef = { current: new Set<string>() };
    (boardService.addBoardMember as any).mockResolvedValue(undefined);
    
    renderHook(() => useBoardAutoJoin({
      board: { id: 'b1', members: {} } as IBoard,
      user: { uid: 'u1' } as any,
      boardId: 'b1',
      joinedBoardIdsRef: joinedRef
    }));
    
    expect(boardService.addBoardMember).toHaveBeenCalledWith('b1', 'u1', 'viewer');
    expect(joinedRef.current.has('b1')).toBe(true);
  });

  it('removes from joined tracking if add fails', async () => {
    (boardService.isGuestBoard as any).mockReturnValue(false);
    const joinedRef = { current: new Set<string>() };
    (boardService.addBoardMember as any).mockRejectedValue(new Error('fail'));
    
    renderHook(() => useBoardAutoJoin({
      board: { id: 'b1', members: {} } as IBoard,
      user: { uid: 'u1' } as any,
      boardId: 'b1',
      joinedBoardIdsRef: joinedRef
    }));
    
    // wait for promise catch to fire
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(boardService.addBoardMember).toHaveBeenCalled();
    expect(joinedRef.current.has('b1')).toBe(false);
  });
});