import { Stage, Layer, Rect, Line } from 'react-konva';
import { useRef, useCallback, useState, memo, type ReactElement } from 'react';
import Konva from 'konva';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import { CursorLayer } from './CursorLayer';
import { Toolbar, type ToolMode } from './Toolbar';
import {
  StickyNote,
  STICKY_COLORS,
  RectangleShape,
  CircleShape,
  LineShape,
  Connector,
  TextElement,
  Frame,
} from './shapes';
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
const DEFAULT_SHAPE_SIZE = { width: 100, height: 100 };

// Drawing state for shapes
interface IDrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

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
  }: IBoardCanvasProps): ReactElement => {
    const stageRef = useRef<Konva.Stage>(null);
    const [activeTool, setActiveTool] = useState<ToolMode>('select');
    const [activeColor, setActiveColor] = useState<string>(STICKY_COLORS.yellow);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [drawingState, setDrawingState] = useState<IDrawingState>({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });

    const { viewport, handleWheel, handleDragEnd, handleTouchMove, handleTouchEnd } =
      useCanvasViewport();

    // Cursor synchronization
    const { cursors, handleMouseMove } = useCursors({
      boardId,
      user,
    });

    // Convert screen coordinates to canvas coordinates
    const getCanvasCoords = useCallback((stage: Konva.Stage, pointer: { x: number; y: number }) => {
      const scale = stage.scaleX();
      return {
        x: (pointer.x - stage.x()) / scale,
        y: (pointer.y - stage.y()) / scale,
      };
    }, []);

    // Check if tool is a drawing tool
    const isDrawingTool = useCallback((tool: ToolMode) => {
      return ['rectangle', 'circle', 'line', 'connector', 'frame'].includes(tool);
    }, []);

    // Handle mouse move for cursor sync and drawing
    const handleStageMouseMove = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const { x: canvasX, y: canvasY } = getCanvasCoords(stage, pointer);

        // Update cursor position for multiplayer
        handleMouseMove(canvasX, canvasY);

        // Update drawing preview
        if (drawingState.isDrawing) {
          setDrawingState((prev) => ({
            ...prev,
            currentX: canvasX,
            currentY: canvasY,
          }));
        }
      },
      [handleMouseMove, drawingState.isDrawing, getCanvasCoords]
    );

    // Handle mouse down for drawing start
    const handleStageMouseDown = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        // Only start drawing on empty stage with drawing tools
        const clickedOnEmpty = e.target === stage;
        if (!clickedOnEmpty || !isDrawingTool(activeTool) || !canEdit) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const { x: canvasX, y: canvasY } = getCanvasCoords(stage, pointer);

        setDrawingState({
          isDrawing: true,
          startX: canvasX,
          startY: canvasY,
          currentX: canvasX,
          currentY: canvasY,
        });
      },
      [activeTool, canEdit, isDrawingTool, getCanvasCoords]
    );

    // Handle mouse up for drawing end
    const handleStageMouseUp = useCallback(() => {
      if (!drawingState.isDrawing || !onObjectCreate) {
        return;
      }

      const { startX, startY, currentX, currentY } = drawingState;

      // Calculate dimensions
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      // Only create if size is significant
      if (width > 5 || height > 5) {
        if (activeTool === 'rectangle') {
          onObjectCreate({
            type: 'rectangle',
            x,
            y,
            width: Math.max(width, 20),
            height: Math.max(height, 20),
            fill: activeColor,
            stroke: '#1e293b',
            strokeWidth: 2,
            rotation: 0,
          });
        } else if (activeTool === 'circle') {
          onObjectCreate({
            type: 'circle',
            x,
            y,
            width: Math.max(width, 20),
            height: Math.max(height, 20),
            fill: activeColor,
            stroke: '#1e293b',
            strokeWidth: 2,
            rotation: 0,
          });
        } else if (activeTool === 'line') {
          onObjectCreate({
            type: 'line',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            points: [startX, startY, currentX, currentY],
            fill: 'transparent',
            stroke: activeColor,
            strokeWidth: 3,
            rotation: 0,
          });
        } else if (activeTool === 'connector') {
          onObjectCreate({
            type: 'connector',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            points: [startX, startY, currentX, currentY],
            fill: 'transparent',
            stroke: activeColor,
            strokeWidth: 2,
            rotation: 0,
          });
        } else if (activeTool === 'frame') {
          onObjectCreate({
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

        // Switch back to select tool
        setActiveTool('select');
      }

      // Reset drawing state
      setDrawingState({
        isDrawing: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
    }, [drawingState, activeTool, activeColor, onObjectCreate]);

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

          const { x: canvasX, y: canvasY } = getCanvasCoords(stage, pointer);

          // Create new object based on active tool (for click-to-create tools)
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
            setActiveTool('select');
          } else if (activeTool === 'text' && canEdit && onObjectCreate) {
            onObjectCreate({
              type: 'text',
              x: canvasX,
              y: canvasY,
              width: 200,
              height: 30,
              fill: activeColor === STICKY_COLORS.yellow ? '#1f2937' : activeColor,
              text: '',
              fontSize: 16,
              rotation: 0,
            });
            setActiveTool('select');
          } else if (activeTool === 'select') {
            // Deselect all
            setSelectedIds([]);
          }
        }
      },
      [activeTool, activeColor, canEdit, onObjectCreate, getCanvasCoords]
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

          case 'rectangle':
            return (
              <RectangleShape
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
                isSelected={isSelected}
                draggable={canEdit}
                onSelect={() => handleObjectSelect(obj.id)}
                onDragEnd={(x, y) => handleObjectDragEnd(obj.id, x, y)}
              />
            );

          case 'circle':
            return (
              <CircleShape
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
                isSelected={isSelected}
                draggable={canEdit}
                onSelect={() => handleObjectSelect(obj.id)}
                onDragEnd={(x, y) => handleObjectDragEnd(obj.id, x, y)}
              />
            );

          case 'line':
            return (
              <LineShape
                key={obj.id}
                id={obj.id}
                x={obj.x}
                y={obj.y}
                points={obj.points || [0, 0, 100, 100]}
                stroke={obj.stroke || obj.fill}
                strokeWidth={obj.strokeWidth}
                rotation={obj.rotation}
                isSelected={isSelected}
                draggable={canEdit}
                onSelect={() => handleObjectSelect(obj.id)}
                onDragEnd={(x, y) => handleObjectDragEnd(obj.id, x, y)}
              />
            );

          case 'connector':
            return (
              <Connector
                key={obj.id}
                id={obj.id}
                x={obj.x}
                y={obj.y}
                points={obj.points || [0, 0, 100, 100]}
                stroke={obj.stroke || obj.fill}
                strokeWidth={obj.strokeWidth}
                rotation={obj.rotation}
                isSelected={isSelected}
                draggable={canEdit}
                hasArrow={true}
                onSelect={() => handleObjectSelect(obj.id)}
                onDragEnd={(x, y) => handleObjectDragEnd(obj.id, x, y)}
              />
            );

          case 'text':
            return (
              <TextElement
                key={obj.id}
                id={obj.id}
                x={obj.x}
                y={obj.y}
                text={obj.text || ''}
                fontSize={obj.fontSize}
                fill={obj.fill}
                rotation={obj.rotation}
                isSelected={isSelected}
                draggable={canEdit}
                onSelect={() => handleObjectSelect(obj.id)}
                onDragEnd={(x, y) => handleObjectDragEnd(obj.id, x, y)}
                onTextChange={canEdit ? (text) => handleTextChange(obj.id, text) : undefined}
              />
            );

          case 'frame':
            return (
              <Frame
                key={obj.id}
                id={obj.id}
                x={obj.x}
                y={obj.y}
                width={obj.width}
                height={obj.height}
                text={obj.text || 'Frame'}
                fill={obj.fill}
                stroke={obj.stroke}
                strokeWidth={obj.strokeWidth}
                rotation={obj.rotation}
                isSelected={isSelected}
                draggable={canEdit}
                onSelect={() => handleObjectSelect(obj.id)}
                onDragEnd={(x, y) => handleObjectDragEnd(obj.id, x, y)}
                onTextChange={canEdit ? (text) => handleTextChange(obj.id, text) : undefined}
              />
            );

          // Default fallback for other shapes
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

    // Render drawing preview
    const renderDrawingPreview = useCallback(() => {
      if (!drawingState.isDrawing) return null;

      const { startX, startY, currentX, currentY } = drawingState;
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      if (activeTool === 'rectangle') {
        return (
          <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={activeColor}
            stroke='#3b82f6'
            strokeWidth={2}
            dash={[5, 5]}
            listening={false}
          />
        );
      }

      if (activeTool === 'circle') {
        return (
          <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={activeColor}
            stroke='#3b82f6'
            strokeWidth={2}
            dash={[5, 5]}
            cornerRadius={Math.min(width, height) / 2}
            listening={false}
          />
        );
      }

      if (activeTool === 'line') {
        return (
          <Line
            points={[startX, startY, currentX, currentY]}
            stroke={activeColor}
            strokeWidth={3}
            dash={[5, 5]}
            listening={false}
          />
        );
      }

      if (activeTool === 'connector') {
        return (
          <Line
            points={[startX, startY, currentX, currentY]}
            stroke={activeColor}
            strokeWidth={2}
            dash={[5, 5]}
            listening={false}
          />
        );
      }

      if (activeTool === 'frame') {
        return (
          <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill='rgba(241, 245, 249, 0.3)'
            stroke='#3b82f6'
            strokeWidth={2}
            dash={[5, 5]}
            cornerRadius={6}
            listening={false}
          />
        );
      }

      return null;
    }, [drawingState, activeTool, activeColor]);

    // Determine if stage should be draggable
    const isDraggable =
      activeTool === 'pan' || (activeTool === 'select' && !drawingState.isDrawing);

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
          onMouseDown={handleStageMouseDown}
          onMouseUp={handleStageMouseUp}
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

          {/* Drawing preview layer */}
          <Layer name='drawing' listening={false}>
            {renderDrawingPreview()}
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
