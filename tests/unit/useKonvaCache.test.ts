import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useKonvaCache } from '@/hooks/useKonvaCache';

// Mock requestAnimationFrame / cancelAnimationFrame
let rafCallback: (() => void) | null = null;
vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
  rafCallback = cb;
  return 1;
});
vi.stubGlobal('cancelAnimationFrame', vi.fn());

describe('useKonvaCache', () => {
  const makeMockNode = (
    width = 100,
    height = 100,
    overrides: Record<string, unknown> = {}
  ) => ({
    cache: vi.fn(),
    clearCache: vi.fn(),
    getClientRect: vi.fn(() => ({ x: 0, y: 0, width, height })),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    rafCallback = null;
  });

  describe('ref forwarding', () => {
    it('forwards to function ref', () => {
      const externalRef = vi.fn();
      const { result } = renderHook(() =>
        useKonvaCache(externalRef, false, [])
      );

      const node = makeMockNode();
      result.current[0](node as never);

      expect(externalRef).toHaveBeenCalledWith(node);
      expect(result.current[1].current).toBe(node);
    });

    it('forwards to object ref', () => {
      const externalRef = { current: null };
      const { result } = renderHook(() =>
        useKonvaCache(externalRef, false, [])
      );

      const node = makeMockNode();
      result.current[0](node as never);

      expect(externalRef.current).toBe(node);
    });

    it('handles null external ref', () => {
      const { result } = renderHook(() =>
        useKonvaCache(null, false, [])
      );

      const node = makeMockNode();
      result.current[0](node as never);

      expect(result.current[1].current).toBe(node);
    });

    it('handles setting node to null', () => {
      const externalRef = vi.fn();
      const { result } = renderHook(() =>
        useKonvaCache(externalRef, false, [])
      );

      result.current[0](null as never);

      expect(externalRef).toHaveBeenCalledWith(null);
      expect(result.current[1].current).toBeNull();
    });
  });

  describe('caching behavior', () => {
    it('calls clearCache when shouldCache is false', () => {
      const node = makeMockNode();
      const { result, rerender } = renderHook(
        ({ shouldCache }) => useKonvaCache(null, shouldCache, ['dep1']),
        { initialProps: { shouldCache: true } }
      );

      // Set the node
      result.current[0](node as never);

      // Re-render with shouldCache = false to trigger effect
      rerender({ shouldCache: false });

      expect(node.clearCache).toHaveBeenCalled();
    });

    it('caches node when shouldCache is true and node fits within budget', () => {
      const node = makeMockNode(100, 100);

      const { result, rerender } = renderHook(
        ({ shouldCache }) => useKonvaCache(null, shouldCache, ['fill']),
        { initialProps: { shouldCache: false } }
      );

      result.current[0](node as never);
      
      // Re-render to trigger effect with shouldCache = true
      rerender({ shouldCache: true });

      // Trigger the rAF callback that was scheduled by the effect
      if (rafCallback) {
        rafCallback();
      }

      expect(node.cache).toHaveBeenCalledWith({ pixelRatio: 2 });
    });

    it('skips caching when node is too large (width > 2000)', () => {
      const node = makeMockNode(2001, 100);

      const { result, rerender } = renderHook(
        ({ shouldCache }) => useKonvaCache(null, shouldCache, ['fill']),
        { initialProps: { shouldCache: false } }
      );

      result.current[0](node as never);
      
      rerender({ shouldCache: true });

      // Even if rAF fires, cache should not have been called because the
      // effect returned early due to oversized dimensions
      if (rafCallback) {
        rafCallback();
      }

      expect(node.getClientRect).toHaveBeenCalledWith({ skipTransform: true });
      expect(node.cache).not.toHaveBeenCalled();
    });
    
    it('skips caching when node is too large (height > 2000)', () => {
      const node = makeMockNode(100, 2001);

      const { result, rerender } = renderHook(
        ({ shouldCache }) => useKonvaCache(null, shouldCache, ['fill']),
        { initialProps: { shouldCache: false } }
      );

      result.current[0](node as never);
      
      rerender({ shouldCache: true });

      if (rafCallback) {
        rafCallback();
      }

      expect(node.getClientRect).toHaveBeenCalledWith({ skipTransform: true });
      expect(node.cache).not.toHaveBeenCalled();
    });

    it('handles node with no cache function gracefully', () => {
      const node = {
        getClientRect: vi.fn(() => ({ x: 0, y: 0, width: 50, height: 50 })),
        clearCache: vi.fn(),
        // No cache function
      };

      const { result, rerender } = renderHook(
        ({ shouldCache }) => useKonvaCache(null, shouldCache, ['fill']),
        { initialProps: { shouldCache: false } }
      );

      result.current[0](node as never);
      rerender({ shouldCache: true });

      // Should not throw
      if (rafCallback) {
        rafCallback();
      }
    });

    it('handles null node gracefully in effect', () => {
      // Render with shouldCache=true but never set a node
      renderHook(() => useKonvaCache(null, true, ['fill']));

      // Should not throw — node is null, effect returns early
      if (rafCallback) {
        rafCallback();
      }
    });
  });
});