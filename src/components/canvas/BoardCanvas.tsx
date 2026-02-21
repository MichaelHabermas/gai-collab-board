import { Stage, Layer, Rect, Shape, Group } from 'react-konva';
import { TransformHandler } from './TransformHandler';
import { SelectionLayer } from './SelectionLayer';
import { useRef, useCallback, useState, useEffect, useMemo, memo, type ReactElement } from 'react';
import Konva from 'konva';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import { CursorLayer } from './CursorLayer';
import {
  DEFAULT_STICKY_WIDTH,
  DEFAULT_STICKY_HEIGHT,
  DEFAULT_TEXT_WIDTH,
  DEFAULT_TEXT_HEIGHT,
  DEFAULT_TEXT_FONT_SIZE,
  STICKY_COLORS,
} from '@/lib/boardObjectDefaults';
import { CanvasToolbarWrapper } from './CanvasToolbarWrapper';
import { CanvasControlPanel } from './CanvasControlPanel';
import { StoreShapeRenderer } from './StoreShapeRenderer';
import { useCursors } from '@/hooks/useCursors';
import { useVisibleShapeIds } from '@/hooks/useVisibleShapeIds';
import { useCanvasOperations } from '@/hooks/useCanvasOperations';
import { useConnectorCreation } from '@/hooks/useConnectorCreation';
import { useShapeDrawing, isDrawingTool } from '@/hooks/useShapeDrawing';
import { useMarqueeSelection } from '@/hooks/useMarqueeSelection';
import { useObjectDragHandlers } from '@/hooks/useObjectDragHandlers';

import { useBatchDraw } from '@/hooks/useBatchDraw';
import { useBoardCanvasRefSync } from '@/hooks/useBoardCanvasRefSync';
import { useSelectionStore } from '@/stores/selectionStore';
import { useObjectsStore } from '@/stores/objectsStore';
import type { User } from 'firebase/auth';
import type {
  IBoardObject,
  IPosition,
  IViewportState,
  ToolMode,
  IKonvaMouseEvent,
  IKonvaDragEvent,
} from '@/types';
import type { ICreateObjectParams } from '@/modules/sync/objectService';
import { ConnectionNodesLayer } from './ConnectionNodesLayer';
import { AlignmentGuidesLayer } from './AlignmentGuidesLayer';
import { useExportAsImage } from '@/hooks/useExportAsImage';
import { useViewportActions } from '@/hooks/useViewportActions';
import { useTheme } from '@/hooks/useTheme';
import {
  getBoardCanvasBackgroundColor,
  getBoardGridColor,
  BOARD_CANVAS_CONTAINER_CLASS,
} from './boardCanvasTheme';
import { useBoardSettings } from '@/hooks/useBoardSettings';
import { useMiddleMousePanListeners } from '@/hooks/useMiddleMousePanListeners';
import { useCanvasKeyboardShortcuts } from '@/hooks/useCanvasKeyboardShortcuts';
import { useHistoryStore } from '@/stores/historyStore';
import { useDragOffsetStore, selectGroupDragOffset } from '@/stores/dragOffsetStore';

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
  onUndo?: () => void;
  onRedo?: () => void;
}

// Grid pattern configuration (display and snap use same size per PRD)
const GRID_SIZE = 20;
const GRID_STROKE_WIDTH = 1;
export const GRID_LINE_OPACITY = 0.5;

/**
 * Isolated selection drag handle — subscribes to groupDragOffset at 60Hz
 * so BoardCanvas itself doesn't re-render during group drag.
 */
const SelectionDragHandle = memo(
  ({
    selectionBounds,
    onDragStart,
    onDragMove,
    onDragEnd,
    onMouseEnter,
    onMouseLeave,
  }: {
    selectionBounds: { x1: number; y1: number; x2: number; y2: number };
    onDragStart: () => void;
    onDragMove: (e: IKonvaDragEvent) => void;
    onDragEnd: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  }) => {
    const groupDragOffset = useDragOffsetStore(selectGroupDragOffset);

    return (
      <Rect
        x={selectionBounds.x1 + (groupDragOffset?.dx ?? 0)}
        y={selectionBounds.y1 + (groupDragOffset?.dy ?? 0)}
        width={selectionBounds.x2 - selectionBounds.x1}
        height={selectionBounds.y2 - selectionBounds.y1}
        fill='transparent'
        name='selection-drag-handle'
        listening={true}
        draggable={true}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
    );
  }
);
SelectionDragHandle.displayName = 'SelectionDragHandle';

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
    onUndo,
    onRedo,
  }: IBoardCanvasProps): ReactElement => {
    const stageRef = useRef<Konva.Stage>(null);
    const staticLayerRef = useRef<Konva.Layer>(null);
    const activeLayerRef = useRef<Konva.Layer>(null);
    const { requestBatchDraw } = useBatchDraw();
    const [activeTool, setActiveTool] = useState<ToolMode>('select');
    const activeToolRef = useRef<ToolMode>('select');
    const [activeColor, setActiveColor] = useState<string>(STICKY_COLORS.yellow);
    const selectedIds = useSelectionStore((state) => state.selectedIds);
    const objectsRecord = useObjectsStore((s) => s.objects);
    const canUndoHistory = useHistoryStore((s) => s.canUndo);
    const canRedoHistory = useHistoryStore((s) => s.canRedo);
    const setSelectedIds = useSelectionStore((state) => state.setSelectedIds);
    const toggleSelectedId = useSelectionStore((state) => state.toggleSelectedId);
    const clearSelectionFromStore = useSelectionStore((state) => state.clearSelection);
    const drawing = useShapeDrawing();
    const { drawingState, drawingActiveRef } = drawing;
    const marquee = useMarqueeSelection();
    const {
      selectionRect,
      isSelecting,
      selectingActiveRef,
      justDidMarqueeRef: justDidMarqueeSelectionRef,
    } = marquee;
    // Boolean-only selector: re-renders only on start/end of group drag, not every frame
    const isGroupDragging = useDragOffsetStore((s) => s.groupDragOffset != null);
    // Phase 2: track WHICH frame is being dragged (stable during drag — only changes on start/end)
    const draggingFrameId = useDragOffsetStore((s) => s.frameDragOffset?.frameId ?? null);
    const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
    const objectsRecordRef = useRef<Record<string, IBoardObject>>(objectsRecord);
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

    useBoardCanvasRefSync(objectsRecord, activeTool, objectsRecordRef, activeToolRef);

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

    // Store-driven visible IDs for per-shape subscription render loop (A.5 optimization).
    // Already sorted with frames first (render order).
    const visibleShapeIds = useVisibleShapeIds(viewport);
    const visibleObjectIdsKey = useMemo(() => visibleShapeIds.join('|'), [visibleShapeIds]);

    // --- Object drag/selection/transform handlers (extracted hook) ---
    const {
      handleObjectSelect,
      handleObjectDragEnd,
      handleSelectionDragStart,
      handleSelectionDragMove,
      handleSelectionDragEnd,
      handleEnterFrame,
      handleTransformEnd,
      getSelectHandler,
      getDragEndHandler,
      getTextChangeHandler,
      getDragBoundFunc,
      selectionBounds,
      alignmentGuides,
      isHoveringSelectionHandleEffective,
      setIsHoveringSelectionHandle,
      onDragMoveProp,
    } = useObjectDragHandlers({
      objectsRecord,
      selectedIds,
      setSelectedIds,
      toggleSelectedId,
      snapToGridEnabled,
      canEdit,
      onObjectUpdate,
      onObjectsUpdate,
      visibleShapeIds,
      visibleObjectIdsKey,
    });

    // Linked connectors are excluded from transform (selectable for deletion only). O(record) by key, no full array.
    const linkedConnectorIds = useMemo(() => {
      const ids: string[] = [];
      for (const id in objectsRecord) {
        const o = objectsRecord[id];
        if (o?.type === 'connector' && o.fromObjectId != null && o.toObjectId != null) {
          ids.push(id);
        }
      }
      return ids;
    }, [objectsRecord]);
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

    useCanvasKeyboardShortcuts({
      setActiveTool,
      canEdit,
      activeToolRef,
      onUndo,
      onRedo,
    });

    const { handleConnectorNodeClick, clearConnector } = useConnectorCreation({
      objectsRecord,
      activeColor,
      onObjectCreate,
      setActiveTool,
      activeToolRef,
    });

    // Clear selection helper
    const clearSelection = useCallback(() => {
      clearSelectionFromStore();
    }, [clearSelectionFromStore]);

    // Canvas operations (delete, duplicate, copy, paste)
    // Type assertion needed because useCanvasOperations uses a more permissive type
    const selectedIdsArray = useMemo(() => [...selectedIds], [selectedIds]);
    useCanvasOperations({
      objectsRecord,
      selectedIds: selectedIdsArray,
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

    // Handle mouse move — dispatches to drawing/marquee hooks via RAF throttle
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
              drawing.onDrawMove(pendingPointer);
            }

            if (selectingActiveRef.current) {
              marquee.onMarqueeMove(pendingPointer);
            }
          });
        }
      },
      [handleMouseMove, getCanvasCoords, drawing, marquee, drawingActiveRef, selectingActiveRef]
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

        const coords = getCanvasCoords(stage, pointer);

        if (isDrawingTool(activeTool) && activeTool !== 'connector' && canEdit) {
          drawing.onDrawStart(coords);

          return;
        }

        if (activeTool === 'select') {
          marquee.onMarqueeStart(coords);
        }
      },
      [activeTool, canEdit, getCanvasCoords, isEmptyAreaClick, drawing, marquee]
    );

    // Handle mouse up — dispatches to drawing/marquee hooks
    const handleStageMouseUp = useCallback(
      async (e: IKonvaMouseEvent) => {
        if (drawingState.isDrawing && onObjectCreate) {
          await drawing.onDrawEnd(activeTool, activeColor, onObjectCreate, () => {
            setActiveTool('select');
            activeToolRef.current = 'select';
          });
        }

        marquee.onMarqueeEnd(e, objectsRecord, getCanvasCoords, setSelectedIds);

        if (pointerFrameRef.current != null) {
          cancelAnimationFrame(pointerFrameRef.current);
          pointerFrameRef.current = null;
        }

        pendingPointerRef.current = null;
      },
      [
        drawingState.isDrawing,
        activeTool,
        activeColor,
        onObjectCreate,
        objectsRecord,
        getCanvasCoords,
        setSelectedIds,
        drawing,
        marquee,
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
              x: canvasX - DEFAULT_STICKY_WIDTH / 2,
              y: canvasY - DEFAULT_STICKY_HEIGHT / 2,
              width: DEFAULT_STICKY_WIDTH,
              height: DEFAULT_STICKY_HEIGHT,
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
              width: DEFAULT_TEXT_WIDTH,
              height: DEFAULT_TEXT_HEIGHT,
              fill: activeColor === STICKY_COLORS.yellow ? '#1f2937' : activeColor,
              text: '',
              fontSize: DEFAULT_TEXT_FONT_SIZE,
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
            clearConnector();
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
        clearConnector,
        justDidMarqueeSelectionRef,
      ]
    );

    // (handleObjectSelect, handleObjectDragEnd, etc. extracted to useObjectDragHandlers)

    /** Single Konva Shape that draws all grid lines via sceneFunc — replaces ~200 Rect nodes. */
    const gridSceneFunc = useMemo(() => {
      if (!showGrid) return undefined;

      const { position, scale, width, height } = viewport;
      const startX = Math.floor(-position.x / scale.x / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
      const endX = Math.ceil((-position.x + width) / scale.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE;
      const startY = Math.floor(-position.y / scale.y / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
      const endY = Math.ceil((-position.y + height) / scale.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE;
      const lineWidthX = GRID_STROKE_WIDTH / scale.x;
      const lineWidthY = GRID_STROKE_WIDTH / scale.y;
      const color = gridColor;

      return (ctx: Konva.Context) => {
        ctx.setAttr('globalAlpha', GRID_LINE_OPACITY);
        ctx.setAttr('fillStyle', color);

        // Vertical lines
        for (let x = startX; x <= endX; x += GRID_SIZE) {
          ctx.fillRect(x, startY, lineWidthX, endY - startY);
        }
        // Horizontal lines
        for (let y = startY; y <= endY; y += GRID_SIZE) {
          ctx.fillRect(startX, y, endX - startX, lineWidthY);
        }
      };
    }, [showGrid, viewport, gridColor]);

    // Phase 2: partition visible shapes into static (idle) and active (selected/dragged) layers.
    // Static layer doesn't redraw during drag — only the active layer redraws at 60Hz.
    const [staticIds, activeIds] = useMemo(() => {
      const activeSet = new Set<string>(selectedIds);

      // During single-frame drag, include frame children in active layer
      // so they move visually with the frame without forcing static layer redraws.
      if (draggingFrameId) {
        const childIds = useObjectsStore.getState().frameChildrenIndex.get(draggingFrameId);
        if (childIds) {
          for (const cid of childIds) activeSet.add(cid);
        }
      }

      const static_: string[] = [];
      const active_: string[] = [];

      for (const id of visibleShapeIds) {
        if (activeSet.has(id)) {
          active_.push(id);
        } else {
          static_.push(id);
        }
      }

      return [static_, active_] as const;
    }, [visibleShapeIds, selectedIds, draggingFrameId]);

    // Phase 4: disable hit-testing when shapes aren't interactive (draw/pan modes).
    // Eliminates O(visible) hit-test traversal on every mouse event during creation tools.
    const shapesListening = activeTool === 'select' || activeTool === 'connector';

    // Per-shape subscription render loop (A.5): each StoreShapeRenderer subscribes
    // to its own object in the Zustand store, so a single remote object change only
    // re-renders that one shape instead of the entire tree.
    const shapeRendererProps = useMemo(
      () => ({
        canEdit,
        selectionColor,
        onEnterFrame: handleEnterFrame,
        getSelectHandler,
        getDragEndHandler,
        getTextChangeHandler,
        getDragBoundFunc,
        onDragMove: onDragMoveProp,
        handleObjectSelect,
        handleObjectDragEnd,
      }),
      [
        canEdit,
        selectionColor,
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

    const staticObjectNodes = useMemo(
      () => staticIds.map((id) => <StoreShapeRenderer key={id} id={id} {...shapeRendererProps} />),
      [staticIds, shapeRendererProps]
    );

    const activeObjectNodes = useMemo(
      () => activeIds.map((id) => <StoreShapeRenderer key={id} id={id} {...shapeRendererProps} />),
      [activeIds, shapeRendererProps]
    );

    // Drawing preview delegates to hook
    const drawingPreview = drawing.renderDrawingPreview(activeTool, activeColor, selectionColor);

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

    const { handleZoomToSelection, handleZoomToFitAll, handleZoomPreset, handleExportFullBoard } =
      useViewportActions({
        objectsRecord,
        selectedIds,
        zoomToFitBounds,
        resetViewport,
        zoomTo,
        exportViewport,
        exportFullBoard,
        objectsRecordRef,
      });

    return (
      <div
        className={BOARD_CANVAS_CONTAINER_CLASS}
        style={{
          backgroundColor: getBoardCanvasBackgroundColor(theme),
          forcedColorAdjust: 'none',
          colorScheme: theme,
        }}
        data-testid='board-canvas'
        data-selected-count={selectedIds.size}
        data-selected-ids={[...selectedIds].join(',')}
      >
        <CanvasToolbarWrapper
          activeTool={activeTool}
          onToolChange={(tool) => {
            setActiveTool(tool);
            activeToolRef.current = tool;
          }}
          activeColor={activeColor}
          onColorChange={setActiveColor}
          canEdit={canEdit}
          mobileToolsOpen={mobileToolsOpen}
          setMobileToolsOpen={setMobileToolsOpen}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndoHistory}
          canRedo={canRedoHistory}
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
          onMouseMove={shouldHandleMouseMove ? handleStageMouseMove : undefined}
          onMouseDown={handleStageMouseDownWithMiddlePan}
          onMouseUp={handleStageMouseUpWithMiddlePan}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={shouldHandlePointerMutations ? handleStageClick : undefined}
          style={{
            backgroundColor: getBoardCanvasBackgroundColor(theme),
            forcedColorAdjust: 'none',
            cursor: isGroupDragging
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
          {/* Static shapes layer — grid + objects; only redraws on add/delete/property changes, NOT during drag */}
          <Layer ref={staticLayerRef} name='objects-static' listening={shapesListening}>
            {/* Background grid - single Shape draws all lines; no interaction */}
            {gridSceneFunc && (
              <Group listening={false} name='grid'>
                <Shape sceneFunc={gridSceneFunc} listening={false} perfectDrawEnabled={false} />
              </Group>
            )}
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
            {staticObjectNodes}
          </Layer>

          {/* Active shapes layer — selected/dragged shapes, redraws at 60Hz during drag */}
          <Layer ref={activeLayerRef} name='objects-active' listening={shapesListening}>
            {/* Selection drag handle — subscribes to offset independently to avoid 60Hz BoardCanvas re-renders */}
            {selectionBounds != null && canEdit && onObjectsUpdate && (
              <SelectionDragHandle
                selectionBounds={selectionBounds}
                onDragStart={() => handleSelectionDragStart(selectionBounds)}
                onDragMove={handleSelectionDragMove}
                onDragEnd={handleSelectionDragEnd}
                onMouseEnter={() => setIsHoveringSelectionHandle(true)}
                onMouseLeave={() => setIsHoveringSelectionHandle(false)}
              />
            )}
            {activeObjectNodes}
          </Layer>

          {/* Overlay layer — drawing preview, connector nodes, cursors, alignment guides */}
          <Layer name='overlay' listening={activeTool === 'connector'}>
            {/* Drawing preview + marquee selection */}
            <Group listening={false} name='drawing'>
              {drawingPreview}
              <SelectionLayer selectionRect={selectionRect} />
            </Group>

            {/* Connection nodes (when connector tool active) */}
            {activeTool === 'connector' && (
              <Group name='connector-nodes' listening={true}>
                <ConnectionNodesLayer
                  shapeIds={visibleShapeIds}
                  onNodeClick={handleConnectorNodeClick}
                />
              </Group>
            )}

            {/* Cursor layer - other users' cursors */}
            {hasRemoteCursors && <CursorLayer cursors={activeCursors} currentUid={user.uid} />}

            {/* Alignment guides - temporary lines during drag */}
            {alignmentGuides != null && <AlignmentGuidesLayer guides={alignmentGuides} />}
          </Layer>

          {/* Selection/Transform layer - listening enabled for Transformer, but clicks on Transformer are handled */}
          {activeTool !== 'pan' && (
            <Layer
              name='selection'
              listening={selectedIds.size > 0}
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
                selectedIds={selectedIdsArray}
                layerRef={activeLayerRef}
                requestBatchDraw={requestBatchDraw}
                excludedFromTransformIds={linkedConnectorIds}
                onTransformEnd={handleTransformEnd}
              />
            </Layer>
          )}
        </Stage>

        <CanvasControlPanel
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          snapToGridEnabled={snapToGridEnabled}
          setSnapToGridEnabled={setSnapToGridEnabled}
          exportViewport={exportViewport}
          onExportFullBoard={handleExportFullBoard}
          objectsRecord={objectsRecord}
          handleZoomToSelection={handleZoomToSelection}
          handleZoomToFitAll={handleZoomToFitAll}
          handleZoomPreset={handleZoomPreset}
          selectedIds={selectedIds}
          selectedIdsArray={selectedIdsArray}
          visibleCount={visibleShapeIds.length}
          zoomPercent={Math.round(viewport.scale.x * 100)}
          onObjectUpdate={onObjectUpdate}
          canEdit={canEdit}
        />
      </div>
    );
  }
);

BoardCanvas.displayName = 'BoardCanvas';
