import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCursors } from '@/hooks/useCursors';
import type { Cursors } from '@/hooks/useCursors';
import type { User } from 'firebase/auth';

const mockUpdateCursor = vi.fn();
const mockSubscribeToCursors = vi.fn();
const mockRemoveCursor = vi.fn();
const mockSetupCursorDisconnectHandler = vi.fn();
const mockGetUserColor = vi.fn(() => '#123456');

vi.mock('@/modules/sync/realtimeService', () => ({
  updateCursor: (...args: unknown[]) => mockUpdateCursor(...args),
  subscribeToCursors: (...args: unknown[]) => mockSubscribeToCursors(...args),
  removeCursor: (...args: unknown[]) => mockRemoveCursor(...args),
  setupCursorDisconnectHandler: (...args: unknown[]) => mockSetupCursorDisconnectHandler(...args),
  getUserColor: (...args: unknown[]) => mockGetUserColor(...args),
}));

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    uid: overrides.uid ?? 'user-1',
    email: overrides.email ?? 'user@example.com',
    displayName: overrides.displayName ?? 'User One',
  }) as User;

describe('useCursors', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('subscribes to cursor stream and configures disconnect handler', () => {
    const cursors: Cursors = {
      other: {
        uid: 'other',
        x: 10,
        y: 20,
        displayName: 'Other',
        color: '#aa00aa',
        lastUpdated: 1,
      },
    };

    const unsubscribe = vi.fn();
    mockSubscribeToCursors.mockImplementation((_boardId: string, callback: (data: Cursors) => void) => {
      callback(cursors);
      return unsubscribe;
    });

    const { result, unmount } = renderHook(() =>
      useCursors({
        boardId: 'board-1',
        user: buildUser(),
      })
    );

    expect(mockGetUserColor).toHaveBeenCalledWith('user-1');
    expect(mockSetupCursorDisconnectHandler).toHaveBeenCalledWith('board-1', 'user-1');
    expect(mockSubscribeToCursors).toHaveBeenCalledWith('board-1', expect.any(Function));
    expect(result.current.cursors).toEqual(cursors);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockRemoveCursor).toHaveBeenCalledWith('board-1', 'user-1');
  });

  it('debounces high-frequency cursor updates to avoid flooding realtime writes', () => {
    mockSubscribeToCursors.mockReturnValue(vi.fn());

    const { result } = renderHook(() =>
      useCursors({
        boardId: 'board-1',
        user: buildUser({ uid: 'user-2', displayName: 'Cursor User' }),
      })
    );

    vi.setSystemTime(20);
    result.current.handleMouseMove(10, 20);
    expect(mockUpdateCursor).toHaveBeenCalledTimes(1);

    // Called within 16ms window, should be dropped.
    vi.setSystemTime(30);
    result.current.handleMouseMove(20, 40);
    expect(mockUpdateCursor).toHaveBeenCalledTimes(1);

    // Outside debounce window, should pass.
    vi.setSystemTime(50);
    result.current.handleMouseMove(30, 60);
    expect(mockUpdateCursor).toHaveBeenCalledTimes(2);

    expect(mockUpdateCursor).toHaveBeenNthCalledWith(
      2,
      'board-1',
      'user-2',
      30,
      60,
      'Cursor User',
      '#123456'
    );
  });

  it('does not update cursor when board or user is unavailable', () => {
    mockSubscribeToCursors.mockReturnValue(vi.fn());

    const { result: noBoardResult } = renderHook(() =>
      useCursors({
        boardId: null,
        user: buildUser(),
      })
    );
    noBoardResult.current.handleMouseMove(10, 10);

    const { result: noUserResult } = renderHook(() =>
      useCursors({
        boardId: 'board-1',
        user: null,
      })
    );
    noUserResult.current.handleMouseMove(20, 20);

    expect(mockUpdateCursor).not.toHaveBeenCalled();
    expect(mockSubscribeToCursors).toHaveBeenCalledTimes(0);
    expect(mockSetupCursorDisconnectHandler).toHaveBeenCalledTimes(0);
  });
});
