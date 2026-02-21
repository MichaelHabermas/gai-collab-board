import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCanEdit } from '@/modules/auth/useCanEdit';
import { useAuth } from '@/modules/auth/useAuth';
import * as syncModules from '@/modules/sync';
import type { IBoard } from '@/types';

// Mock dependencies
vi.mock('@/modules/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/modules/sync', () => ({
  subscribeToBoard: vi.fn(),
  getUserRole: vi.fn(),
  canUserEdit: vi.fn(),
  canUserManage: vi.fn(),
}));

describe('useCanEdit', () => {
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn();
    (useAuth as any).mockReturnValue({ user: null });
    (syncModules.subscribeToBoard as any).mockReturnValue(mockUnsubscribe);
  });

  it('returns default false values if boardId is null', () => {
    const { result } = renderHook(() => useCanEdit(null));
    
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canManage).toBe(false);
    expect(result.current.isOwner).toBe(false);
    expect(result.current.isMember).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(syncModules.subscribeToBoard).not.toHaveBeenCalled();
  });

  it('returns false values and sets loading true before board loads', () => {
    const { result } = renderHook(() => useCanEdit('board1'));
    
    expect(result.current.canEdit).toBe(false);
    expect(result.current.loading).toBe(true);
    expect(syncModules.subscribeToBoard).toHaveBeenCalledWith('board1', expect.any(Function));
  });

  it('subscribes to board and updates state when board loads', () => {
    const mockBoard = { id: 'board1', ownerId: 'owner1' } as IBoard;
    (syncModules.subscribeToBoard as any).mockImplementation((_id: string, cb: Function) => {
      cb(mockBoard);
      return mockUnsubscribe;
    });

    // User is logged out, so it should still return false for everything but loading is false
    const { result } = renderHook(() => useCanEdit('board1'));
    
    expect(result.current.canEdit).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('calculates roles and permissions correctly when user is logged in and board is loaded', () => {
    const mockBoard = { id: 'board1', ownerId: 'u1' } as IBoard;
    const mockUser = { uid: 'u1' };
    
    (useAuth as any).mockReturnValue({ user: mockUser });
    
    (syncModules.subscribeToBoard as any).mockImplementation((_id: string, cb: (board: IBoard) => void) => {
      cb(mockBoard);
      return mockUnsubscribe;
    });

    (syncModules.getUserRole as any).mockReturnValue('editor');
    (syncModules.canUserEdit as any).mockReturnValue(true);
    (syncModules.canUserManage as any).mockReturnValue(true);

    const { result } = renderHook(() => useCanEdit('board1'));
    
    expect(result.current.role).toBe('editor');
    expect(result.current.canEdit).toBe(true);
    expect(result.current.canManage).toBe(true);
    expect(result.current.isOwner).toBe(true); // u1 === ownerId
    expect(result.current.isMember).toBe(true); // role !== null
    expect(result.current.loading).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useCanEdit('board1'));
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});