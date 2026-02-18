import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { usePresence } from '@/hooks/usePresence';
import type { IPresenceData } from '@/modules/sync/realtimeService';

const {
  mockUpdatePresence,
  mockSubscribeToPresence,
  mockRemovePresence,
  mockSetupPresenceDisconnectHandler,
  mockGetUserColor,
} = vi.hoisted(() => ({
  mockUpdatePresence: vi.fn(),
  mockSubscribeToPresence: vi.fn(),
  mockRemovePresence: vi.fn(),
  mockSetupPresenceDisconnectHandler: vi.fn(),
  mockGetUserColor: vi.fn(),
}));

vi.mock('@/modules/sync/realtimeService', () => ({
  updatePresence: mockUpdatePresence,
  subscribeToPresence: mockSubscribeToPresence,
  removePresence: mockRemovePresence,
  setupPresenceDisconnectHandler: mockSetupPresenceDisconnectHandler,
  getUserColor: mockGetUserColor,
}));

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    uid: overrides.uid ?? 'user-1',
    displayName: overrides.displayName !== undefined ? overrides.displayName : 'User One',
    email: overrides.email !== undefined ? overrides.email : 'user@example.com',
    photoURL: overrides.photoURL !== undefined ? overrides.photoURL : 'https://example.com/avatar.png',
  }) as User;

describe('usePresence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserColor.mockReturnValue('#123456');
    mockSubscribeToPresence.mockReturnValue(vi.fn());
  });

  it('returns fallback color and does not subscribe without board or user', () => {
    const { result: noBoardResult } = renderHook(() =>
      usePresence({
        boardId: null,
        user: buildUser(),
      })
    );

    const { result: noUserResult } = renderHook(() =>
      usePresence({
        boardId: 'board-1',
        user: null,
      })
    );

    expect(noBoardResult.current.currentUserColor).toBe('#123456');
    expect(noUserResult.current.currentUserColor).toBe('#6b7280');
    expect(mockSetupPresenceDisconnectHandler).not.toHaveBeenCalled();
    expect(mockSubscribeToPresence).not.toHaveBeenCalled();
    expect(mockUpdatePresence).not.toHaveBeenCalled();
  });

  it('uses email prefix fallback for display name, filters online users, and sorts by lastSeen', () => {
    const unsubscribe = vi.fn();
    const presencePayload: Record<string, IPresenceData> = {
      a: {
        uid: 'a',
        displayName: 'A',
        photoURL: null,
        color: '#a',
        online: true,
        lastSeen: 30,
      },
      b: {
        uid: 'b',
        displayName: 'B',
        photoURL: null,
        color: '#b',
        online: false,
        lastSeen: 10,
      },
      c: {
        uid: 'c',
        displayName: 'C',
        photoURL: null,
        color: '#c',
        online: true,
        lastSeen: 20,
      },
    };

    mockSubscribeToPresence.mockImplementation(
      (_boardId: string, callback: (presence: Record<string, IPresenceData>) => void) => {
        callback(presencePayload);
        return unsubscribe;
      }
    );

    const { result, unmount } = renderHook(() =>
      usePresence({
        boardId: 'board-1',
        user: buildUser({ displayName: null, email: 'fallback@example.com' }),
      })
    );

    expect(mockSetupPresenceDisconnectHandler).toHaveBeenCalledWith('board-1', 'user-1');
    expect(mockUpdatePresence).toHaveBeenCalledWith(
      'board-1',
      'user-1',
      'fallback',
      'https://example.com/avatar.png',
      '#123456'
    );
    expect(result.current.onlineUsers.map((user) => user.uid)).toEqual(['c', 'a']);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockRemovePresence).toHaveBeenCalledWith('board-1', 'user-1');
  });

  it('falls back to Anonymous when display name and email are absent', () => {
    renderHook(() =>
      usePresence({
        boardId: 'board-2',
        user: buildUser({ displayName: null, email: null, photoURL: null }),
      })
    );

    expect(mockUpdatePresence).toHaveBeenCalledWith('board-2', 'user-1', 'Anonymous', null, '#123456');
  });
});
