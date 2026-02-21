import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSidebarPrefetch } from '@/hooks/useSidebarPrefetch';

vi.mock('@/components/ai/AIChatPanel', () => ({ default: vi.fn() }));
vi.mock('@/components/canvas/PropertyInspector', () => ({ default: vi.fn() }));

describe('useSidebarPrefetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('uses requestIdleCallback when available and cleans up with cancelIdleCallback', () => {
    const prefetchCb = vi.fn<(callback: IdleRequestCallback) => number>();
    const cancelCb = vi.fn();
    const win = window as unknown as { requestIdleCallback: (cb: IdleRequestCallback) => number; cancelIdleCallback: (id: number) => void };
    win.requestIdleCallback = prefetchCb;
    win.cancelIdleCallback = cancelCb;

    const { unmount } = renderHook(() => useSidebarPrefetch());

    expect(prefetchCb).toHaveBeenCalledTimes(1);
    const args = prefetchCb.mock.calls[0];
    const callback = args?.[0];
    expect(typeof callback).toBe('function');
    unmount();
    expect(cancelCb).toHaveBeenCalledTimes(1);
  });

  it('uses setTimeout when requestIdleCallback is not available', () => {
    type WindowWithOptionalIdle = { requestIdleCallback?: unknown; cancelIdleCallback?: unknown };
    const win = window as WindowWithOptionalIdle;
    const savedRequestIdleCallback = win.requestIdleCallback;
    const savedCancelIdleCallback = win.cancelIdleCallback;
    delete win.requestIdleCallback;
    delete win.cancelIdleCallback;

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { unmount } = renderHook(() => useSidebarPrefetch());

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    vi.advanceTimersByTime(2000);

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
    win.requestIdleCallback = savedRequestIdleCallback;
    win.cancelIdleCallback = savedCancelIdleCallback;
  });
});
