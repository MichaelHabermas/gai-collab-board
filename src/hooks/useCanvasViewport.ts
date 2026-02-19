import { useState, useCallback, useEffect, useRef, type RefObject } from 'react';
import { computeViewportToFitBounds } from '@/lib/canvasBounds';
import type {
  IPersistedViewport,
  IViewportPosition,
  IViewportState,
  IBounds,
  IKonvaWheelEvent,
  IKonvaDragEvent,
  IKonvaTouchEvent,
} from '@/types';

export type IViewportPersistState = IPersistedViewport;

/** Minimal Stage API used for imperative viewport updates (avoids importing Konva in hook). */
interface IStageRefLike {
  x: (v?: number) => number;
  y: (v?: number) => number;
  scaleX: (v?: number) => number;
  scaleY: (v?: number) => number;
}

interface IUseCanvasViewportReturn {
  viewport: IViewportState;
  handleWheel: (e: IKonvaWheelEvent) => void;
  handleDragEnd: (e: IKonvaDragEvent) => void;
  handleTouchMove: (e: IKonvaTouchEvent) => void;
  handleTouchEnd: () => void;
  zoomTo: (scale: number, center?: IViewportPosition) => void;
  panTo: (position: IViewportPosition) => void;
  zoomToFitBounds: (bounds: IBounds, padding?: number) => void;
  resetViewport: () => void;
}

interface IUseCanvasViewportOptions {
  /** Initial position and scale (e.g. from persisted board settings). Width/height come from window. */
  initialViewport?: IViewportPersistState;
  /** Called when viewport changes (e.g. to persist). Debounce in the caller if needed. */
  onViewportChange?: (viewport: IViewportState) => void;
  /** When provided, Stage transform is updated imperatively during pan/zoom to avoid React re-renders. */
  stageRef?: RefObject<IStageRefLike | null>;
}

const SCALE_BY = 1.05;
const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const VIEWPORT_THROTTLE_MS = 200;

interface ITouchState {
  lastCenter: IViewportPosition | null;
  lastDist: number;
}

/**
 * Hook for managing canvas viewport state including pan and zoom.
 * Provides handlers for wheel zoom, drag pan, and touch pinch-to-zoom.
 * Optionally accepts initial position/scale and a change callback for persistence.
 */
function applyViewportToStage(
  stageRef: RefObject<IStageRefLike | null> | undefined,
  v: IViewportState
): void {
  const stage = stageRef?.current;
  if (!stage) {
    return;
  }

  stage.x(v.position.x);
  stage.y(v.position.y);
  stage.scaleX(v.scale.x);
  stage.scaleY(v.scale.y);
}

export const useCanvasViewport = (
  options?: IUseCanvasViewportOptions
): IUseCanvasViewportReturn => {
  const { initialViewport, onViewportChange, stageRef } = options ?? {};

  const [viewport, setViewport] = useState<IViewportState>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 800;
    const height = typeof window !== 'undefined' ? window.innerHeight : 600;
    if (initialViewport) {
      return {
        position: initialViewport.position,
        scale: initialViewport.scale,
        width,
        height,
      };
    }

    return {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      width,
      height,
    };
  });

  const viewportRef = useRef<IViewportState>(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const touchStateRef = useRef<ITouchState>({
    lastCenter: null,
    lastDist: 0,
  });

  const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFlushRef = useRef<number>(0);

  const flushThrottledState = useCallback(() => {
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }

    setViewport({ ...viewportRef.current });
    lastFlushRef.current = Date.now();
  }, []);

  const scheduleThrottledFlush = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastFlushRef.current;
    if (elapsed >= VIEWPORT_THROTTLE_MS) {
      flushThrottledState();
      return;
    }

    if (throttleTimeoutRef.current) {
      return;
    }

    throttleTimeoutRef.current = setTimeout(() => {
      throttleTimeoutRef.current = null;
      flushThrottledState();
    }, VIEWPORT_THROTTLE_MS - elapsed);
  }, [flushThrottledState]);

  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }
    };
  }, []);

  // Notify parent when viewport changes (for persistence). Skip initial mount and right after applying initialViewport.
  const skipNextNotifyRef = useRef(true);
  useEffect(() => {
    if (skipNextNotifyRef.current) {
      skipNextNotifyRef.current = false;
      return;
    }

    onViewportChange?.(viewport);
  }, [viewport, onViewportChange]);

  // When initialViewport changes (e.g. board switch), reset viewport to the new initial and skip one notify
  useEffect(() => {
    if (!initialViewport) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setViewport((prev) => {
        const isSameViewport =
          prev.position.x === initialViewport.position.x &&
          prev.position.y === initialViewport.position.y &&
          prev.scale.x === initialViewport.scale.x &&
          prev.scale.y === initialViewport.scale.y;

        if (isSameViewport) {
          return prev;
        }

        skipNextNotifyRef.current = true;
        const next = {
          ...prev,
          position: initialViewport.position,
          scale: initialViewport.scale,
        };
        viewportRef.current = next;
        return next;
      });
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initialViewport]);

  // Handle window resize; keep ref in sync with state.
  useEffect(() => {
    const handleResize = () => {
      const next = {
        ...viewportRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
      };
      viewportRef.current = next;
      setViewport(next);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Wheel zoom handler - zooms centered on cursor position. Updates ref + Stage only; state via throttle.
  const handleWheel = useCallback(
    (e: IKonvaWheelEvent) => {
      e.evt.preventDefault();

      const stage = e.target.getStage();
      if (!stage) {
        return;
      }

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) {
        return;
      }

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY)
      );

      const next: IViewportState = {
        ...viewportRef.current,
        scale: { x: newScale, y: newScale },
        position: {
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        },
      };
      viewportRef.current = next;
      applyViewportToStage(stageRef, next);
      scheduleThrottledFlush();
    },
    [stageRef, scheduleThrottledFlush]
  );

  // Drag end handler for pan. Konva already moved the Stage; sync ref and state once.
  const handleDragEnd = useCallback(
    (e: IKonvaDragEvent) => {
      const stage = e.target.getStage();
      if (!stage || e.target !== stage) {
        return;
      }

      const next: IViewportState = {
        ...viewportRef.current,
        position: { x: stage.x(), y: stage.y() },
      };
      viewportRef.current = next;
      applyViewportToStage(stageRef, next);
      setViewport(next);
    },
    [stageRef]
  );

  // Touch move handler for pinch-to-zoom. Uses viewportRef; updates Stage + throttle only.
  const handleTouchMove = useCallback(
    (e: IKonvaTouchEvent) => {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      if (!touch1 || !touch2) {
        return;
      }

      e.evt.preventDefault();

      const stage = e.target.getStage();
      if (stage?.isDragging()) {
        stage.stopDrag();
      }

      const getDistance = (p1: Touch, p2: Touch): number => {
        return Math.sqrt(
          Math.pow(p2.clientX - p1.clientX, 2) + Math.pow(p2.clientY - p1.clientY, 2)
        );
      };

      const getCenter = (p1: Touch, p2: Touch): IViewportPosition => {
        return {
          x: (p1.clientX + p2.clientX) / 2,
          y: (p1.clientY + p2.clientY) / 2,
        };
      };

      const newCenter = getCenter(touch1, touch2);
      const dist = getDistance(touch1, touch2);

      if (!touchStateRef.current.lastCenter) {
        touchStateRef.current = { lastCenter: newCenter, lastDist: dist };
        return;
      }

      const { current } = viewportRef;
      const { lastCenter } = touchStateRef.current;
      const scale = current.scale.x * (dist / touchStateRef.current.lastDist);
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

      const pointTo = {
        x: (newCenter.x - current.position.x) / current.scale.x,
        y: (newCenter.y - current.position.y) / current.scale.y,
      };

      const next: IViewportState = {
        ...current,
        scale: { x: clampedScale, y: clampedScale },
        position: {
          x: newCenter.x - pointTo.x * clampedScale + (newCenter.x - lastCenter.x),
          y: newCenter.y - pointTo.y * clampedScale + (newCenter.y - lastCenter.y),
        },
      };
      viewportRef.current = next;
      applyViewportToStage(stageRef, next);
      scheduleThrottledFlush();

      touchStateRef.current = { lastCenter: newCenter, lastDist: dist };
    },
    [stageRef, scheduleThrottledFlush]
  );

  // Touch end handler: flush viewport to state so UI and persistence see final position/scale.
  const handleTouchEnd = useCallback(() => {
    touchStateRef.current = { lastCenter: null, lastDist: 0 };
    flushThrottledState();
  }, [flushThrottledState]);

  // Programmatic zoom to specific scale; sync ref and Stage.
  const zoomTo = useCallback(
    (scale: number, center?: IViewportPosition) => {
      const { current } = viewportRef;
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      const zoomCenter = center || { x: current.width / 2, y: current.height / 2 };

      const pointTo = {
        x: (zoomCenter.x - current.position.x) / current.scale.x,
        y: (zoomCenter.y - current.position.y) / current.scale.y,
      };

      const next: IViewportState = {
        ...current,
        scale: { x: clampedScale, y: clampedScale },
        position: {
          x: zoomCenter.x - pointTo.x * clampedScale,
          y: zoomCenter.y - pointTo.y * clampedScale,
        },
      };
      viewportRef.current = next;
      applyViewportToStage(stageRef, next);
      setViewport(next);
    },
    [stageRef]
  );

  // Programmatic pan to position; sync ref and Stage.
  const panTo = useCallback(
    (position: IViewportPosition) => {
      const next: IViewportState = {
        ...viewportRef.current,
        position,
      };
      viewportRef.current = next;
      applyViewportToStage(stageRef, next);
      setViewport(next);
    },
    [stageRef]
  );

  // Zoom and pan so the given bounds fit in the viewport with padding; sync ref and Stage.
  const zoomToFitBounds = useCallback(
    (bounds: IBounds, padding: number = 40) => {
      const { current } = viewportRef;
      const { scale, position } = computeViewportToFitBounds(
        current.width,
        current.height,
        bounds,
        padding
      );
      const next: IViewportState = {
        ...current,
        scale: { x: scale, y: scale },
        position,
      };
      viewportRef.current = next;
      applyViewportToStage(stageRef, next);
      setViewport(next);
    },
    [stageRef]
  );

  // Reset viewport to initial state; sync ref and Stage.
  const resetViewport = useCallback(() => {
    const next: IViewportState = {
      ...viewportRef.current,
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
    };
    viewportRef.current = next;
    applyViewportToStage(stageRef, next);
    setViewport(next);
  }, [stageRef]);

  return {
    viewport,
    handleWheel,
    handleDragEnd,
    handleTouchMove,
    handleTouchEnd,
    zoomTo,
    panTo,
    zoomToFitBounds,
    resetViewport,
  };
};
