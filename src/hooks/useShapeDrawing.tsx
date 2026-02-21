import { useState, useCallback, useRef, type ReactElement } from 'react';
import { Rect, Line } from 'react-konva';
import type { ToolMode, IBoardObject, IPosition } from '@/types';
import type { ICreateObjectParams } from '@/modules/sync/objectService';
import { DEFAULT_SHAPE_STROKE, DEFAULT_SHAPE_STROKE_WIDTH } from '@/lib/boardObjectDefaults';

interface IDrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const INITIAL_DRAWING_STATE: IDrawingState = {
  isDrawing: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
};

export interface IUseShapeDrawingReturn {
  drawingState: IDrawingState;
  drawingActiveRef: React.RefObject<boolean>;
  onDrawStart: (coords: IPosition) => void;
  onDrawMove: (coords: IPosition) => void;
  onDrawEnd: (
    tool: ToolMode,
    color: string,
    onCreate: (params: Omit<ICreateObjectParams, 'createdBy'>) => Promise<IBoardObject | null>,
    onSuccess: () => void
  ) => Promise<void>;
  resetDrawing: () => void;
  renderDrawingPreview: (
    tool: ToolMode,
    color: string,
    selectionColor: string
  ) => ReactElement | null;
}

/** Returns true if the tool creates a shape via drag. */
export function isDrawingTool(tool: ToolMode): boolean {
  return ['rectangle', 'circle', 'line', 'connector', 'frame'].includes(tool);
}

export function useShapeDrawing(): IUseShapeDrawingReturn {
  const [drawingState, setDrawingState] = useState<IDrawingState>(INITIAL_DRAWING_STATE);
  const drawingActiveRef = useRef(false);
  // Mirror state in a ref so onDrawEnd can read latest coords without stale closures.
  // React 18 batching can defer functional updater execution, making the old
  // "snapshot via setState side-effect" pattern unreliable.
  const drawingStateRef = useRef<IDrawingState>(INITIAL_DRAWING_STATE);

  const onDrawStart = useCallback((coords: IPosition) => {
    const next: IDrawingState = {
      isDrawing: true,
      startX: coords.x,
      startY: coords.y,
      currentX: coords.x,
      currentY: coords.y,
    };
    setDrawingState(next);
    drawingStateRef.current = next;
    drawingActiveRef.current = true;
  }, []);

  const onDrawMove = (coords: IPosition) => {
    setDrawingState((prev) => {
      const next = { ...prev, currentX: coords.x, currentY: coords.y };
      drawingStateRef.current = next;

      return next;
    });
  };

  const resetDrawing = useCallback(() => {
    setDrawingState(INITIAL_DRAWING_STATE);
    drawingStateRef.current = INITIAL_DRAWING_STATE;
    drawingActiveRef.current = false;
  }, []);

  const onDrawEnd = useCallback(
    async (
      tool: ToolMode,
      color: string,
      onCreate: (params: Omit<ICreateObjectParams, 'createdBy'>) => Promise<IBoardObject | null>,
      onSuccess: () => void
    ) => {
      const { isDrawing, startX, startY, currentX, currentY } = drawingStateRef.current;
      if (!isDrawing) return;

      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      if (width > 5 && height > 5) {
        let result: IBoardObject | null = null;

        if (tool === 'rectangle') {
          result = await onCreate({
            type: 'rectangle',
            x,
            y,
            width: Math.max(width, 20),
            height: Math.max(height, 20),
            fill: color,
            stroke: DEFAULT_SHAPE_STROKE,
            strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
            rotation: 0,
          });
        } else if (tool === 'circle') {
          result = await onCreate({
            type: 'circle',
            x,
            y,
            width: Math.max(width, 20),
            height: Math.max(height, 20),
            fill: color,
            stroke: DEFAULT_SHAPE_STROKE,
            strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
            rotation: 0,
          });
        } else if (tool === 'line') {
          result = await onCreate({
            type: 'line',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            points: [startX, startY, currentX, currentY],
            fill: 'transparent',
            stroke: color,
            strokeWidth: 3,
            rotation: 0,
          });
        } else if (tool === 'frame') {
          result = await onCreate({
            type: 'frame',
            x,
            y,
            width: Math.max(width, 150),
            height: Math.max(height, 100),
            fill: 'rgba(241, 245, 249, 0.5)',
            stroke: '#94a3b8',
            strokeWidth: 2,
            text: 'Frame',
            rotation: 0,
          });
        }

        if (result) {
          onSuccess();
        }
      }

      setDrawingState(INITIAL_DRAWING_STATE);
      drawingStateRef.current = INITIAL_DRAWING_STATE;
      drawingActiveRef.current = false;
    },
    []
  );

  const renderDrawingPreview = useCallback(
    (tool: ToolMode, color: string, selectionColor: string): ReactElement | null => {
      if (!drawingState.isDrawing) return null;

      const { startX, startY, currentX, currentY } = drawingState;
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      if (tool === 'rectangle') {
        return (
          <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={color}
            stroke={selectionColor}
            strokeWidth={DEFAULT_SHAPE_STROKE_WIDTH}
            dash={[5, 5]}
            listening={false}
          />
        );
      }

      if (tool === 'circle') {
        return (
          <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={color}
            stroke={selectionColor}
            strokeWidth={DEFAULT_SHAPE_STROKE_WIDTH}
            dash={[5, 5]}
            cornerRadius={Math.min(width, height) / 2}
            listening={false}
          />
        );
      }

      if (tool === 'line') {
        return (
          <Line
            points={[startX, startY, currentX, currentY]}
            stroke={color}
            strokeWidth={3}
            dash={[5, 5]}
            listening={false}
          />
        );
      }

      if (tool === 'frame') {
        return (
          <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill='rgba(241, 245, 249, 0.3)'
            stroke={selectionColor}
            strokeWidth={DEFAULT_SHAPE_STROKE_WIDTH}
            dash={[5, 5]}
            cornerRadius={6}
            listening={false}
          />
        );
      }

      return null;
    },
    [drawingState]
  );

  return {
    drawingState,
    drawingActiveRef,
    onDrawStart,
    onDrawMove,
    onDrawEnd,
    resetDrawing,
    renderDrawingPreview,
  };
}
