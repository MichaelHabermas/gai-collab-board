import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import * as realtimeService from '@/modules/sync/realtimeService';

vi.mock('@/modules/sync/realtimeService', () => ({
  subscribeToConnectionStatus: vi.fn(),
}));

describe('useConnectionStatus', () => {
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn();
    (realtimeService.subscribeToConnectionStatus as any).mockReturnValue(mockUnsubscribe);
  });

  it('initializes with online true and wasOffline false', () => {
    const { result } = renderHook(() => useConnectionStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
  });

  it('updates state when connection status changes to false', () => {
    let callback: (connected: boolean) => void = () => {};
    (realtimeService.subscribeToConnectionStatus as any).mockImplementation((cb: any) => {
      callback = cb;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useConnectionStatus());
    
    act(() => {
      callback(false);
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(true);
  });

  it('updates state when connection status changes back to true', () => {
    let callback: (connected: boolean) => void = () => {};
    (realtimeService.subscribeToConnectionStatus as any).mockImplementation((cb: any) => {
      callback = cb;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useConnectionStatus());
    
    act(() => {
      callback(false);
    });
    
    act(() => {
      callback(true);
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true); // Should remain true until cleared
  });

  it('clears offline flag when clearOfflineFlag is called', () => {
    let callback: (connected: boolean) => void = () => {};
    (realtimeService.subscribeToConnectionStatus as any).mockImplementation((cb: any) => {
      callback = cb;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useConnectionStatus());
    
    act(() => {
      callback(false);
    });
    
    expect(result.current.wasOffline).toBe(true);

    act(() => {
      result.current.clearOfflineFlag();
    });

    expect(result.current.wasOffline).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    (realtimeService.subscribeToConnectionStatus as any).mockReturnValue(mockUnsubscribe);
    const { unmount } = renderHook(() => useConnectionStatus());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});