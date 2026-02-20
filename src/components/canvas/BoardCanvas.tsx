import { Stage, Layer, Rect, Line } from 'react-konva';
import { TransformHandler } from './TransformHandler';
import { SelectionLayer } from './SelectionLayer';
import { useRef, useCallback, useState, useEffect, useMemo, memo, type ReactElement } from 'react';
import Konva from 'konva';
import { Wrench, Focus, Maximize2, Grid3X3, Magnet, Download } from 'lucide-react';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import { CursorLayer } from './CursorLayer';
import { Toolbar } from './Toolbar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { STICKY_COLORS } from './shapes';
import { StoreShapeRenderer } from './StoreShapeRenderer';
import { useCursors } from '@/hooks/useCursors';
import { useVisibleShapeIds } from '@/hooks/useVisibleShapeIds';
import { useCanvasOperations } from '@/hooks/useCanvasOperations';
import { useVisibleShapes } from '@/hooks/useVisibleShapes';
import { useBatchDraw } from '@/hooks/useBatchDraw';
import { useSelectionStore } from '@/stores/selectionStore';
import { useObjectsStore } from '@/stores/objectsStore';
import type { User } from 'firebase/auth';
import type {
  IBoardObject,
  ConnectorAnchor,
  IPosition,
  ITransformEndAttrs,
  IViewportState,
  IAlignmentGuides,
  ToolMode,
  IKonvaMouseEvent,
  IKonvaDragEvent,
  ISelectionRect,
  ExportImageFormat,
  IViewportActionsValue,
} from '@/types';
import type { ICreateObjectParams } from '@/modules/sync/objectService';
import { getAnchorPosition } from '@/lib/connectorAnchors';
import { getObjectBounds, getSelectionBounds, getBoardBounds } from '@/lib/canvasBounds';
import {
  computeAlignmentGuidesWithCandidates,
  computeSnappedPositionFromGuides,
} from '@/lib/alignmentGuides';
import { cn } from '@/lib/utils';
import { getWidthHeightFromPoints } from '@/lib/lineTransform';
import {
  applySnapPositionToNode,
  snapPositionToGrid,
  snapResizeRectToGrid,
} from '@/lib/snapToGrid';
import { ConnectionNodesLayer } from './ConnectionNodesLayer';
import { AlignToolbar } from './AlignToolbar';
import { AlignmentGuidesLayer } from './AlignmentGuidesLayer';
import { useExportAsImage } from '@/hooks/useExportAsImage';
import { useTheme } from '@/hooks/useTheme';
import {
  getBoardCanvasBackgroundColor,
  getBoardGridColor,
  BOARD_CANVAS_CONTAINER_CLASS,
} from './boardCanvasTheme';
import { useBoardSettings } from '@/hooks/useBoardSettings';
import { useMiddleMousePanListeners } from '@/hooks/useMiddleMousePanListeners';
import { useCanvasKeyboardShortcuts } from '@/hooks/useCanvasKeyboardShortcuts';
import { useAlignmentGuideCache } from '@/hooks/useAlignmentGuideCache';
import { useHistoryStore } from '@/stores/historyStore';
import { useDragOffsetStore } from '@/stores/dragOffsetStore';
import {
  getFrameChildren,
  resolveParentFrameId,
  findContainingFrame,
} from '@/hooks/useFrameContainment';

interface IBoardCanvasProps {
  boardId: string;
  boardName?: string;
  user: User;
  /** @deprecated BoardCanvas reads from objectsStore; kept for backward compatibility during migration. */
  objects?: IBoardObject[];
  canEdit?: boolean;
  onObjectUpdate?: (objectId: string, updates: Partial<IBoardObject>) => void;
  onObjectsUpdate?: (updates: Array<{ objectId: string; updates: Partial<IBoardObject> }>) => void;
  onObjectCreate?: (params: Omit<ICreateObjectParams, 'createdBy'>) => Promise<IBoardObject | null>;
  onObjectDelete?: (objectId: string) => Promise<void>;
  onObjectsDeleteBatch?: (objectIds: string[]) => void | Promise<void>;
  onViewportActionsReady?: (actions: IViewportActionsValue | null) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

// Zoom preset scales (1 = 100%)
const ZOOM_PRESETS = [0.5, 1, 2] as const;

// Grid pattern configuration (display and snap use same size per PRD)
const GRID_SIZE = 20;
const GRID_STROKE_WIDTH = 1;
export const GRID_LINE_OPACITY = 0.5;

// Default sizes for new objects
const DEFAULT_STICKY_SIZE = { width: 200, height: 200 };

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
    boardName = 'Board',
    user,
    canEdit = true,
    onObjectUpdate,
    onObjectsUpdate,
    onObjectCreate,
    onObjectDelete,
    onObjectsDeleteBatch,
    onViewportActionsReady,
    onUndo,
    onRedo,
  }: IBoardCanvasProps): ReactElement => {
    const stageRef = useRef<Konva.Stage>(null);
    const objectsLayerRef = useRef<Konva.Layer>(null);
    const { requestBatchDraw } = useBatchDraw();
    const [activeTool, setActiveTool] = useState<ToolMode>('select');
    const activeToolRef = useRef<ToolMode>('select');
    const [activeColor, setActiveColor] = useState<string>(STICKY_COLORS.yellow);
    const selectedIds = useSelectionStore((state) => state.selectedIds);
    const objectsRecord = useObjectsStore((s) => s.objects);
    const objects = useMemo(() => Object.values(objectsRecord) as IBoardObject[], [objectsRecord]);
    const canUndoHistory = useHistoryStore((s) => s.canUndo);
    const canRedoHistory = useHistoryStore((s) => s.canRedo);
    const setSelectedIds = useSelectionStore((state) => state.setSelectedIds);
    const clearSelectionFromStore = useSelectionStore((state) => state.clearSelection);
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
    /** Bounds at start of selection-drag-handle drag (used in onDragMove/onDragEnd). */
    const selectionDragBoundsRef = useRef<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    } | null>(null);
    const [groupDragOffset, setGroupDragOffset] = useState<{ dx: number; dy: number } | null>(null);
    const groupDragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
    // Frame drag offset and drop target live in Zustand (dragOffsetStore) to avoid
    // re-rendering every visible shape on every mousemove.  We read the setters once
    // (stable refs) and never subscribe to the values in BoardCanvas itself.
    const setFrameDragOffset = useDragOffsetStore((s) => s.setFrameDragOffset);
    const setDropTargetFrameId = useDragOffsetStore((s) => s.setDropTargetFrameId);
    const [isHoveringSelectionHandle, setIsHoveringSelectionHandle] = useState(false);
    const [connectorFrom, setConnectorFrom] = useState<{
      shapeId: string;
      anchor: ConnectorAnchor;
    } | null>(null);
    const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
    const [alignmentGuides, setAlignmentGuides] = useState<IAlignmentGuides | null>(null);
    const objectsRef = useRef<IBoardObject[]>(objects);
    const drawingActiveRef = useRef(false);
    const selectingActiveRef = useRef(false);
    const pendingPointerRef = useRef<IPosition | null>(null);
    const pointerFrameRef = useRef<number | null>(null);
    const viewportPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const {
      viewport: persistedViewport,
      setViewport: setPersistedViewport,
      showGrid,
      setShowGrid,
      snapToGrid: snapToGridEnabled,
      setSnapToGrid: setSnapToGridEnabled,
    } = useBoardSettings(boardId);

    const { theme } = useTheme();
    const gridColor = useMemo(() => getBoardGridColor(theme), [theme]);
    const selectionColor = useMemo(
      () =>
        (theme &&
          (typeof document !== 'undefined'
            ? getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
            : '')) ||
        '#3b82f6',
      [theme]
    );

    useEffect(() => {
      objectsRef.current = objects;
    }, [objects]);

    const handleViewportPersist = useCallback(
      (nextViewport: IViewportState) => {
        if (viewportPersistTimeoutRef.current) {
          clearTimeout(viewportPersistTimeoutRef.current);
        }

        viewportPersistTimeoutRef.current = setTimeout(() => {
          setPersistedViewport({
            position: nextViewport.position,
            scale: nextViewport.scale,
          });
          viewportPersistTimeoutRef.current = null;
        }, 180);
      },
      [setPersistedViewport]
    );

    const {
      viewport,
      handleWheel,
      handleDragEnd,
      handleTouchMove,
      handleTouchEnd,
      zoomTo,
      panTo,
      zoomToFitBounds,
      resetViewport,
    } = useCanvasViewport({
      initialViewport: persistedViewport,
      onViewportChange: handleViewportPersist,
      stageRef,
    });

    const {
      isMiddlePanning,
      setIsMiddlePanning,
      middlePanStartClientRef,
      middlePanStartPositionRef,
    } = useMiddleMousePanListeners({ panTo });

    const { exportViewport, exportFullBoard } = useExportAsImage({
      stageRef,
      boardName,
    });

    // Filter objects to only visible ones (viewport culling)
    const visibleObjects = useVisibleShapes({ objects, viewport });
    // Store-driven visible IDs for per-shape subscription render loop (A.5 optimization).
    // Already sorted with frames first (render order).
    const visibleShapeIds = useVisibleShapeIds(viewport);
    const visibleObjectIdsKey = useMemo(() => visibleShapeIds.join('|'), [visibleShapeIds]);
    const objectsById = useMemo(
      () => new Map(objects.map((object) => [object.id, object])),
      [objects]
    );

    // Linked connectors are excluded from transform (selectable for deletion only)
    const linkedConnectorIds = useMemo(
      () =>
        objects
          .filter((o) => o.type === 'connector' && o.fromObjectId != null && o.toObjectId != null)
          .map((o) => o.id),
      [objects]
    );
    // Track whether the canvas is actively being panned (pan-tool drag or middle-mouse pan).
    // Stored as a ref so cursor throttle reads it without triggering re-renders.
    const isPanningRef = useRef(false);
    useEffect(() => {
      isPanningRef.current = activeTool === 'pan' || isMiddlePanning;
    }, [activeTool, isMiddlePanning]);

    // Cursor synchronization
    const { cursors, handleMouseMove } = useCursors({
      boardId,
      user,
      isPanningRef,
    });
    const activeCursors = cursors;
    const hasRemoteCursors = useMemo(
      () => Object.keys(activeCursors).some((cursorId) => cursorId !== user.uid),
      [activeCursors, user.uid]
    );

    // Keep event-driven refs synced with render state (effect required; ref assignment during render is disallowed).
    useEffect(() => {
      activeToolRef.current = activeTool;
      drawingActiveRef.current = drawingState.isDrawing;
      selectingActiveRef.current = isSelecting;
    }, [activeTool, drawingState.isDrawing, isSelecting]);

    useCanvasKeyboardShortcuts({
      setActiveTool,
      canEdit,
      activeToolRef,
      onUndo,
      onRedo,
    });

    // Clear selection helper
    const clearSelection = useCallback(() => {
      clearSelectionFromStore();
    }, [clearSelectionFromStore]);

    // Canvas operations (delete, duplicate, copy, paste)
    // Type assertion needed because useCanvasOperations uses a more permissive type
    useCanvasOperations({
      objects,
      selectedIds,
      setSelectedIds,
      onObjectCreate:
        (onObjectCreate as (params: Partial<IBoardObject>) => Promise<IBoardObject | null>) ||
        (() => Promise.resolve(null)),
      onObjectUpdate,
      onObjectsUpdate,
      onObjectDelete: (onObjectDelete as (objectId: string) => void) || (() => {}),
      onObjectsDeleteBatch: onObjectsDeleteBatch
        ? (ids) => Promise.resolve(onObjectsDeleteBatch(ids))
        : undefined,
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
      (e: IKonvaMouseEvent) => {
        const stage = e.target.getStage();
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const shouldTrackPointer = drawingActiveRef.current || selectingActiveRef.current;
        const shouldBroadcastCursor = activeToolRef.current !== 'pan';

        if (!shouldTrackPointer && !shouldBroadcastCursor) {
          return;
        }

        const { x: canvasX, y: canvasY } = getCanvasCoords(stage, pointer);

        if (shouldBroadcastCursor) {
          handleMouseMove(canvasX, canvasY);
        }

        if (!shouldTrackPointer) {
          return;
        }

        pendingPointerRef.current = { x: canvasX, y: canvasY };

        if (pointerFrameRef.current == null) {
          pointerFrameRef.current = requestAnimationFrame(() => {
            pointerFrameRef.current = null;
            const pendingPointer = pendingPointerRef.current;
            if (!pendingPointer) return;

            if (drawingActiveRef.current) {
              setDrawingState((prev) => ({
                ...prev,
                currentX: pendingPointer.x,
                currentY: pendingPointer.y,
              }));
            }

            if (selectingActiveRef.current) {
              setSelectionRect((prev) => ({
                ...prev,
                x2: pendingPointer.x,
                y2: pendingPointer.y,
              }));
            }
          });
        }
      },
      [handleMouseMove, getCanvasCoords]
    );

    // Check if click is on empty area (not on a shape)
    const isEmptyAreaClick = useCallback((e: IKonvaMouseEvent): boolean => {
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
      (e: IKonvaMouseEvent) => {
        const stage = e.target.getStage();
        if (!stage) return;

        if (activeToolRef.current === 'pan') {
          return;
        }

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
      async (e: IKonvaMouseEvent) => {
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

        if (pointerFrameRef.current != null) {
          cancelAnimationFrame(pointerFrameRef.current);
          pointerFrameRef.current = null;
        }

        pendingPointerRef.current = null;
      },
      [
        drawingState,
        activeTool,
        activeColor,
        onObjectCreate,
        objects,
        getCanvasCoords,
        setSelectedIds,
      ]
    );

    useEffect(
      () => () => {
        if (pointerFrameRef.current != null) {
          cancelAnimationFrame(pointerFrameRef.current);
        }

        if (viewportPersistTimeoutRef.current) {
          clearTimeout(viewportPersistTimeoutRef.current);
        }
      },
      []
    );

    // Handle stage click for object creation or deselection
    const handleStageClick = useCallback(
      (e: IKonvaMouseEvent) => {
        const stage = e.target.getStage();
        if (!stage) {
          return;
        }

        if (activeToolRef.current === 'pan') {
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
              text: 'New note...',
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
              .catch(() => {
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
      [
        activeTool,
        activeColor,
        canEdit,
        onObjectCreate,
        getCanvasCoords,
        isEmptyAreaClick,
        setSelectedIds,
      ]
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
      (objectId: string, e?: IKonvaMouseEvent) => {
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
      [setSelectedIds]
    );

    // Handle object drag end (optionally snap position to grid); clear alignment guides.
    // When multiple objects are selected, apply same delta to all (batch update).
    // When a frame is dragged, its children move with it (same delta).
    // After any non-frame/non-connector drag, resolve parentFrameId via spatial containment.
    const handleObjectDragEnd = useCallback(
      (objectId: string, x: number, y: number) => {
        setAlignmentGuides(null);
        setDropTargetFrameId(null);
        const draggedObj = objectsById.get(objectId);
        if (!draggedObj) return;

        const multiSelected =
          selectedIds.length > 1 && selectedIds.includes(objectId) && onObjectsUpdate;

        if (multiSelected) {
          const dx = x - draggedObj.x;
          const dy = y - draggedObj.y;
          const updates: Array<{ objectId: string; updates: Partial<IBoardObject> }> = [];

          // Collect IDs being moved so we skip reparenting for frame children already in selection
          const movedIds = new Set(selectedIds);

          for (const id of selectedIds) {
            const obj = objectsById.get(id);
            if (!obj) continue;

            let newX = obj.x + dx;
            let newY = obj.y + dy;
            if (snapToGridEnabled) {
              const snapped = snapPositionToGrid(newX, newY, GRID_SIZE);
              newX = snapped.x;
              newY = snapped.y;
            }

            const objUpdates: Partial<IBoardObject> = { x: newX, y: newY };

            // If this is a frame, also move its children that aren't already in the selection
            if (obj.type === 'frame') {
              const children = getFrameChildren(obj.id, objects);
              for (const child of children) {
                if (movedIds.has(child.id)) continue;

                let cx = child.x + dx;
                let cy = child.y + dy;
                if (snapToGridEnabled) {
                  const snapped = snapPositionToGrid(cx, cy, GRID_SIZE);
                  cx = snapped.x;
                  cy = snapped.y;
                }

                updates.push({ objectId: child.id, updates: { x: cx, y: cy } });
                movedIds.add(child.id);
              }
            }

            // Resolve reparenting for non-frame, non-connector objects
            if (obj.type !== 'frame' && obj.type !== 'connector') {
              const newBounds = { x1: newX, y1: newY, x2: newX + obj.width, y2: newY + obj.height };
              const newParent = resolveParentFrameId(obj, newBounds, objects);
              if (newParent !== obj.parentFrameId) {
                objUpdates.parentFrameId = newParent ?? '';
              }
            }

            updates.push({ objectId: id, updates: objUpdates });
          }
          if (updates.length > 0) {
            onObjectsUpdate(updates);
          }

          return;
        }

        // Single object drag
        let finalX = x;
        let finalY = y;
        if (snapToGridEnabled) {
          const snapped = snapPositionToGrid(x, y, GRID_SIZE);
          finalX = snapped.x;
          finalY = snapped.y;
        }

        const singleUpdates: Partial<IBoardObject> = { x: finalX, y: finalY };

        // Frame drag: move children with it
        if (draggedObj.type === 'frame' && onObjectsUpdate) {
          const dx = finalX - draggedObj.x;
          const dy = finalY - draggedObj.y;
          const children = getFrameChildren(draggedObj.id, objects);
          if (children.length > 0) {
            const batchUpdates: Array<{ objectId: string; updates: Partial<IBoardObject> }> = [
              { objectId, updates: singleUpdates },
            ];
            for (const child of children) {
              let cx = child.x + dx;
              let cy = child.y + dy;
              if (snapToGridEnabled) {
                const snapped = snapPositionToGrid(cx, cy, GRID_SIZE);
                cx = snapped.x;
                cy = snapped.y;
              }

              batchUpdates.push({ objectId: child.id, updates: { x: cx, y: cy } });
            }
            onObjectsUpdate(batchUpdates);
            return;
          }
        }

        // Non-frame single drag: resolve reparenting
        if (draggedObj.type !== 'frame' && draggedObj.type !== 'connector') {
          const newBounds = {
            x1: finalX,
            y1: finalY,
            x2: finalX + draggedObj.width,
            y2: finalY + draggedObj.height,
          };
          const newParent = resolveParentFrameId(draggedObj, newBounds, objects);
          if (newParent !== draggedObj.parentFrameId) {
            singleUpdates.parentFrameId = newParent ?? '';
          }

          // Auto-expand frame if child falls outside its bounds
          const targetFrameId = newParent ?? draggedObj.parentFrameId;
          if (targetFrameId && onObjectsUpdate) {
            const frame = objectsById.get(targetFrameId);
            if (frame) {
              const PADDING = 20;
              const TITLE_HEIGHT = 32;
              const childRight = finalX + draggedObj.width + PADDING;
              const childBottom = finalY + draggedObj.height + PADDING;
              const childLeft = finalX - PADDING;
              const childTop = finalY - PADDING;
              const frameRight = frame.x + frame.width;
              const frameBottom = frame.y + frame.height;
              const frameContentTop = frame.y + TITLE_HEIGHT;

              if (
                childRight > frameRight ||
                childBottom > frameBottom ||
                childLeft < frame.x ||
                childTop < frameContentTop
              ) {
                const newFrameX = Math.min(frame.x, childLeft);
                const newFrameY = Math.min(frame.y, childTop - TITLE_HEIGHT);
                const newFrameRight = Math.max(frameRight, childRight);
                const newFrameBottom = Math.max(frameBottom, childBottom);

                onObjectsUpdate([
                  { objectId, updates: singleUpdates },
                  {
                    objectId: targetFrameId,
                    updates: {
                      x: newFrameX,
                      y: newFrameY,
                      width: newFrameRight - newFrameX,
                      height: newFrameBottom - newFrameY,
                    },
                  },
                ]);
                return;
              }
            }
          }
        }

        onObjectUpdate?.(objectId, singleUpdates);
      },
      [onObjectUpdate, onObjectsUpdate, snapToGridEnabled, selectedIds, objectsById, objects]
    );

    // Selection bounds when 2+ selected (for draggable handle over empty space in selection)
    const selectionBounds = useMemo(() => {
      if (selectedIds.length < 2) {
        return null;
      }

      return getSelectionBounds(objects, selectedIds);
    }, [objects, selectedIds]);

    /** Only show grab cursor when the selection-drag handle is visible and hovered. */
    const isHoveringSelectionHandleEffective = selectionBounds != null && isHoveringSelectionHandle;

    const handleSelectionDragStart = useCallback(
      (bounds: { x1: number; y1: number; x2: number; y2: number }) => {
        setAlignmentGuides(null);
        selectionDragBoundsRef.current = bounds;
      },
      []
    );

    const handleSelectionDragMove = useCallback((e: IKonvaDragEvent) => {
      const b = selectionDragBoundsRef.current;
      if (!b) {
        return;
      }

      const offset = {
        dx: e.target.x() - b.x1,
        dy: e.target.y() - b.y1,
      };
      groupDragOffsetRef.current = offset;
      setGroupDragOffset(offset);
    }, []);

    const handleSelectionDragEnd = useCallback(() => {
      const b = selectionDragBoundsRef.current;
      if (!b || !onObjectsUpdate) {
        selectionDragBoundsRef.current = null;
        setGroupDragOffset(null);
        return;
      }

      const { dx, dy } = groupDragOffsetRef.current;
      const updates: Array<{ objectId: string; updates: Partial<IBoardObject> }> = [];
      const movedIds = new Set(selectedIds);

      // Snap group bounding box to grid (one snap for the whole group; preserve relative positions).
      const groupNewLeft = b.x1 + dx;
      const groupNewTop = b.y1 + dy;
      const snappedGroup = snapToGridEnabled
        ? snapPositionToGrid(groupNewLeft, groupNewTop, GRID_SIZE)
        : { x: groupNewLeft, y: groupNewTop };
      const snapOffsetX = snappedGroup.x - groupNewLeft;
      const snapOffsetY = snappedGroup.y - groupNewTop;

      for (const id of selectedIds) {
        const obj = objectsById.get(id);
        if (!obj) continue;

        const newX = obj.x + dx + snapOffsetX;
        const newY = obj.y + dy + snapOffsetY;

        const objUpdates: Partial<IBoardObject> = { x: newX, y: newY };

        // Frame in selection: also move children not already in selection
        if (obj.type === 'frame') {
          const children = getFrameChildren(obj.id, objects);
          for (const child of children) {
            if (movedIds.has(child.id)) continue;

            const cx = child.x + dx + snapOffsetX;
            const cy = child.y + dy + snapOffsetY;

            updates.push({ objectId: child.id, updates: { x: cx, y: cy } });
            movedIds.add(child.id);
          }
        }

        // Reparent non-frame, non-connector objects
        if (obj.type !== 'frame' && obj.type !== 'connector') {
          const newBounds = { x1: newX, y1: newY, x2: newX + obj.width, y2: newY + obj.height };
          const newParent = resolveParentFrameId(obj, newBounds, objects);
          if (newParent !== obj.parentFrameId) {
            objUpdates.parentFrameId = newParent ?? '';
          }
        }

        updates.push({ objectId: id, updates: objUpdates });
      }

      if (updates.length > 0) {
        onObjectsUpdate(updates);
      }

      selectionDragBoundsRef.current = null;
      setGroupDragOffset(null);
    }, [onObjectsUpdate, selectedIds, objectsById, snapToGridEnabled, objects]);

    // Throttle guide updates via RAF; ref used by drag handler so it sees latest setter without effect.
    const alignmentGuidesRafIdRef = useRef<number>(0);
    const setGuidesThrottledRef = useRef<(g: IAlignmentGuides) => void>(() => {});
    const setGuidesThrottled = useCallback((guides: IAlignmentGuides) => {
      const prev = alignmentGuidesRafIdRef.current;
      if (prev !== 0) {
        cancelAnimationFrame(prev);
      }

      alignmentGuidesRafIdRef.current = requestAnimationFrame(() => {
        setAlignmentGuides(guides);
        alignmentGuidesRafIdRef.current = 0;
      });
    }, []);

    useEffect(() => {
      setGuidesThrottledRef.current = setGuidesThrottled;
    });

    const { guideCandidateBoundsRef, dragBoundFuncCacheRef } = useAlignmentGuideCache({
      objects,
      visibleObjects,
      visibleObjectIdsKey,
      snapToGridEnabled,
    });

    const getDragBoundFunc = useCallback(
      (objectId: string, width: number, height: number) => {
        const cached = dragBoundFuncCacheRef.current.get(objectId);
        if (cached && cached.width === width && cached.height === height) {
          return cached.fn;
        }

        const otherCandidates = guideCandidateBoundsRef.current
          .filter((candidate) => candidate.id !== objectId)
          .map((candidate) => candidate.candidate);

        const nextDragBoundFunc = (pos: IPosition) => {
          if (snapToGridEnabled) {
            setGuidesThrottledRef.current({ horizontal: [], vertical: [] });
            return snapPositionToGrid(pos.x, pos.y, GRID_SIZE);
          }

          const dragged = {
            x1: pos.x,
            y1: pos.y,
            x2: pos.x + width,
            y2: pos.y + height,
          };
          const guides = computeAlignmentGuidesWithCandidates(dragged, otherCandidates);
          const snapped = computeSnappedPositionFromGuides(guides, pos, width, height);

          setGuidesThrottledRef.current(guides);
          return snapped;
        };

        dragBoundFuncCacheRef.current.set(objectId, {
          width,
          height,
          fn: nextDragBoundFunc,
        });
        return nextDragBoundFunc;
      },
      [snapToGridEnabled, dragBoundFuncCacheRef, guideCandidateBoundsRef]
    );

    // Handle text change for sticky notes
    const handleTextChange = useCallback(
      (objectId: string, text: string) => {
        onObjectUpdate?.(objectId, { text });
      },
      [onObjectUpdate]
    );

    const selectHandlerMapRef = useRef<Map<string, () => void>>(new Map());
    const dragEndHandlerMapRef = useRef<Map<string, (x: number, y: number) => void>>(new Map());
    const textChangeHandlerMapRef = useRef<Map<string, (text: string) => void>>(new Map());

    const getSelectHandler = useCallback(
      (objectId: string) => {
        const existingHandler = selectHandlerMapRef.current.get(objectId);
        if (existingHandler) {
          return existingHandler;
        }

        const nextHandler = () => {
          handleObjectSelect(objectId);
        };
        selectHandlerMapRef.current.set(objectId, nextHandler);
        return nextHandler;
      },
      [handleObjectSelect]
    );

    const getDragEndHandler = useCallback(
      (objectId: string) => {
        const existingHandler = dragEndHandlerMapRef.current.get(objectId);
        if (existingHandler) {
          return existingHandler;
        }

        const nextHandler = (x: number, y: number) => {
          handleObjectDragEnd(objectId, x, y);
          setFrameDragOffset(null);
        };
        dragEndHandlerMapRef.current.set(objectId, nextHandler);
        return nextHandler;
      },
      [handleObjectDragEnd]
    );

    // Throttle drop-target detection to ~every 100ms instead of every mousemove (60 Hz).
    const lastDropTargetCheckRef = useRef(0);
    const DROP_TARGET_THROTTLE_MS = 100;

    // Cache frames list so we don't re-filter on every mousemove.
    const framesRef = useRef<IBoardObject[]>([]);
    useEffect(() => {
      framesRef.current = objects.filter((o) => o.type === 'frame');
    }, [objects]);

    /** When snap-to-grid is on, force node position to grid on every drag move so it lines up during drag.
     * When dragging a frame, track offset so frame children can render at (x+dx, y+dy) during drag.
     * When dragging a non-frame object, track which frame it's hovering over for drop zone feedback. */
    const handleDragMove = useCallback(
      (e: IKonvaDragEvent) => {
        if (snapToGridEnabled) {
          applySnapPositionToNode(e.target, objectsById, GRID_SIZE);
        }

        const objectId = e.target.id?.() ?? e.target.name?.();
        if (objectId && typeof objectId === 'string') {
          const obj = objectsById.get(objectId);
          if (obj?.type === 'frame') {
            setFrameDragOffset({
              frameId: objectId,
              dx: e.target.x() - obj.x,
              dy: e.target.y() - obj.y,
            });
          } else if (obj && obj.type !== 'connector') {
            // Throttled drop target detection — no need to check 60x/sec
            const now = performance.now();
            if (now - lastDropTargetCheckRef.current > DROP_TARGET_THROTTLE_MS) {
              lastDropTargetCheckRef.current = now;
              const dragX = e.target.x();
              const dragY = e.target.y();
              const dragBounds = {
                x1: dragX,
                y1: dragY,
                x2: dragX + obj.width,
                y2: dragY + obj.height,
              };
              const targetFrame = findContainingFrame(dragBounds, framesRef.current, obj.id);
              setDropTargetFrameId(targetFrame ?? null);
            }
          }
        }
      },
      [objectsById, snapToGridEnabled, setFrameDragOffset, setDropTargetFrameId]
    );

    const onDragMoveProp = canEdit ? handleDragMove : undefined;

    const getTextChangeHandler = useCallback(
      (objectId: string) => {
        const existingHandler = textChangeHandlerMapRef.current.get(objectId);
        if (existingHandler) {
          return existingHandler;
        }

        const nextHandler = (text: string) => {
          handleTextChange(objectId, text);
        };
        textChangeHandlerMapRef.current.set(objectId, nextHandler);
        return nextHandler;
      },
      [handleTextChange]
    );

    // Enter frame: double-click frame body → select all children
    const handleEnterFrame = useCallback(
      (frameId: string) => {
        const children = getFrameChildren(frameId, objects);
        if (children.length > 0) {
          setSelectedIds(children.map((c) => c.id));
        }
      },
      [objects, setSelectedIds]
    );

    useEffect(() => {
      const liveIds = new Set(objects.map((object) => object.id));
      const pruneStaleHandlers = <THandler,>(handlerMap: Map<string, THandler>) => {
        const staleIds = Array.from(handlerMap.keys()).filter((id) => !liveIds.has(id));
        for (const staleId of staleIds) {
          handlerMap.delete(staleId);
        }
      };

      pruneStaleHandlers(selectHandlerMapRef.current);
      pruneStaleHandlers(dragEndHandlerMapRef.current);
      pruneStaleHandlers(textChangeHandlerMapRef.current);
      pruneStaleHandlers(dragBoundFuncCacheRef.current);
    }, [objects, dragBoundFuncCacheRef]);

    // Handle transform end from TransformHandler (shape-aware attrs: rect-like or points for line/connector)
    const handleTransformEnd = useCallback(
      (objectId: string, attrs: ITransformEndAttrs) => {
        let finalAttrs = attrs;
        if (snapToGridEnabled) {
          if ('width' in attrs && 'height' in attrs) {
            const object = objectsById.get(objectId);
            if (object) {
              const snappedRect = snapResizeRectToGrid(
                { x: object.x, y: object.y, width: object.width, height: object.height },
                { x: attrs.x, y: attrs.y, width: attrs.width, height: attrs.height },
                GRID_SIZE
              );
              finalAttrs = {
                ...attrs,
                x: snappedRect.x,
                y: snappedRect.y,
                width: snappedRect.width,
                height: snappedRect.height,
              };
            } else {
              finalAttrs = {
                ...attrs,
                ...snapPositionToGrid(attrs.x, attrs.y, GRID_SIZE),
              };
            }
          } else if ('points' in attrs) {
            const snappedPos = snapPositionToGrid(attrs.x, attrs.y, GRID_SIZE);
            finalAttrs = {
              ...attrs,
              x: snappedPos.x,
              y: snappedPos.y,
            };
          }
        }

        if ('points' in finalAttrs && finalAttrs.points.length >= 4) {
          const { width, height } = getWidthHeightFromPoints(finalAttrs.points);
          finalAttrs = { ...finalAttrs, width, height };
        }

        onObjectUpdate?.(objectId, finalAttrs as Partial<IBoardObject>);
      },
      [onObjectUpdate, snapToGridEnabled, objectsById]
    );

    const gridNodes = useMemo(() => {
      if (!showGrid) {
        return [];
      }

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
            fill={gridColor}
            opacity={GRID_LINE_OPACITY}
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
            fill={gridColor}
            opacity={GRID_LINE_OPACITY}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      }

      return gridLines;
    }, [showGrid, viewport, gridColor]);

    // Per-shape subscription render loop (A.5): each StoreShapeRenderer subscribes
    // to its own object in the Zustand store, so a single remote object change only
    // re-renders that one shape instead of the entire tree.
    // frameDragOffset and dropTargetFrameId are now in dragOffsetStore —
    // individual StoreShapeRenderers subscribe only when relevant, so we don't
    // re-create all JSX nodes on every mousemove.
    const visibleObjectNodes = useMemo(
      () =>
        visibleShapeIds.map((id) => (
          <StoreShapeRenderer
            key={id}
            id={id}
            canEdit={canEdit}
            selectionColor={selectionColor}
            groupDragOffset={groupDragOffset}
            onEnterFrame={handleEnterFrame}
            getSelectHandler={getSelectHandler}
            getDragEndHandler={getDragEndHandler}
            getTextChangeHandler={getTextChangeHandler}
            getDragBoundFunc={getDragBoundFunc}
            onDragMove={onDragMoveProp}
            handleObjectSelect={handleObjectSelect}
            handleObjectDragEnd={handleObjectDragEnd}
          />
        )),
      [
        visibleShapeIds,
        canEdit,
        selectionColor,
        groupDragOffset,
        handleEnterFrame,
        getSelectHandler,
        getDragEndHandler,
        getTextChangeHandler,
        getDragBoundFunc,
        onDragMoveProp,
        handleObjectSelect,
        handleObjectDragEnd,
      ]
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
            stroke={selectionColor}
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
            stroke={selectionColor}
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
            stroke={selectionColor}
            strokeWidth={2}
            dash={[5, 5]}
            cornerRadius={6}
            listening={false}
          />
        );
      }

      return null;
    }, [drawingState, activeTool, activeColor, selectionColor]);

    // Stage is draggable only in pan mode so marquee selection is not stolen by pan
    const isDraggable = activeTool === 'pan';
    const shouldHandleMouseMove = activeTool !== 'pan' || drawingState.isDrawing || isSelecting;
    const shouldHandlePointerMutations = activeTool !== 'pan';

    const handleStageMouseDownWithMiddlePan = useCallback(
      (e: IKonvaMouseEvent) => {
        if (e.evt.button === 1) {
          middlePanStartClientRef.current = {
            x: e.evt.clientX,
            y: e.evt.clientY,
          };
          middlePanStartPositionRef.current = { ...viewport.position };
          setIsMiddlePanning(true);
          e.evt.preventDefault();
          return;
        }

        if (shouldHandlePointerMutations) {
          handleStageMouseDown(e);
        }
      },
      [
        viewport.position,
        shouldHandlePointerMutations,
        handleStageMouseDown,
        middlePanStartClientRef,
        middlePanStartPositionRef,
        setIsMiddlePanning,
      ]
    );

    const handleStageMouseUpWithMiddlePan = useCallback(
      (e: IKonvaMouseEvent) => {
        if (e.evt.button === 1) {
          setIsMiddlePanning(false);
          return;
        }

        if (shouldHandlePointerMutations) {
          void handleStageMouseUp(e);
        }
      },
      [shouldHandlePointerMutations, handleStageMouseUp, setIsMiddlePanning]
    );

    const handleZoomToSelection = useCallback(() => {
      const bounds = getSelectionBounds(objects, selectedIds);
      if (bounds) {
        zoomToFitBounds(bounds);
      }
    }, [objects, selectedIds, zoomToFitBounds]);

    const handleZoomToFitAll = useCallback(() => {
      const bounds = getBoardBounds(objects);
      if (bounds) {
        zoomToFitBounds(bounds);
      } else {
        resetViewport();
      }
    }, [objects, zoomToFitBounds, resetViewport]);

    const handleZoomPreset = useCallback(
      (scale: number) => {
        zoomTo(scale);
      },
      [zoomTo]
    );
    const handleSetZoomLevel = useCallback(
      (percent: number) => {
        handleZoomPreset(percent / 100);
      },
      [handleZoomPreset]
    );

    const handleZoomToObjectIds = useCallback(
      (objectIds: string[]) => {
        const bounds = getSelectionBounds(objects, objectIds);
        if (bounds) {
          zoomToFitBounds(bounds);
        }
      },
      [objects, zoomToFitBounds]
    );
    const handleExportViewport = useCallback(
      (format?: ExportImageFormat) => {
        exportViewport(format ?? 'png');
      },
      [exportViewport]
    );
    const handleExportFullBoard = useCallback(
      (format?: ExportImageFormat) => {
        exportFullBoard(objectsRef.current, zoomToFitBounds, format ?? 'png');
      },
      [exportFullBoard, zoomToFitBounds]
    );
    const viewportActions = useMemo<IViewportActionsValue>(
      () => ({
        zoomToFitAll: handleZoomToFitAll,
        zoomToSelection: handleZoomToObjectIds,
        setZoomLevel: handleSetZoomLevel,
        exportViewport: handleExportViewport,
        exportFullBoard: handleExportFullBoard,
      }),
      [
        handleZoomToFitAll,
        handleZoomToObjectIds,
        handleSetZoomLevel,
        handleExportViewport,
        handleExportFullBoard,
      ]
    );

    useEffect(() => {
      if (!onViewportActionsReady) {
        return;
      }

      onViewportActionsReady(viewportActions);
      return () => {
        onViewportActionsReady(null);
      };
    }, [onViewportActionsReady, viewportActions]);

    return (
      <div
        className={BOARD_CANVAS_CONTAINER_CLASS}
        style={{
          backgroundColor: getBoardCanvasBackgroundColor(theme),
          forcedColorAdjust: 'none',
          colorScheme: theme,
        }}
        data-testid='board-canvas'
        data-selected-count={selectedIds.length}
        data-selected-ids={selectedIds.join(',')}
      >
        {/* Desktop toolbar: visible from md up */}
        <div className='hidden md:block absolute left-4 top-1/2 -translate-y-1/2 z-20'>
          <Toolbar
            activeTool={activeTool}
            onToolChange={(tool) => {
              setActiveTool(tool);
              activeToolRef.current = tool;
            }}
            activeColor={activeColor}
            onColorChange={setActiveColor}
            canEdit={canEdit}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndoHistory}
            canRedo={canRedoHistory}
          />
        </div>

        {/* Mobile: floating Tools button + bottom sheet */}
        <div className='md:hidden fixed bottom-6 left-4 z-30'>
          <Button
            size='icon'
            className='h-12 w-12 rounded-full shadow-lg bg-card border border-border text-card-foreground hover:bg-accent'
            onClick={() => setMobileToolsOpen(true)}
            data-testid='toolbar-mobile-toggle'
            title='Tools'
          >
            <Wrench className='h-6 w-6' />
          </Button>
        </div>
        <Dialog open={mobileToolsOpen} onOpenChange={setMobileToolsOpen}>
          <DialogContent
            className='fixed left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 max-h-[70vh] w-full rounded-t-xl border-t border-border bg-card/95 p-4'
            data-testid='toolbar-mobile-sheet'
          >
            <Toolbar
              embedded
              activeTool={activeTool}
              onToolChange={(tool) => {
                setActiveTool(tool);
                activeToolRef.current = tool;
              }}
              activeColor={activeColor}
              onColorChange={setActiveColor}
              canEdit={canEdit}
            />
          </DialogContent>
        </Dialog>

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
          onMouseMove={shouldHandleMouseMove ? handleStageMouseMove : undefined}
          onMouseDown={handleStageMouseDownWithMiddlePan}
          onMouseUp={handleStageMouseUpWithMiddlePan}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={shouldHandlePointerMutations ? handleStageClick : undefined}
          style={{
            backgroundColor: getBoardCanvasBackgroundColor(theme),
            forcedColorAdjust: 'none',
            cursor:
              groupDragOffset != null
                ? 'grabbing'
                : isHoveringSelectionHandleEffective
                  ? 'grab'
                  : isMiddlePanning
                    ? 'grabbing'
                    : activeTool === 'pan'
                      ? 'grab'
                      : activeTool === 'select'
                        ? 'default'
                        : 'crosshair',
          }}
        >
          {/* Background grid layer - static, no interaction; only when show grid is on */}
          {showGrid && (
            <Layer listening={false} name='grid'>
              {gridNodes}
            </Layer>
          )}

          {/* Objects layer - main content (viewport culled) */}
          <Layer ref={objectsLayerRef} name='objects' listening={activeTool !== 'pan'}>
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
            {/* Transparent draggable rect over selection bounds: drag from empty space inside selection moves whole group */}
            {selectionBounds != null && canEdit && onObjectsUpdate && (
              <Rect
                x={selectionBounds.x1 + (groupDragOffset?.dx ?? 0)}
                y={selectionBounds.y1 + (groupDragOffset?.dy ?? 0)}
                width={selectionBounds.x2 - selectionBounds.x1}
                height={selectionBounds.y2 - selectionBounds.y1}
                fill='transparent'
                name='selection-drag-handle'
                listening={true}
                draggable={true}
                onDragStart={() => {
                  handleSelectionDragStart(selectionBounds);
                }}
                onDragMove={handleSelectionDragMove}
                onDragEnd={handleSelectionDragEnd}
                onMouseEnter={() => setIsHoveringSelectionHandle(true)}
                onMouseLeave={() => setIsHoveringSelectionHandle(false)}
              />
            )}
            {visibleObjectNodes}
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
          {hasRemoteCursors && <CursorLayer cursors={activeCursors} currentUid={user.uid} />}

          {/* Alignment guides - temporary lines during drag */}
          {alignmentGuides != null && <AlignmentGuidesLayer guides={alignmentGuides} />}

          {/* Selection/Transform layer - listening enabled for Transformer, but clicks on Transformer are handled */}
          {activeTool !== 'pan' && (
            <Layer
              name='selection'
              listening={selectedIds.length > 0}
              onClick={(e) => {
                // Prevent clicks on Transformer (anchors, borders, or Transformer itself) from propagating to stage
                const { target } = e;
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
                requestBatchDraw={requestBatchDraw}
                excludedFromTransformIds={linkedConnectorIds}
                onTransformEnd={handleTransformEnd}
              />
            </Layer>
          )}
        </Stage>

        {/* Status indicators and zoom controls */}
        <div className='absolute bottom-4 right-4 flex gap-2 items-center'>
          {/* Grid and snap toggles */}
          <Button
            variant={showGrid ? 'default' : 'ghost'}
            size='icon'
            className={cn(
              'h-9 w-9 rounded-md',
              showGrid
                ? 'bg-primary text-primary-foreground'
                : 'text-card-foreground hover:bg-accent bg-card/80'
            )}
            onClick={() => setShowGrid(!showGrid)}
            title={showGrid ? 'Hide grid' : 'Show grid'}
            data-testid='toggle-show-grid'
          >
            <Grid3X3 className='h-4 w-4' />
          </Button>
          <Button
            variant={snapToGridEnabled ? 'default' : 'ghost'}
            size='icon'
            className={cn(
              'h-9 w-9 rounded-md',
              snapToGridEnabled
                ? 'bg-primary text-primary-foreground'
                : 'text-card-foreground hover:bg-accent bg-card/80'
            )}
            onClick={() => setSnapToGridEnabled(!snapToGridEnabled)}
            title={snapToGridEnabled ? 'Disable snap to grid' : 'Enable snap to grid'}
            data-testid='toggle-snap-to-grid'
          >
            <Magnet className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-9 w-9 text-card-foreground hover:bg-accent bg-card/80 rounded-md'
            onClick={() => exportViewport('png')}
            title='Export current view as PNG'
            data-testid='export-viewport-png'
          >
            <Download className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-9 w-9 text-card-foreground hover:bg-accent bg-card/80 rounded-md'
            onClick={() => exportFullBoard(objects, zoomToFitBounds, 'png')}
            title='Export full board as PNG'
            data-testid='export-full-board-png'
          >
            <Download className='h-4 w-4' />
          </Button>
          {onObjectUpdate != null && (
            <AlignToolbar
              objects={objects}
              selectedIds={selectedIds}
              onObjectUpdate={onObjectUpdate}
              canEdit={canEdit}
            />
          )}
          {/* Object count (visible/total) */}
          <div
            className='bg-card/80 text-card-foreground px-3 py-1.5 rounded-md text-sm font-medium backdrop-blur-sm'
            data-testid='object-count'
          >
            {visibleObjects.length}/{objects.length}
          </div>
          {/* Zoom to selection */}
          <Button
            variant='ghost'
            size='icon'
            className='h-9 w-9 text-card-foreground hover:bg-accent bg-card/80 rounded-md'
            onClick={handleZoomToSelection}
            disabled={selectedIds.length === 0}
            title='Zoom to selection'
            data-testid='zoom-to-selection'
          >
            <Focus className='h-4 w-4' />
          </Button>
          {/* Zoom to fit all */}
          <Button
            variant='ghost'
            size='icon'
            className='h-9 w-9 text-card-foreground hover:bg-accent bg-card/80 rounded-md'
            onClick={handleZoomToFitAll}
            title='Zoom to fit all'
            data-testid='zoom-to-fit-all'
          >
            <Maximize2 className='h-4 w-4' />
          </Button>
          {/* Zoom presets */}
          {ZOOM_PRESETS.map((scale) => (
            <Button
              key={scale}
              variant='ghost'
              size='sm'
              className='h-9 px-2 text-card-foreground hover:bg-accent bg-card/80 rounded-md text-xs font-medium'
              onClick={() => handleZoomPreset(scale)}
              title={`${scale * 100}%`}
              data-testid={`zoom-preset-${scale * 100}`}
            >
              {scale * 100}%
            </Button>
          ))}
          {/* Zoom indicator */}
          <div
            className='bg-card/80 text-card-foreground px-3 py-1.5 rounded-md text-sm font-medium backdrop-blur-sm'
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
