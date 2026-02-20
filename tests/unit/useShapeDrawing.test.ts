import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useShapeDrawing, isDrawingTool } from '@/hooks/useShapeDrawing';
import type { IBoardObject } from '@/types';

describe('isDrawingTool', () => {
  it('returns true for drag-to-create tools', () => {
    expect(isDrawingTool('rectangle')).toBe(true);
    expect(isDrawingTool('circle')).toBe(true);
    expect(isDrawingTool('line')).toBe(true);
    expect(isDrawingTool('frame')).toBe(true);
    expect(isDrawingTool('connector')).toBe(true);
  });

  it('returns false for non-drawing tools', () => {
    expect(isDrawingTool('select')).toBe(false);
    expect(isDrawingTool('pan')).toBe(false);
    expect(isDrawingTool('sticky')).toBe(false);
    expect(isDrawingTool('text')).toBe(false);
  });
});

describe('useShapeDrawing', () => {
  const mockOnCreate = vi.fn<
    Parameters<ReturnType<typeof useShapeDrawing>['onDrawEnd']>[2]
  >();
  const mockOnSuccess = vi.fn();

  const setup = () => renderHook(() => useShapeDrawing());

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnCreate.mockResolvedValue({
      id: 'new-1',
      type: 'rectangle',
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      rotation: 0,
      fill: '#ff0000',
      createdBy: 'user-1',
    } as IBoardObject);
  });

  describe('onDrawStart', () => {
    it('sets isDrawing and captures start coordinates', () => {
      const { result } = setup();

      act(() => {
        result.current.onDrawStart({ x: 50, y: 75 });
      });

      expect(result.current.drawingState.isDrawing).toBe(true);
      expect(result.current.drawingState.startX).toBe(50);
      expect(result.current.drawingState.startY).toBe(75);
      expect(result.current.drawingActiveRef.current).toBe(true);
    });
  });

  describe('onDrawMove', () => {
    it('updates current coordinates during drag', () => {
      const { result } = setup();

      act(() => {
        result.current.onDrawStart({ x: 10, y: 10 });
      });
      act(() => {
        result.current.onDrawMove({ x: 200, y: 150 });
      });

      expect(result.current.drawingState.currentX).toBe(200);
      expect(result.current.drawingState.currentY).toBe(150);
      // Start coords unchanged
      expect(result.current.drawingState.startX).toBe(10);
      expect(result.current.drawingState.startY).toBe(10);
    });
  });

  describe('onDrawEnd', () => {
    it('creates a rectangle with correct params', async () => {
      const { result } = setup();

      act(() => {
        result.current.onDrawStart({ x: 10, y: 20 });
      });
      act(() => {
        result.current.onDrawMove({ x: 110, y: 100 });
      });

      await act(async () => {
        await result.current.onDrawEnd('rectangle', '#ff0000', mockOnCreate, mockOnSuccess);
      });

      expect(mockOnCreate).toHaveBeenCalledWith({
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        fill: '#ff0000',
        stroke: '#1e293b',
        strokeWidth: 2,
        rotation: 0,
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('creates a circle with correct params', async () => {
      const { result } = setup();

      act(() => result.current.onDrawStart({ x: 0, y: 0 }));
      act(() => result.current.onDrawMove({ x: 60, y: 60 }));

      await act(async () => {
        await result.current.onDrawEnd('circle', '#00ff00', mockOnCreate, mockOnSuccess);
      });

      expect(mockOnCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'circle', fill: '#00ff00' })
      );
    });

    it('creates a line with start/end points', async () => {
      const { result } = setup();

      act(() => result.current.onDrawStart({ x: 10, y: 20 }));
      act(() => result.current.onDrawMove({ x: 200, y: 300 }));

      await act(async () => {
        await result.current.onDrawEnd('line', '#0000ff', mockOnCreate, mockOnSuccess);
      });

      expect(mockOnCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'line',
          points: [10, 20, 200, 300],
          stroke: '#0000ff',
        })
      );
    });

    it('creates a frame with minimum size enforcement', async () => {
      const { result } = setup();

      act(() => result.current.onDrawStart({ x: 0, y: 0 }));
      act(() => result.current.onDrawMove({ x: 30, y: 30 }));

      await act(async () => {
        await result.current.onDrawEnd('frame', '#000', mockOnCreate, mockOnSuccess);
      });

      const call = mockOnCreate.mock.calls[0]?.[0];
      expect(call?.type).toBe('frame');
      // Frame enforces minimum 150x100
      expect(call?.width).toBeGreaterThanOrEqual(150);
      expect(call?.height).toBeGreaterThanOrEqual(100);
    });

    it('rejects shapes smaller than 5px in BOTH dimensions', async () => {
      const { result } = setup();

      act(() => result.current.onDrawStart({ x: 0, y: 0 }));
      act(() => result.current.onDrawMove({ x: 3, y: 3 }));

      await act(async () => {
        await result.current.onDrawEnd('rectangle', '#ff0000', mockOnCreate, mockOnSuccess);
      });

      expect(mockOnCreate).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('rejects shapes with only one dimension > 5px (degenerate shape)', async () => {
      const { result } = setup();

      // 100px wide but only 3px tall — should be rejected
      act(() => result.current.onDrawStart({ x: 0, y: 0 }));
      act(() => result.current.onDrawMove({ x: 100, y: 3 }));

      await act(async () => {
        await result.current.onDrawEnd('rectangle', '#ff0000', mockOnCreate, mockOnSuccess);
      });

      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('resets drawing state after completion', async () => {
      const { result } = setup();

      act(() => result.current.onDrawStart({ x: 0, y: 0 }));
      act(() => result.current.onDrawMove({ x: 100, y: 100 }));

      await act(async () => {
        await result.current.onDrawEnd('rectangle', '#ff0000', mockOnCreate, mockOnSuccess);
      });

      expect(result.current.drawingState.isDrawing).toBe(false);
      expect(result.current.drawingActiveRef.current).toBe(false);
    });

    it('does nothing when not currently drawing', async () => {
      const { result } = setup();
      // Don't call onDrawStart

      await act(async () => {
        await result.current.onDrawEnd('rectangle', '#ff0000', mockOnCreate, mockOnSuccess);
      });

      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('does not call onSuccess when onCreate returns null', async () => {
      mockOnCreate.mockResolvedValue(null);
      const { result } = setup();

      act(() => result.current.onDrawStart({ x: 0, y: 0 }));
      act(() => result.current.onDrawMove({ x: 100, y: 100 }));

      await act(async () => {
        await result.current.onDrawEnd('rectangle', '#ff0000', mockOnCreate, mockOnSuccess);
      });

      expect(mockOnCreate).toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('handles reverse drag direction (end before start)', async () => {
      const { result } = setup();

      // Drag from bottom-right to top-left
      act(() => result.current.onDrawStart({ x: 200, y: 200 }));
      act(() => result.current.onDrawMove({ x: 50, y: 50 }));

      await act(async () => {
        await result.current.onDrawEnd('rectangle', '#ff0000', mockOnCreate, mockOnSuccess);
      });

      const call = mockOnCreate.mock.calls[0]?.[0];
      // x/y should be the top-left corner (min values)
      expect(call?.x).toBe(50);
      expect(call?.y).toBe(50);
      expect(call?.width).toBe(150);
      expect(call?.height).toBe(150);
    });
  });

  describe('resetDrawing', () => {
    it('clears drawing state and ref', () => {
      const { result } = setup();

      act(() => result.current.onDrawStart({ x: 50, y: 50 }));
      expect(result.current.drawingState.isDrawing).toBe(true);

      act(() => result.current.resetDrawing());

      expect(result.current.drawingState.isDrawing).toBe(false);
      expect(result.current.drawingActiveRef.current).toBe(false);
    });
  });
});
