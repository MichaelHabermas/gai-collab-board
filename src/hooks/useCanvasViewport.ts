import { useState, useCallback, useEffect, useRef } from 'react';
import Konva from 'konva';
import { computeViewportToFitBounds, type IBounds } from '@/lib/canvasBounds';

export interface IViewportPosition {
  x: number;
  y: number;
}

export interface IViewportScale {
  x: number;
  y: number;
}

export interface IViewportState {
  position: IViewportPosition;
  scale: IViewportScale;
  width: number;
  height: number;
}

interface IUseCanvasViewportReturn {
  viewport: IViewportState;
  handleWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  handleDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  handleTouchMove: (e: Konva.KonvaEventObject<TouchEvent>) => void;
  handleTouchEnd: () => void;
  zoomTo: (scale: number, center?: IViewportPosition) => void;
  panTo: (position: IViewportPosition) => void;
  zoomToFitBounds: (bounds: IBounds, padding?: number) => void;
  resetViewport: () => void;
}

export interface IViewportPersistState {
  position: IViewportPosition;
  scale: IViewportScale;
}

interface IUseCanvasViewportOptions {
  /** Initial position and scale (e.g. from persisted board settings). Width/height come from window. */
  initialViewport?: IViewportPersistState;
  /** Called when viewport changes (e.g. to persist). Debounce in the caller if needed. */
  onViewportChange?: (viewport: IViewportState) => void;
}

const SCALE_BY = 1.05;
const MIN_SCALE = 0.1;
const MAX_SCALE = 10;

interface ITouchState {
  lastCenter: IViewportPosition | null;
  lastDist: number;
}

/**
 * Hook for managing canvas viewport state including pan and zoom.
 * Provides handlers for wheel zoom, drag pan, and touch pinch-to-zoom.
 * Optionally accepts initial position/scale and a change callback for persistence.
 */
export const useCanvasViewport = (
  options?: IUseCanvasViewportOptions
): IUseCanvasViewportReturn => {
  const { initialViewport, onViewportChange } = options ?? {};
  const onViewportChangeRef = useRef(onViewportChange);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

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

  const touchStateRef = useRef<ITouchState>({
    lastCenter: null,
    lastDist: 0,
  });

  // Notify parent when viewport changes (for persistence). Skip initial mount and right after applying initialViewport.
  const skipNextNotifyRef = useRef(true);
  useEffect(() => {
    if (skipNextNotifyRef.current) {
      skipNextNotifyRef.current = false;
      return;
    }
    onViewportChangeRef.current?.(viewport);
  }, [viewport]);

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
        return {
          ...prev,
          position: initialViewport.position,
          scale: initialViewport.scale,
        };
      });
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initialViewport]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setViewport((prev) => ({
        ...prev,
        width: window.innerWidth,
        height: window.innerHeight,
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Wheel zoom handler - zooms centered on cursor position
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // Determine zoom direction
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY)
    );

    setViewport((prev) => ({
      ...prev,
      scale: { x: newScale, y: newScale },
      position: {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      },
    }));
  }, []);

  // Drag end handler for pan
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage || e.target !== stage) return;

    setViewport((prev) => ({
      ...prev,
      position: {
        x: stage.x(),
        y: stage.y(),
      },
    }));
  }, []);

  // Touch move handler for pinch-to-zoom
  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      if (!touch1 || !touch2) return;

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

      const lastCenter = touchStateRef.current.lastCenter;
      const scale = viewport.scale.x * (dist / touchStateRef.current.lastDist);
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

      const pointTo = {
        x: (newCenter.x - viewport.position.x) / viewport.scale.x,
        y: (newCenter.y - viewport.position.y) / viewport.scale.y,
      };

      setViewport((prev) => ({
        ...prev,
        scale: { x: clampedScale, y: clampedScale },
        position: {
          x: newCenter.x - pointTo.x * clampedScale + (newCenter.x - lastCenter.x),
          y: newCenter.y - pointTo.y * clampedScale + (newCenter.y - lastCenter.y),
        },
      }));

      touchStateRef.current = { lastCenter: newCenter, lastDist: dist };
    },
    [viewport.scale, viewport.position]
  );

  // Touch end handler
  const handleTouchEnd = useCallback(() => {
    touchStateRef.current = { lastCenter: null, lastDist: 0 };
  }, []);

  // Programmatic zoom to specific scale
  const zoomTo = useCallback(
    (scale: number, center?: IViewportPosition) => {
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      const zoomCenter = center || {
        x: viewport.width / 2,
        y: viewport.height / 2,
      };

      const pointTo = {
        x: (zoomCenter.x - viewport.position.x) / viewport.scale.x,
        y: (zoomCenter.y - viewport.position.y) / viewport.scale.y,
      };

      setViewport((prev) => ({
        ...prev,
        scale: { x: clampedScale, y: clampedScale },
        position: {
          x: zoomCenter.x - pointTo.x * clampedScale,
          y: zoomCenter.y - pointTo.y * clampedScale,
        },
      }));
    },
    [viewport]
  );

  // Programmatic pan to position
  const panTo = useCallback((position: IViewportPosition) => {
    setViewport((prev) => ({
      ...prev,
      position,
    }));
  }, []);

  // Zoom and pan so the given bounds fit in the viewport with padding
  const zoomToFitBounds = useCallback(
    (bounds: IBounds, padding: number = 40) => {
      const { scale, position } = computeViewportToFitBounds(
        viewport.width,
        viewport.height,
        bounds,
        padding
      );
      setViewport((prev) => ({
        ...prev,
        scale: { x: scale, y: scale },
        position,
      }));
    },
    [viewport.width, viewport.height]
  );

  // Reset viewport to initial state
  const resetViewport = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
    }));
  }, []);

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
