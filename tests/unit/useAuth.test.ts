import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/modules/auth/useAuth';
import * as authService from '@/modules/auth/authService';

vi.mock('@/modules/auth/authService', () => ({
  subscribeToAuthChanges: vi.fn(),
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  logOut: vi.fn(),
}));

describe('useAuth', () => {
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn();
    (authService.subscribeToAuthChanges as any).mockImplementation((cb: Function) => {
      cb({ uid: 'user1' });
      return mockUnsubscribe;
    });
  });

  it('subscribes to auth changes on mount', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(authService.subscribeToAuthChanges).toHaveBeenCalled();
    expect(result.current.user).toEqual({ uid: 'user1' });
    expect(result.current.loading).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useAuth());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('handles sign up', async () => {
    (authService.signUpWithEmail as any).mockResolvedValue({ user: { uid: 'user2' } });
    const { result } = renderHook(() => useAuth());

    let res: any;
    await act(async () => {
      res = await result.current.signUp('test@test.com', 'password');
    });

    expect(authService.signUpWithEmail).toHaveBeenCalledWith('test@test.com', 'password');
    expect(res.user.uid).toBe('user2');
  });

  it('handles sign up error', async () => {
    (authService.signUpWithEmail as any).mockResolvedValue({ error: 'Sign up failed' });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp('test@test.com', 'password');
    });

    expect(result.current.error).toBe('Sign up failed');
  });

  it('handles sign in', async () => {
    (authService.signInWithEmail as any).mockResolvedValue({ user: { uid: 'user3' } });
    const { result } = renderHook(() => useAuth());

    let res: any;
    await act(async () => {
      res = await result.current.signIn('test@test.com', 'password');
    });

    expect(authService.signInWithEmail).toHaveBeenCalledWith('test@test.com', 'password');
    expect(res.user.uid).toBe('user3');
  });

  it('handles sign in error', async () => {
    (authService.signInWithEmail as any).mockResolvedValue({ error: 'Sign in failed' });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn('test@test.com', 'password');
    });

    expect(result.current.error).toBe('Sign in failed');
  });

  it('handles google sign in', async () => {
    (authService.signInWithGoogle as any).mockResolvedValue({ user: { uid: 'user4' } });
    const { result } = renderHook(() => useAuth());

    let res: any;
    await act(async () => {
      res = await result.current.signInGoogle();
    });

    expect(authService.signInWithGoogle).toHaveBeenCalled();
    expect(res.user.uid).toBe('user4');
  });

  it('handles google sign in error', async () => {
    (authService.signInWithGoogle as any).mockResolvedValue({ error: 'Google sign in failed' });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signInGoogle();
    });

    expect(result.current.error).toBe('Google sign in failed');
  });

  it('handles log out', async () => {
    (authService.logOut as any).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(authService.logOut).toHaveBeenCalled();
  });

  it('clears error', async () => {
    (authService.signInWithEmail as any).mockResolvedValue({ error: 'Sign in failed' });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn('test@test.com', 'password');
    });

    expect(result.current.error).toBe('Sign in failed');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe('');
  });
});