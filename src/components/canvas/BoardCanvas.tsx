import { Stage, Layer, Rect } from 'react-konva';
import { useRef, useCallback, useState, memo, type ReactElement } from 'react';
import Konva from 'konva';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import { CursorLayer } from './CursorLayer';
import { Toolbar, type ToolMode } from './Toolbar';
import { StickyNote, STICKY_COLORS } from './shapes/StickyNote';
import { useCursors } from '@/hooks/useCursors';
import type { User } from 'firebase/auth';
import type { IBoardObject } from '@/types';

interface IBoardCanvasProps {
  boardId: string;
  user: User;
  objects: IBoardObject[];
  canEdit?: boolean;
  onObjectUpdate?: (objectId: string, updates: Partial<IBoardObject>) => void;
  onObjectCreate?: (params: Partial<IBoardObject>) => void;
  onObjectDelete?: (objectId: string) => void;
}

// Grid pattern configuration
const GRID_SIZE = 50;
const GRID_COLOR = '#e2e8f0';
const GRID_STROKE_WIDTH = 1;

// Default sizes for new objects
const DEFAULT_STICKY_SIZE = { width: 200, height: 200 };

/**
 * Main canvas component with pan/zoom, grid background, and cursor sync.
 * Provides infinite canvas functionality with wheel zoom and drag pan.
 */
export const BoardCanvas = memo(
  ({
    boardId,
    user,
    objects,
    canEdit = true,
    onObjectUpdate,
    onObjectCreate,
    onObjectDelete,
  }: IBoardCanvasProps): ReactElement => {
    const stageRef = useRef<Konva.Stage>(null);
    const [activeTool, setActiveTool] = useState<ToolMode>('select');
    const [activeColor, setActiveColor] = useState<string>(STICKY_COLORS.yellow);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

    // Handle stage click for object creation or deselection
    const handleStageClick = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        // Check if clicked on empty stage
        const clickedOnEmpty = e.target === stage;

        if (clickedOnEmpty) {
          // Get click position in canvas coordinates
          const pointer = stage.getPointerPosition();
          if (!pointer) return;

          const scale = stage.scaleX();
          const canvasX = (pointer.x - stage.x()) / scale;
          const canvasY = (pointer.y - stage.y()) / scale;

          // Create new object based on active tool
          if (activeTool === 'sticky' && canEdit && onObjectCreate) {
            onObjectCreate({
              type: 'sticky',
              x: canvasX - DEFAULT_STICKY_SIZE.width / 2,
              y: canvasY - DEFAULT_STICKY_SIZE.height / 2,
              width: DEFAULT_STICKY_SIZE.width,
              height: DEFAULT_STICKY_SIZE.height,
              fill: activeColor,
              text: '',
              rotation: 0,
            });
            // Switch back to select tool after creating
            setActiveTool('select');
          } else if (activeTool === 'select') {
            // Deselect all
            setSelectedIds([]);
          }
        }
      },
      [activeTool, activeColor, canEdit, onObjectCreate]
    );

    // Handle object selection
    const handleObjectSelect = useCallback(
      (objectId: string, e?: Konva.KonvaEventObject<MouseEvent>) => {
        const metaPressed = e?.evt.shiftKey || e?.evt.ctrlKey || e?.evt.metaKey;

        if (metaPressed) {
          // Toggle selection
          setSelectedIds((prev) =>
            prev.includes(objectId) ? prev.filter((id) => id !== objectId) : [...prev, objectId]
          );
        } else {
          // Single select
          setSelectedIds([objectId]);
        }
      },
      []
    );

    // Handle object drag end
    const handleObjectDragEnd = useCallback(
      (objectId: string, x: number, y: number) => {
        onObjectUpdate?.(objectId, { x, y });
      },
      [onObjectUpdate]
    );

    // Handle text change for sticky notes
    const handleTextChange = useCallback(
      (objectId: string, text: string) => {
        onObjectUpdate?.(objectId, { text });
      },
      [onObjectUpdate]
    );

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

    // Render shape based on type
    const renderShape = useCallback(
      (obj: IBoardObject) => {
        const isSelected = selectedIds.includes(obj.id);

        switch (obj.type) {
          case 'sticky':
            return (
              <StickyNote
                key={obj.id}
                id={obj.id}
                x={obj.x}
                y={obj.y}
                width={obj.width}
                height={obj.height}
                text={obj.text || ''}
                fill={obj.fill}
                rotation={obj.rotation}
                isSelected={isSelected}
                draggable={canEdit}
                onSelect={() => handleObjectSelect(obj.id)}
                onDragEnd={(x, y) => handleObjectDragEnd(obj.id, x, y)}
                onTextChange={canEdit ? (text) => handleTextChange(obj.id, text) : undefined}
              />
            );

          // Default rectangle for other shapes (will be replaced in later stories)
          default:
            return (
              <Rect
                key={obj.id}
                id={obj.id}
                name='shape'
                x={obj.x}
                y={obj.y}
                width={obj.width}
                height={obj.height}
                fill={obj.fill}
                stroke={isSelected ? '#3b82f6' : obj.stroke}
                strokeWidth={isSelected ? 2 : obj.strokeWidth}
                rotation={obj.rotation}
                draggable={canEdit}
                onClick={() => handleObjectSelect(obj.id)}
                onTap={() => handleObjectSelect(obj.id)}
                onDragEnd={(e) => handleObjectDragEnd(obj.id, e.target.x(), e.target.y())}
              />
            );
        }
      },
      [selectedIds, canEdit, handleObjectSelect, handleObjectDragEnd, handleTextChange]
    );

    // Determine if stage should be draggable
    const isDraggable = activeTool === 'pan' || activeTool === 'select';

    return (
      <div className='w-full h-full overflow-hidden bg-white relative'>
        {/* Toolbar */}
        <Toolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          activeColor={activeColor}
          onColorChange={setActiveColor}
          canEdit={canEdit}
        />

        <Stage
          ref={stageRef}
          width={viewport.width}
          height={viewport.height}
          x={viewport.position.x}
          y={viewport.position.y}
          scaleX={viewport.scale.x}
          scaleY={viewport.scale.y}
          draggable={isDraggable}
          onWheel={handleWheel}
          onDragEnd={handleDragEnd}
          onMouseMove={handleStageMouseMove}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleStageClick}
          onTap={handleStageClick}
          style={{
            cursor:
              activeTool === 'pan' ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair',
          }}
        >
          {/* Background grid layer - static, no interaction */}
          <Layer listening={false} name='grid'>
            {renderGrid()}
          </Layer>

          {/* Objects layer - main content */}
          <Layer name='objects'>{objects.map(renderShape)}</Layer>

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
