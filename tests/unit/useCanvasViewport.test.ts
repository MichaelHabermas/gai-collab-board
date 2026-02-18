import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';

describe('useCanvasViewport', () => {
  describe('zoom presets', () => {
    it('zoomTo sets scale to preset value', () => {
      const { result } = renderHook(() => useCanvasViewport());

      act(() => {
        result.current.zoomTo(0.5);
      });
      expect(result.current.viewport.scale.x).toBe(0.5);
      expect(result.current.viewport.scale.y).toBe(0.5);

      act(() => {
        result.current.zoomTo(1);
      });
      expect(result.current.viewport.scale.x).toBe(1);
      expect(result.current.viewport.scale.y).toBe(1);

      act(() => {
        result.current.zoomTo(2);
      });
      expect(result.current.viewport.scale.x).toBe(2);
      expect(result.current.viewport.scale.y).toBe(2);
    });
  });
});
