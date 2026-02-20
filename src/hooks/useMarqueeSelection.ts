import { useState, useCallback, useRef } from 'react';
import Konva from 'konva';
import type { IBoardObject, ISelectionRect, IPosition, IKonvaMouseEvent } from '@/types';
import { getObjectBounds } from '@/lib/canvasBounds';

const EMPTY_RECT: ISelectionRect = { visible: false, x1: 0, y1: 0, x2: 0, y2: 0 };

export interface IUseMarqueeSelectionReturn {
  selectionRect: ISelectionRect;
  isSelecting: boolean;
  selectingActiveRef: React.RefObject<boolean>;
  justDidMarqueeRef: React.RefObject<boolean>;
  onMarqueeStart: (coords: IPosition) => void;
  onMarqueeMove: (coords: IPosition) => void;
  onMarqueeEnd: (
    e: IKonvaMouseEvent,
    objects: IBoardObject[],
    getCanvasCoords: (stage: Konva.Stage, pointer: Konva.Vector2d) => IPosition,
    setSelectedIds: (ids: string[]) => void
  ) => void;
  resetMarquee: () => void;
}

export function useMarqueeSelection(): IUseMarqueeSelectionReturn {
  const [selectionRect, setSelectionRect] = useState<ISelectionRect>(EMPTY_RECT);
  const [isSelecting, setIsSelecting] = useState(false);
  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef<{ x1: number; y1: number } | null>(null);
  const justDidMarqueeRef = useRef(false);
  const selectingActiveRef = useRef(false);

  const onMarqueeStart = useCallback((coords: IPosition) => {
    selectionStartRef.current = { x1: coords.x, y1: coords.y };
    isSelectingRef.current = true;
    selectingActiveRef.current = true;
    setIsSelecting(true);
    setSelectionRect({
      visible: true,
      x1: coords.x,
      y1: coords.y,
      x2: coords.x,
      y2: coords.y,
    });
  }, []);

  const onMarqueeMove = useCallback((coords: IPosition) => {
    setSelectionRect((prev) => ({
      ...prev,
      x2: coords.x,
      y2: coords.y,
    }));
  }, []);

  const onMarqueeEnd = useCallback(
    (
      e: IKonvaMouseEvent,
      objects: IBoardObject[],
      getCanvasCoords: (stage: Konva.Stage, pointer: Konva.Vector2d) => IPosition,
      setSelectedIds: (ids: string[]) => void
    ) => {
      if (isSelectingRef.current && selectionStartRef.current) {
        const start = selectionStartRef.current;
        const stage = e.target.getStage();
        if (stage) {
          let pointer = stage.getPointerPosition();
          if (!pointer) {
            const container = stage.container();
            const rect = container.getBoundingClientRect();
            pointer = {
              x: e.evt.clientX - rect.left,
              y: e.evt.clientY - rect.top,
            };
          }

          const end = getCanvasCoords(stage, pointer);
          const selX1 = Math.min(start.x1, end.x);
          const selY1 = Math.min(start.y1, end.y);
          const selX2 = Math.max(start.x1, end.x);
          const selY2 = Math.max(start.y1, end.y);

          if (Math.abs(selX2 - selX1) > 5 && Math.abs(selY2 - selY1) > 5) {
            const selectedObjectIds = objects
              .filter((obj) => {
                const { x1: objX1, y1: objY1, x2: objX2, y2: objY2 } = getObjectBounds(obj);

                return objX1 < selX2 && objX2 > selX1 && objY1 < selY2 && objY2 > selY1;
              })
              .map((obj) => obj.id);

            setSelectedIds(selectedObjectIds);
            justDidMarqueeRef.current = true;
          }
        }
      }

      // Always reset selection state
      if (isSelectingRef.current) {
        isSelectingRef.current = false;
        selectingActiveRef.current = false;
        selectionStartRef.current = null;
        setIsSelecting(false);
        setSelectionRect(EMPTY_RECT);
      }
    },
    []
  );

  const resetMarquee = useCallback(() => {
    isSelectingRef.current = false;
    selectingActiveRef.current = false;
    selectionStartRef.current = null;
    setIsSelecting(false);
    setSelectionRect(EMPTY_RECT);
  }, []);

  return {
    selectionRect,
    isSelecting,
    selectingActiveRef,
    justDidMarqueeRef,
    onMarqueeStart,
    onMarqueeMove,
    onMarqueeEnd,
    resetMarquee,
  };
}
