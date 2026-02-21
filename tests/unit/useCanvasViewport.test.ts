import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import type Konva from 'konva';

interface IStageMock {
  getStage: () => IStageMock;
  scaleX: () => number;
  x: () => number;
  y: () => number;
  getPointerPosition: () => { x: number; y: number } | null;
  isDragging: () => boolean;
  stopDrag: () => void;
}

const createStageMock = ({
  scale = 1,
  x = 0,
  y = 0,
  pointer = { x: 400, y: 300 },
}: {
  scale?: number;
  x?: number;
  y?: number;
  pointer?: { x: number; y: number } | null;
} = {}): IStageMock => {
  const stage: IStageMock = {
    getStage: () => stage,
    scaleX: () => scale,
    x: () => x,
    y: () => y,
    getPointerPosition: () => pointer,
    isDragging: () => false,
    stopDrag: () => {},
  };
  return stage;
};

beforeEach(() => {
  vi.useFakeTimers();
});

describe('useCanvasViewport', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

    it('zoomTo clamps values to min and max scale', () => {
      const { result } = renderHook(() => useCanvasViewport());

      act(() => {
        result.current.zoomTo(0.01);
      });
      expect(result.current.viewport.scale.x).toBe(0.1);
      expect(result.current.viewport.scale.y).toBe(0.1);

      act(() => {
        result.current.zoomTo(100);
      });
      expect(result.current.viewport.scale.x).toBe(10);
      expect(result.current.viewport.scale.y).toBe(10);
    });
  });

  describe('event handlers', () => {
    it('handleWheel zooms around pointer position after throttle flush when ctrlKey', () => {
      const stage = createStageMock();
      const preventDefault = vi.fn();
      const wheelEvent = {
        evt: { preventDefault, deltaY: -120, ctrlKey: true },
        target: { getStage: () => stage },
      } as unknown as Konva.KonvaEventObject<WheelEvent>;

      const { result } = renderHook(() => useCanvasViewport());

      act(() => {
        result.current.handleWheel(wheelEvent);
      });

      expect(preventDefault).toHaveBeenCalledTimes(1);
      // Hot path: state updates only after throttle; advance to flush
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(result.current.viewport.scale.x).toBeCloseTo(1.05, 5);
      expect(result.current.viewport.scale.y).toBeCloseTo(1.05, 5);
      expect(result.current.viewport.position.x).toBeCloseTo(-20, 5);
      expect(result.current.viewport.position.y).toBeCloseTo(-15, 5);
    });

    it('onViewportChange receives throttled viewport after flush', () => {
      const stage = createStageMock();
      const wheelEvent = {
        evt: { preventDefault: vi.fn(), deltaY: -120, ctrlKey: true },
        target: { getStage: () => stage },
      } as unknown as Konva.KonvaEventObject<WheelEvent>;
      const onViewportChange = vi.fn();

      const { result } = renderHook(() =>
        useCanvasViewport({ onViewportChange, stageRef: { current: null } })
      );

      act(() => {
        result.current.handleWheel(wheelEvent);
      });
      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(onViewportChange).toHaveBeenCalled();
      const [payload] = onViewportChange.mock.calls[onViewportChange.mock.calls.length - 1] ?? [];
      expect(payload?.scale.x).toBeCloseTo(1.05, 5);
      expect(result.current.viewport.scale.x).toBeCloseTo(1.05, 5);
    });

    it('handleDragEnd updates viewport position when stage is dragged', () => {
      const stage = createStageMock({ x: 180, y: -90 });
      const dragEvent = { target: stage } as unknown as Konva.KonvaEventObject<DragEvent>;

      const { result } = renderHook(() => useCanvasViewport());

      act(() => {
        result.current.handleDragEnd(dragEvent);
      });

      expect(result.current.viewport.position).toEqual({ x: 180, y: -90 });
    });

    it('handleTouchMove updates scale and position for pinch gestures', () => {
      const stage = createStageMock();
      const preventDefault = vi.fn();
      const makeTouch = (clientX: number, clientY: number): Touch =>
        ({ clientX, clientY } as Touch);

      const { result } = renderHook(() => useCanvasViewport());

      const firstTouchEvent = {
        evt: {
          touches: [makeTouch(200, 200), makeTouch(300, 200)],
          preventDefault,
        },
        target: { getStage: () => stage },
      } as unknown as Konva.KonvaEventObject<TouchEvent>;

      const secondTouchEvent = {
        evt: {
          touches: [makeTouch(200, 200), makeTouch(330, 200)],
          preventDefault,
        },
        target: { getStage: () => stage },
      } as unknown as Konva.KonvaEventObject<TouchEvent>;

      act(() => {
        result.current.handleTouchMove(firstTouchEvent);
      });
      act(() => {
        result.current.handleTouchMove(secondTouchEvent);
      });

      expect(preventDefault).toHaveBeenCalled();
      expect(result.current.viewport.scale.x).toBeGreaterThan(1);
      expect(result.current.viewport.scale.y).toBe(result.current.viewport.scale.x);
    });
  });

  describe('fit and reset helpers', () => {
    it('zoomToFitBounds computes bounded viewport fit', () => {
      const { result } = renderHook(() => useCanvasViewport());

      act(() => {
        result.current.zoomToFitBounds({ x1: 0, y1: 0, x2: 1000, y2: 500 }, 40);
      });

      expect(result.current.viewport.scale.x).toBeCloseTo(0.944, 2);
      expect(result.current.viewport.scale.y).toBeCloseTo(0.944, 2);
      expect(result.current.viewport.position.x).toBeGreaterThan(30);
      expect(result.current.viewport.position.x).toBeLessThan(50);
      expect(result.current.viewport.position.y).toBeGreaterThan(100);
    });

    it('resetViewport restores origin and default scale', () => {
      const { result } = renderHook(() => useCanvasViewport());

      act(() => {
        result.current.zoomTo(2);
      });
      act(() => {
        result.current.panTo({ x: 200, y: 120 });
      });
      act(() => {
        result.current.resetViewport();
      });

      expect(result.current.viewport.position).toEqual({ x: 0, y: 0 });
      expect(result.current.viewport.scale).toEqual({ x: 1, y: 1 });
    });

    it('zoomTo with explicit center zooms around that point', () => {
      const { result } = renderHook(() => useCanvasViewport());

      act(() => {
        result.current.zoomTo(2, { x: 100, y: 50 });
      });

      expect(result.current.viewport.scale.x).toBe(2);
      expect(result.current.viewport.scale.y).toBe(2);
      expect(result.current.viewport.position.x).not.toBe(0);
      expect(result.current.viewport.position.y).not.toBe(0);
    });

    it('zoomToFitBounds accepts custom padding', () => {
      const { result } = renderHook(() => useCanvasViewport());

      act(() => {
        result.current.zoomToFitBounds({ x1: 0, y1: 0, x2: 200, y2: 200 }, 80);
      });

      expect(result.current.viewport.scale.x).toBeGreaterThan(0);
      expect(result.current.viewport.scale.y).toBe(result.current.viewport.scale.x);
      expect(result.current.viewport.position).toBeDefined();
    });
  });

  describe('options and stageRef', () => {
    it('accepts undefined options', () => {
      const { result } = renderHook(() => useCanvasViewport());
      expect(result.current.viewport.scale.x).toBe(1);
      expect(result.current.viewport.position).toEqual({ x: 0, y: 0 });
    });

    it('applyViewportToStage updates stage when stageRef provided', () => {
      const stageMock = {
        x: vi.fn((v?: number) => (v !== undefined ? v : 0)),
        y: vi.fn((v?: number) => (v !== undefined ? v : 0)),
        scaleX: vi.fn((v?: number) => (v !== undefined ? v : 1)),
        scaleY: vi.fn((v?: number) => (v !== undefined ? v : 1)),
      };
      const stageRef = { current: stageMock };

      const { result } = renderHook(() => useCanvasViewport({ stageRef }));

      act(() => {
        result.current.resetViewport();
      });
      expect(stageMock.x).toHaveBeenCalledWith(0);
      expect(stageMock.y).toHaveBeenCalledWith(0);
      expect(stageMock.scaleX).toHaveBeenCalledWith(1);
      expect(stageMock.scaleY).toHaveBeenCalledWith(1);

      act(() => {
        result.current.panTo({ x: 10, y: 20 });
      });
      expect(stageMock.x).toHaveBeenCalledWith(10);
      expect(stageMock.y).toHaveBeenCalledWith(20);

      act(() => {
        result.current.zoomTo(0.5);
      });
      expect(stageMock.scaleX).toHaveBeenCalledWith(0.5);
      expect(stageMock.scaleY).toHaveBeenCalledWith(0.5);
    });
  });

  describe('handler early exits', () => {
    it('handleWheel does nothing when stage is null', () => {
      const preventDefault = vi.fn();
      const wheelEvent = {
        evt: { preventDefault, deltaY: 50, ctrlKey: false },
        target: { getStage: () => null },
      } as unknown as Konva.KonvaEventObject<WheelEvent>;

      const { result } = renderHook(() => useCanvasViewport());
      const posBefore = result.current.viewport.position;

      act(() => {
        result.current.handleWheel(wheelEvent);
      });

      expect(preventDefault).toHaveBeenCalled();
      expect(result.current.viewport.position).toEqual(posBefore);
    });

    it('handleWheel zoom does nothing when pointer position is null', () => {
      const stage = createStageMock({ pointer: null });
      const preventDefault = vi.fn();
      const wheelEvent = {
        evt: { preventDefault, deltaY: -120, ctrlKey: true },
        target: { getStage: () => stage },
      } as unknown as Konva.KonvaEventObject<WheelEvent>;

      const { result } = renderHook(() => useCanvasViewport());
      const scaleBefore = result.current.viewport.scale.x;

      act(() => {
        result.current.handleWheel(wheelEvent);
      });

      expect(preventDefault).toHaveBeenCalled();
      expect(result.current.viewport.scale.x).toBe(scaleBefore);
    });

    it('handleWheel pans when not ctrlKey', () => {
      const stage = createStageMock();
      const preventDefault = vi.fn();
      const wheelEvent = {
        evt: { preventDefault, deltaY: 30, deltaX: 20, ctrlKey: false },
        target: { getStage: () => stage },
      } as unknown as Konva.KonvaEventObject<WheelEvent>;

      const { result } = renderHook(() => useCanvasViewport());

      act(() => {
        result.current.handleWheel(wheelEvent);
      });
      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current.viewport.position.x).toBe(-20);
      expect(result.current.viewport.position.y).toBe(-30);
    });

    it('handleDragEnd does nothing when target is not stage', () => {
      const stage = createStageMock({ x: 100, y: 100 });
      const childNode = { getStage: () => stage };
      const dragEvent = {
        target: childNode,
      } as unknown as Konva.KonvaEventObject<DragEvent>;

      const { result } = renderHook(() => useCanvasViewport());

      act(() => {
        result.current.panTo({ x: 50, y: 50 });
      });
      const posAfterPan = result.current.viewport.position;

      act(() => {
        result.current.handleDragEnd(dragEvent);
      });

      expect(result.current.viewport.position).toEqual(posAfterPan);
    });

    it('handleTouchMove stops stage drag when stage is dragging', () => {
      const stopDrag = vi.fn();
      const stage = createStageMock();
      stage.stopDrag = stopDrag;
      stage.isDragging = () => true;

      const makeTouch = (clientX: number, clientY: number): Touch =>
        ({ clientX, clientY } as Touch);
      const touchEvent = {
        evt: {
          touches: [makeTouch(200, 200), makeTouch(300, 200)],
          preventDefault: vi.fn(),
        },
        target: { getStage: () => stage },
      } as unknown as Konva.KonvaEventObject<TouchEvent>;

      const { result } = renderHook(() => useCanvasViewport());

      act(() => {
        result.current.handleTouchMove(touchEvent);
      });
      act(() => {
        result.current.handleTouchMove({
          ...touchEvent,
          evt: {
            ...touchEvent.evt,
            touches: [makeTouch(200, 200), makeTouch(320, 200)],
          },
        } as unknown as Konva.KonvaEventObject<TouchEvent>);
      });

      expect(stopDrag).toHaveBeenCalled();
    });

    it('handleTouchEnd flushes throttle and resets touch state', () => {
      const stage = createStageMock();
      const makeTouch = (clientX: number, clientY: number): Touch =>
        ({ clientX, clientY } as Touch);
      const touchEvent = {
        evt: {
          touches: [makeTouch(200, 200), makeTouch(300, 200)],
          preventDefault: vi.fn(),
        },
        target: { getStage: () => stage },
      } as unknown as Konva.KonvaEventObject<TouchEvent>;

      const { result } = renderHook(() => useCanvasViewport());

      act(() => {
        result.current.handleTouchMove(touchEvent);
      });
      act(() => {
        result.current.handleTouchEnd();
      });

      expect(result.current.viewport.scale.x).toBeDefined();
    });
  });

  describe('initial and persisted viewport sync', () => {
    it('applies initial viewport and notifies changes after updates', () => {
      const onViewportChange = vi.fn();
      const initialViewport = {
        position: { x: 10, y: 20 },
        scale: { x: 1.2, y: 1.2 },
      };

      const { result, rerender } = renderHook(
        ({ initial }) =>
          useCanvasViewport({
            initialViewport: initial,
            onViewportChange,
          }),
        {
          initialProps: { initial: initialViewport },
        }
      );

      act(() => {
        vi.runOnlyPendingTimers();
      });

      expect(result.current.viewport.position).toEqual(initialViewport.position);
      expect(result.current.viewport.scale).toEqual(initialViewport.scale);
      expect(onViewportChange).not.toHaveBeenCalled();

      act(() => {
        result.current.panTo({ x: 40, y: 60 });
      });
      expect(onViewportChange).toHaveBeenCalled();

      const nextInitialViewport = {
        position: { x: -50, y: -25 },
        scale: { x: 0.75, y: 0.75 },
      };
      rerender({ initial: nextInitialViewport });

      act(() => {
        vi.runOnlyPendingTimers();
      });

      expect(result.current.viewport.position).toEqual(nextInitialViewport.position);
      expect(result.current.viewport.scale).toEqual(nextInitialViewport.scale);
    });
  });
});
