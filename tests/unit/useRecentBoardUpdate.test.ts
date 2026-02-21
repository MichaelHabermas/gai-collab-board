import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRecentBoardUpdate } from '@/hooks/useRecentBoardUpdate';
import { updateRecentBoardIds } from '@/modules/sync/userPreferencesService';

vi.mock('@/modules/sync/userPreferencesService', () => ({
  updateRecentBoardIds: vi.fn(),
}));

describe('useRecentBoardUpdate', () => {
  it('does nothing if user is null', () => {
    renderHook(() => useRecentBoardUpdate(null, 'board1'));
    expect(updateRecentBoardIds).not.toHaveBeenCalled();
  });

  it('does nothing if boardId is empty', () => {
    const user = { uid: 'u1' } as any;
    renderHook(() => useRecentBoardUpdate(user, ''));
    expect(updateRecentBoardIds).not.toHaveBeenCalled();
  });

  it('calls updateRecentBoardIds with correct parameters', () => {
    const user = { uid: 'u1' } as any;
    (updateRecentBoardIds as any).mockResolvedValue(undefined);
    
    renderHook(() => useRecentBoardUpdate(user, 'board1'));
    expect(updateRecentBoardIds).toHaveBeenCalledWith('u1', 'board1');
  });

  it('catches and ignores errors from updateRecentBoardIds', () => {
    const user = { uid: 'u1' } as any;
    (updateRecentBoardIds as any).mockRejectedValue(new Error('test'));
    
    // Should not throw
    expect(() => renderHook(() => useRecentBoardUpdate(user, 'board1'))).not.toThrow();
  });
});