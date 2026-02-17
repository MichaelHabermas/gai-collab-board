import { Stage, Layer, Rect, Line } from 'react-konva';
import { TransformHandler, type ITransformEndAttrs } from './TransformHandler';
import { SelectionLayer, type ISelectionRect } from './SelectionLayer';
import { useRef, useCallback, useState, useEffect, useMemo, memo, type ReactElement } from 'react';
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
import { useCanvasOperations } from '@/hooks/useCanvasOperations';
import { useVisibleShapes } from '@/hooks/useVisibleShapes';
import type { User } from 'firebase/auth';
import type { IBoardObject, ConnectorAnchor, IPosition } from '@/types';
import type { ICreateObjectParams } from '@/modules/sync/objectService';
import { getAnchorPosition } from '@/lib/connectorAnchors';
import { ConnectionNodesLayer } from './ConnectionNodesLayer';

interface IBoardCanvasProps {
  boardId: string;
  user: User;
  objects: IBoardObject[];
  canEdit?: boolean;
  onObjectUpdate?: (objectId: string, updates: Partial<IBoardObject>) => void;
  onObjectCreate?: (params: Omit<ICreateObjectParams, 'createdBy'>) => Promise<IBoardObject | null>;
  onObjectDelete?: (objectId: string) => Promise<void>;
}

// Grid pattern configuration
const GRID_SIZE = 50;
const GRID_COLOR = '#e2e8f0';
const GRID_STROKE_WIDTH = 1;

// Default sizes for new objects
const DEFAULT_STICKY_SIZE = { width: 200, height: 200 };

// Minimum size for line/connector bounds when points define a degenerate box
const MIN_POINTS_BOUND_SIZE = 2;

/**
 * Returns axis-aligned bounds { x1, y1, x2, y2 } for an object.
 * For line/connector, computes bounds from points (relative to obj.x, obj.y).
 */
function getObjectBounds(obj: IBoardObject): { x1: number; y1: number; x2: number; y2: number } {
  if (
    (obj.type === 'line' || obj.type === 'connector') &&
    obj.points != null &&
    obj.points.length >= 4
  ) {
    const pts = obj.points;
    const p0 = pts[0] ?? 0;
    const p1 = pts[1] ?? 0;
    let minX = obj.x + p0;
    let maxX = obj.x + p0;
    let minY = obj.y + p1;
    let maxY = obj.y + p1;
    for (let i = 2; i + 1 < pts.length; i += 2) {
      const px = obj.x + (pts[i] ?? 0);
      const py = obj.y + (pts[i + 1] ?? 0);
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
    if (maxX - minX < MIN_POINTS_BOUND_SIZE) {
      minX -= MIN_POINTS_BOUND_SIZE / 2;
      maxX += MIN_POINTS_BOUND_SIZE / 2;
    }
    if (maxY - minY < MIN_POINTS_BOUND_SIZE) {
      minY -= MIN_POINTS_BOUND_SIZE / 2;
      maxY += MIN_POINTS_BOUND_SIZE / 2;
    }
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  }
  return {
    x1: obj.x,
    y1: obj.y,
    x2: obj.x + obj.width,
    y2: obj.y + obj.height,
  };
}

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
    onObjectDelete,
  }: IBoardCanvasProps): ReactElement => {
    const stageRef = useRef<Konva.Stage>(null);
    const objectsLayerRef = useRef<Konva.Layer>(null);
    const [activeTool, setActiveTool] = useState<ToolMode>('select');
    const activeToolRef = useRef<ToolMode>('select');
    const [activeColor, setActiveColor] = useState<string>(STICKY_COLORS.yellow);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [drawingState, setDrawingState] = useState<IDrawingState>({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
    const [selectionRect, setSelectionRect] = useState<ISelectionRect>({
      visible: false,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    });
    const [isSelecting, setIsSelecting] = useState(false);
    const isSelectingRef = useRef(false);
    const selectionStartRef = useRef<{ x1: number; y1: number } | null>(null);
    // When true, the next click is the release of a marquee; skip empty-area deselect so selection is not cleared
    const justDidMarqueeSelectionRef = useRef(false);
    const [connectorFrom, setConnectorFrom] = useState<{
      shapeId: string;
      anchor: ConnectorAnchor;
    } | null>(null);

    const { viewport, handleWheel, handleDragEnd, handleTouchMove, handleTouchEnd } =
      useCanvasViewport();

    // Filter objects to only visible ones (viewport culling)
    const visibleObjects = useVisibleShapes({ objects, viewport });

    // Linked connectors are excluded from transform (selectable for deletion only)
    const linkedConnectorIds = useMemo(
      () =>
        objects
          .filter((o) => o.type === 'connector' && o.fromObjectId != null && o.toObjectId != null)
          .map((o) => o.id),
      [objects]
    );

    // Cursor synchronization
    const { cursors, handleMouseMove } = useCursors({
      boardId,
      user,
    });

    // Keep ref in sync with state
    useEffect(() => {
      activeToolRef.current = activeTool;
    }, [activeTool]);

    // Clear selection helper
    const clearSelection = useCallback(() => {
      setSelectedIds([]);
    }, []);

    // Canvas operations (delete, duplicate, copy, paste)
    // Type assertion needed because useCanvasOperations uses a more permissive type
    useCanvasOperations({
      objects,
      selectedIds,
      onObjectCreate: (onObjectCreate as (params: Partial<IBoardObject>) => void) || (() => {}),
      onObjectDelete: (onObjectDelete as (objectId: string) => void) || (() => {}),
      clearSelection,
    });

    // Convert screen coordinates to canvas coordinates
    const getCanvasCoords = useCallback((stage: Konva.Stage, pointer: IPosition) => {
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

        // Update selection rectangle
        if (isSelecting) {
          setSelectionRect((prev) => ({
            ...prev,
            x2: canvasX,
            y2: canvasY,
          }));
        }
      },
      [handleMouseMove, drawingState.isDrawing, isSelecting, getCanvasCoords]
    );

    // Check if click is on empty area (not on a shape)
    const isEmptyAreaClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>): boolean => {
      const stage = e.target.getStage();
      if (!stage) {
        return false;
      }

      // Traverse up the node tree to find if any ancestor is a shape
      const checkIfShape = (node: Konva.Node | null): boolean => {
        if (!node) return false;
        const name = node.name?.() || '';
        if (name.includes('shape')) {
          return true;
        }
        // Check parent recursively
        return checkIfShape(node.getParent());
      };

      const targetName = e.target.name?.() || '';
      const targetClassName = e.target.getClassName();

      // Check if we clicked on a shape (including child elements)
      if (checkIfShape(e.target)) {
        return false;
      }

      // Allow clicks on: background rect, Stage, or Layer (empty areas)
      // Background rect has name 'background', Layers have className 'Layer', Stage is the stage itself
      return (
        targetName === 'background' ||
        e.target === stage ||
        targetClassName === 'Layer' ||
        (targetClassName === 'Rect' && targetName === 'background')
      );
    }, []);

    // Handle mouse down for drawing start or selection start
    const handleStageMouseDown = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        if (!isEmptyAreaClick(e)) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const { x: canvasX, y: canvasY } = getCanvasCoords(stage, pointer);

        // Start drawing if using a drawing tool (connector uses node clicks, not drag)
        if (isDrawingTool(activeTool) && activeTool !== 'connector' && canEdit) {
          setDrawingState({
            isDrawing: true,
            startX: canvasX,
            startY: canvasY,
            currentX: canvasX,
            currentY: canvasY,
          });
          return;
        }

        // Start drag-to-select if using select tool
        if (activeTool === 'select') {
          selectionStartRef.current = { x1: canvasX, y1: canvasY };
          isSelectingRef.current = true;
          setIsSelecting(true);
          setSelectionRect({
            visible: true,
            x1: canvasX,
            y1: canvasY,
            x2: canvasX,
            y2: canvasY,
          });
        }
      },
      [activeTool, canEdit, isDrawingTool, getCanvasCoords, isEmptyAreaClick]
    );

    // Handle mouse up for drawing end and selection completion
    const handleStageMouseUp = useCallback(
      async (e: Konva.KonvaEventObject<MouseEvent>) => {
        // Handle drawing completion if we were drawing
        if (drawingState.isDrawing && onObjectCreate) {
          const { startX, startY, currentX, currentY } = drawingState;

          // Calculate dimensions
          const x = Math.min(startX, currentX);
          const y = Math.min(startY, currentY);
          const width = Math.abs(currentX - startX);
          const height = Math.abs(currentY - startY);

          // Only create if size is significant
          if (width > 5 || height > 5) {
            let result: IBoardObject | null = null;

            if (activeTool === 'rectangle') {
              result = await onObjectCreate({
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
              result = await onObjectCreate({
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
              result = await onObjectCreate({
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
            } else if (activeTool === 'frame') {
              result = await onObjectCreate({
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

            // Only switch back to select tool if object was successfully created
            if (result) {
              setActiveTool('select');
              activeToolRef.current = 'select';
            }
          }

          // Reset drawing state
          setDrawingState({
            isDrawing: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
          });
        }

        // Handle selection rectangle completion using refs + event (avoids stale state)
        // Use isSelectingRef so we don't rely on isSelecting state which may not have flushed yet
        if (isSelectingRef.current && selectionStartRef.current) {
          const start = selectionStartRef.current;
          const stage = e.target.getStage();
          if (stage) {
            // getPointerPosition() can be null on mouseup; fallback to native event
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

            // Only select if the rectangle has meaningful size
            if (Math.abs(selX2 - selX1) > 5 && Math.abs(selY2 - selY1) > 5) {
              const selectedObjectIds = objects
                .filter((obj) => {
                  const { x1: objX1, y1: objY1, x2: objX2, y2: objY2 } = getObjectBounds(obj);
                  return objX1 < selX2 && objX2 > selX1 && objY1 < selY2 && objY2 > selY1;
                })
                .map((obj) => obj.id);

              setSelectedIds(selectedObjectIds);
              justDidMarqueeSelectionRef.current = true;
            }
          }
        }

        // Always reset selection state on mouse up (use ref so we clear when we were selecting)
        if (isSelectingRef.current) {
          isSelectingRef.current = false;
          selectionStartRef.current = null;
          setIsSelecting(false);
          setSelectionRect({
            visible: false,
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0,
          });
        }
      },
      [drawingState, activeTool, activeColor, onObjectCreate, objects, getCanvasCoords]
    );

    // Handle stage click for object creation or deselection
    const handleStageClick = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) {
          return;
        }
        // Click that follows marquee release on empty area must not clear selection
        if (justDidMarqueeSelectionRef.current) {
          justDidMarqueeSelectionRef.current = false;
          return;
        }

        const isEmpty = isEmptyAreaClick(e);

        if (isEmpty) {
          // Get click position in canvas coordinates
          const pointer = stage.getPointerPosition();
          if (!pointer) {
            return;
          }

          const { x: canvasX, y: canvasY } = getCanvasCoords(stage, pointer);
          // Use ref to get the tool at the time of click (avoids stale closure issues)
          const toolAtClick = activeToolRef.current;

          // Create new object based on active tool (for click-to-create tools)
          if ((toolAtClick === 'sticky' || activeTool === 'sticky') && canEdit && onObjectCreate) {
            const params = {
              type: 'sticky' as const,
              x: canvasX - DEFAULT_STICKY_SIZE.width / 2,
              y: canvasY - DEFAULT_STICKY_SIZE.height / 2,
              width: DEFAULT_STICKY_SIZE.width,
              height: DEFAULT_STICKY_SIZE.height,
              fill: activeColor,
              text: '',
              rotation: 0,
            };

            // Call async function but handle it properly
            onObjectCreate(params)
              .then(() => {
                // Switch back to select tool after creation attempt
                // (regardless of success/failure to allow user to try again)
                setActiveTool('select');
                activeToolRef.current = 'select';
              })
              .catch(() => {
                // On error, still switch back to select
                setActiveTool('select');
                activeToolRef.current = 'select';
              });
          } else if (
            (toolAtClick === 'text' || activeTool === 'text') &&
            canEdit &&
            onObjectCreate
          ) {
            const params = {
              type: 'text' as const,
              x: canvasX,
              y: canvasY,
              width: 200,
              height: 30,
              fill: activeColor === STICKY_COLORS.yellow ? '#1f2937' : activeColor,
              text: '',
              fontSize: 16,
              rotation: 0,
            };

            onObjectCreate(params)
              .then(() => {
                // Switch back to select tool after creation attempt
                setActiveTool('select');
                activeToolRef.current = 'select';
              })
              .catch((error) => {
                console.error('[DEBUG] Error creating text element:', error);
                // On error, still switch back to select
                setActiveTool('select');
                activeToolRef.current = 'select';
              });
          } else if (activeTool === 'select') {
            // Deselect all
            setSelectedIds([]);
          } else if (activeTool === 'connector') {
            // Cancel connector flow on empty area click
            setConnectorFrom(null);
          }
        }
      },
      [activeTool, activeColor, canEdit, onObjectCreate, getCanvasCoords, isEmptyAreaClick]
    );

    // Handle connector node click (two-click flow: first node = from, second = to; same shape cancels)
    const handleConnectorNodeClick = useCallback(
      (shapeId: string, anchor: ConnectorAnchor) => {
        if (!connectorFrom) {
          setConnectorFrom({ shapeId, anchor });
          return;
        }
        if (connectorFrom.shapeId === shapeId) {
          setConnectorFrom(null);
          return;
        }
        const fromObj = objects.find((o) => o.id === connectorFrom.shapeId);
        const toObj = objects.find((o) => o.id === shapeId);
        if (!fromObj || !toObj || !onObjectCreate) {
          setConnectorFrom(null);
          return;
        }
        const fromPos = getAnchorPosition(fromObj, connectorFrom.anchor);
        const toPos = getAnchorPosition(toObj, anchor);
        onObjectCreate({
          type: 'connector',
          x: fromPos.x,
          y: fromPos.y,
          width: 0,
          height: 0,
          points: [0, 0, toPos.x - fromPos.x, toPos.y - fromPos.y],
          fill: 'transparent',
          stroke: activeColor,
          strokeWidth: 2,
          rotation: 0,
          fromObjectId: connectorFrom.shapeId,
          toObjectId: shapeId,
          fromAnchor: connectorFrom.anchor,
          toAnchor: anchor,
        })
          .then(() => {
            setConnectorFrom(null);
            setActiveTool('select');
            activeToolRef.current = 'select';
          })
          .catch(() => {
            setConnectorFrom(null);
          });
      },
      [connectorFrom, objects, onObjectCreate, activeColor]
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

    // Handle transform end from TransformHandler (shape-aware attrs: rect-like or points for line/connector)
    const handleTransformEnd = useCallback(
      (objectId: string, attrs: ITransformEndAttrs) => {
        onObjectUpdate?.(objectId, attrs as Partial<IBoardObject>);
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

          case 'connector': {
            const fromObj =
              obj.fromObjectId != null ? objects.find((o) => o.id === obj.fromObjectId) : undefined;
            const toObj =
              obj.toObjectId != null ? objects.find((o) => o.id === obj.toObjectId) : undefined;
            const isLinked = Boolean(
              fromObj && toObj && obj.fromAnchor != null && obj.toAnchor != null
            );
            const x = isLinked ? getAnchorPosition(fromObj!, obj.fromAnchor!).x : obj.x;
            const y = isLinked ? getAnchorPosition(fromObj!, obj.fromAnchor!).y : obj.y;
            const points = isLinked
              ? [
                  0,
                  0,
                  getAnchorPosition(toObj!, obj.toAnchor!).x - x,
                  getAnchorPosition(toObj!, obj.toAnchor!).y - y,
                ]
              : obj.points || [0, 0, 100, 100];
            return (
              <Connector
                key={obj.id}
                id={obj.id}
                x={x}
                y={y}
                points={points}
                stroke={obj.stroke || obj.fill}
                strokeWidth={obj.strokeWidth}
                rotation={obj.rotation}
                isSelected={isSelected}
                draggable={isLinked ? false : canEdit}
                hasArrow={true}
                onSelect={() => handleObjectSelect(obj.id)}
                onDragEnd={(dx, dy) => handleObjectDragEnd(obj.id, dx, dy)}
              />
            );
          }

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
      [selectedIds, canEdit, objects, handleObjectSelect, handleObjectDragEnd, handleTextChange]
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

    // Stage is draggable only in pan mode so marquee selection is not stolen by pan
    const isDraggable = activeTool === 'pan';

    return (
      <div
        className='w-full h-full overflow-hidden bg-white relative'
        data-testid='board-canvas'
        data-selected-count={selectedIds.length}
        data-selected-ids={selectedIds.join(',')}
      >
        {/* Toolbar */}
        <Toolbar
          activeTool={activeTool}
          onToolChange={(tool) => {
            setActiveTool(tool);
            activeToolRef.current = tool;
          }}
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
          style={{
            cursor:
              activeTool === 'pan' ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair',
          }}
        >
          {/* Background grid layer - static, no interaction */}
          <Layer listening={false} name='grid'>
            {renderGrid()}
          </Layer>

          {/* Objects layer - main content (viewport culled) */}
          <Layer ref={objectsLayerRef} name='objects'>
            {/* Background rect to catch clicks on empty areas - covers entire viewport */}
            <Rect
              x={-viewport.position.x / viewport.scale.x - 1000}
              y={-viewport.position.y / viewport.scale.y - 1000}
              width={viewport.width / viewport.scale.x + 2000}
              height={viewport.height / viewport.scale.y + 2000}
              fill='transparent'
              name='background'
              listening={true}
            />
            {visibleObjects.map(renderShape)}
          </Layer>

          {/* Connection nodes (when connector tool active) - above objects so node clicks are hit first */}
          {activeTool === 'connector' && (
            <Layer name='connector-nodes' listening={true}>
              <ConnectionNodesLayer
                shapes={visibleObjects}
                onNodeClick={handleConnectorNodeClick}
              />
            </Layer>
          )}

          {/* Drawing preview layer */}
          <Layer name='drawing' listening={false}>
            {renderDrawingPreview()}
            <SelectionLayer selectionRect={selectionRect} />
          </Layer>

          {/* Cursor layer - other users' cursors */}
          <CursorLayer cursors={cursors} currentUid={user.uid} />

          {/* Selection/Transform layer - listening enabled for Transformer, but clicks on Transformer are handled */}
          <Layer
            name='selection'
            listening={true}
            onClick={(e) => {
              // Prevent clicks on Transformer (anchors, borders, or Transformer itself) from propagating to stage
              const target = e.target;
              const className = target.getClassName();

              // If clicking directly on Transformer, prevent propagation
              if (className === 'Transformer') {
                e.cancelBubble = true;
                return;
              }

              // Transformer creates Circle nodes for anchors and Line nodes for borders
              // Check if the click is on a Transformer element
              if (className === 'Circle' || className === 'Line') {
                // Check if it's part of a Transformer by looking for parent Transformer
                let node: Konva.Node | null = target;
                while (node) {
                  if (node.getClassName() === 'Transformer') {
                    e.cancelBubble = true;
                    return;
                  }
                  node = node.getParent();
                }
              }
            }}
          >
            <TransformHandler
              selectedIds={selectedIds}
              layerRef={objectsLayerRef}
              excludedFromTransformIds={linkedConnectorIds}
              onTransformEnd={handleTransformEnd}
            />
          </Layer>
        </Stage>

        {/* Status indicators */}
        <div className='absolute bottom-4 right-4 flex gap-2'>
          {/* Object count (visible/total) */}
          <div
            className='bg-slate-800/80 text-white px-3 py-1.5 rounded-md text-sm font-medium backdrop-blur-sm'
            data-testid='object-count'
          >
            {visibleObjects.length}/{objects.length}
          </div>
          {/* Zoom indicator */}
          <div
            className='bg-slate-800/80 text-white px-3 py-1.5 rounded-md text-sm font-medium backdrop-blur-sm'
            data-testid='zoom-indicator'
          >
            {Math.round(viewport.scale.x * 100)}%
          </div>
        </div>
      </div>
    );
  }
);

BoardCanvas.displayName = 'BoardCanvas';
