import { Stage, Layer, Rect } from 'react-konva';
import { useRef, useCallback, memo, type ReactElement } from 'react';
import Konva from 'konva';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import { CursorLayer } from './CursorLayer';
import { useCursors, type Cursors } from '@/hooks/useCursors';
import type { User } from 'firebase/auth';
import type { IBoardObject } from '@/types';

interface IBoardCanvasProps {
  boardId: string;
  user: User;
  objects: IBoardObject[];
  onObjectUpdate?: (objectId: string, updates: Partial<IBoardObject>) => void;
  onObjectCreate?: (params: Partial<IBoardObject>) => void;
  onObjectDelete?: (objectId: string) => void;
}

// Grid pattern configuration
const GRID_SIZE = 50;
const GRID_COLOR = '#e2e8f0';
const GRID_STROKE_WIDTH = 1;

/**
 * Main canvas component with pan/zoom, grid background, and cursor sync.
 * Provides infinite canvas functionality with wheel zoom and drag pan.
 */
export const BoardCanvas = memo(
  ({
    boardId,
    user,
    objects,
    onObjectUpdate,
    onObjectCreate,
    onObjectDelete,
  }: IBoardCanvasProps): ReactElement => {
    const stageRef = useRef<Konva.Stage>(null);
    const { viewport, handleWheel, handleDragEnd, handleTouchMove, handleTouchEnd } =
      useCanvasViewport();

    // Cursor synchronization
    const { cursors, handleMouseMove } = useCursors({
      boardId,
      user,
    });

    // Handle mouse move for cursor sync
    const handleStageMouseMove = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        // Convert screen coordinates to canvas coordinates
        const scale = stage.scaleX();
        const canvasX = (pointer.x - stage.x()) / scale;
        const canvasY = (pointer.y - stage.y()) / scale;

        handleMouseMove(canvasX, canvasY);
      },
      [handleMouseMove]
    );

    // Handle stage click for deselection
    const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
      // Check if clicked on empty stage
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        // Deselect all - will be implemented in selection story
      }
    }, []);

    // Calculate grid lines for visible area
    const renderGrid = useCallback(() => {
      const { position, scale, width, height } = viewport;
      const gridLines: ReactElement[] = [];

      // Calculate visible bounds in canvas coordinates
      const startX = Math.floor(-position.x / scale.x / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
      const endX = Math.ceil((-position.x + width) / scale.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE;
      const startY = Math.floor(-position.y / scale.y / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
      const endY = Math.ceil((-position.y + height) / scale.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE;

      // Vertical lines
      for (let x = startX; x <= endX; x += GRID_SIZE) {
        gridLines.push(
          <Rect
            key={`v-${x}`}
            x={x}
            y={startY}
            width={GRID_STROKE_WIDTH / scale.x}
            height={endY - startY}
            fill={GRID_COLOR}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      }

      // Horizontal lines
      for (let y = startY; y <= endY; y += GRID_SIZE) {
        gridLines.push(
          <Rect
            key={`h-${y}`}
            x={startX}
            y={y}
            width={endX - startX}
            height={GRID_STROKE_WIDTH / scale.y}
            fill={GRID_COLOR}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      }

      return gridLines;
    }, [viewport]);

    return (
      <div className='w-full h-full overflow-hidden bg-white'>
        <Stage
          ref={stageRef}
          width={viewport.width}
          height={viewport.height}
          x={viewport.position.x}
          y={viewport.position.y}
          scaleX={viewport.scale.x}
          scaleY={viewport.scale.y}
          draggable
          onWheel={handleWheel}
          onDragEnd={handleDragEnd}
          onMouseMove={handleStageMouseMove}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleStageClick}
          onTap={handleStageClick}
        >
          {/* Background grid layer - static, no interaction */}
          <Layer listening={false} name='grid'>
            {renderGrid()}
          </Layer>

          {/* Objects layer - main content */}
          <Layer name='objects'>
            {/* Objects will be rendered here in subsequent stories */}
            {objects.map((obj) => (
              // Placeholder - actual shape components will be added in later stories
              <Rect
                key={obj.id}
                id={obj.id}
                x={obj.x}
                y={obj.y}
                width={obj.width}
                height={obj.height}
                fill={obj.fill}
                stroke={obj.stroke}
                strokeWidth={obj.strokeWidth}
                rotation={obj.rotation}
                draggable
                onDragEnd={(e) => {
                  onObjectUpdate?.(obj.id, {
                    x: e.target.x(),
                    y: e.target.y(),
                  });
                }}
              />
            ))}
          </Layer>

          {/* Cursor layer - other users' cursors */}
          <CursorLayer cursors={cursors} currentUid={user.uid} />

          {/* Selection layer - will be added in selection story */}
          <Layer name='selection' listening={false}>
            {/* Selection rectangle and transformer will go here */}
          </Layer>
        </Stage>

        {/* Zoom indicator */}
        <div className='absolute bottom-4 right-4 bg-slate-800/80 text-white px-3 py-1.5 rounded-md text-sm font-medium backdrop-blur-sm'>
          {Math.round(viewport.scale.x * 100)}%
        </div>
      </div>
    );
  }
);

BoardCanvas.displayName = 'BoardCanvas';
