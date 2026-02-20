import { Stage, Layer, Rect, Shape } from 'react-konva';
import { TransformHandler } from './TransformHandler';
import { SelectionLayer } from './SelectionLayer';
import { useRef, useCallback, useState, useEffect, useMemo, memo, type ReactElement } from 'react';
import Konva from 'konva';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import { CursorLayer } from './CursorLayer';
import { STICKY_COLORS } from './shapes';
import { CanvasToolbarWrapper } from './CanvasToolbarWrapper';
import { CanvasControlPanel } from './CanvasControlPanel';
import { StoreShapeRenderer } from './StoreShapeRenderer';
import { useCursors } from '@/hooks/useCursors';
import { useVisibleShapeIds } from '@/hooks/useVisibleShapeIds';
import { useCanvasOperations } from '@/hooks/useCanvasOperations';
import { useConnectorCreation } from '@/hooks/useConnectorCreation';
import { useShapeDrawing, isDrawingTool } from '@/hooks/useShapeDrawing';
import { useMarqueeSelection } from '@/hooks/useMarqueeSelection';

import { useBatchDraw } from '@/hooks/useBatchDraw';
import { useSelectionStore } from '@/stores/selectionStore';
import { useObjectsStore, spatialIndex } from '@/stores/objectsStore';
import type { User } from 'firebase/auth';
import type {
  IBoardObject,
  IPosition,
  ITransformEndAttrs,
  IViewportState,
  IAlignmentGuides,
  IAlignmentCandidate,
  ToolMode,
  IKonvaMouseEvent,
  IKonvaDragEvent,
} from '@/types';
import type { ICreateObjectParams } from '@/modules/sync/objectService';
import { getSelectionBounds } from '@/lib/canvasBounds';
import {
  computeAlignmentGuidesWithCandidates,
  computeSnappedPositionFromGuides,
} from '@/lib/alignmentGuides';
import { getWidthHeightFromPoints } from '@/lib/lineTransform';
import {
  applySnapPositionToNode,
  snapPositionToGrid,
  snapResizeRectToGrid,
} from '@/lib/snapToGrid';
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
import { useAlignmentGuideCache } from '@/hooks/useAlignmentGuideCache';
import { useHistoryStore } from '@/stores/historyStore';
import { useDragOffsetStore } from '@/stores/dragOffsetStore';
import {
  resolveParentFrameIdFromFrames,
  findContainingFrame,
} from '@/hooks/useFrameContainment';
import { perfTime } from '@/lib/perfTimer';
import { queueWrite } from '@/lib/writeQueue';

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

// Default sizes for new objects
const DEFAULT_STICKY_SIZE = { width: 200, height: 200 };

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
    const objects = useMemo(() => Object.values(objectsRecord) as IBoardObject[], [objectsRecord]);
    const canUndoHistory = useHistoryStore((s) => s.canUndo);
    const canRedoHistory = useHistoryStore((s) => s.canRedo);
    const setSelectedIds = useSelectionStore((state) => state.setSelectedIds);
    const toggleSelectedId = useSelectionStore((state) => state.toggleSelectedId);
    const clearSelectionFromStore = useSelectionStore((state) => state.clearSelection);
    const drawing = useShapeDrawing();
    const { drawingState, drawingActiveRef } = drawing;
    const marquee = useMarqueeSelection();
    const { selectionRect, isSelecting, selectingActiveRef, justDidMarqueeRef: justDidMarqueeSelectionRef } = marquee;
    /** Bounds at start of selection-drag-handle drag (used in onDragMove/onDragEnd). */
    const selectionDragBoundsRef = useRef<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    } | null>(null);
    const groupDragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
    // Transient drag state lives in Zustand (dragOffsetStore) to avoid
    // re-rendering every visible shape on every mousemove.  We read the setters once
    // (stable refs) and never subscribe to the values in BoardCanvas itself.
    const setFrameDragOffset = useDragOffsetStore((s) => s.setFrameDragOffset);
    const setDropTargetFrameId = useDragOffsetStore((s) => s.setDropTargetFrameId);
    const setGroupDragOffset = useDragOffsetStore((s) => s.setGroupDragOffset);
    // Subscribe to groupDragOffset only for the selection rect and cursor — visibleObjectNodes
    // useMemo no longer depends on it, so the O(n) JSX is never recreated during drag.
    const groupDragOffset = useDragOffsetStore((s) => s.groupDragOffset);
    const clearDragState = useDragOffsetStore((s) => s.clearDragState);
    // Phase 2: track WHICH frame is being dragged (stable during drag — only changes on start/end)
    // so we can move its children to the active layer without 60Hz invalidation.
    const draggingFrameId = useDragOffsetStore((s) => s.frameDragOffset?.frameId ?? null);
    const [isHoveringSelectionHandle, setIsHoveringSelectionHandle] = useState(false);
    const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
    const [alignmentGuides, setAlignmentGuides] = useState<IAlignmentGuides | null>(null);
    const objectsRef = useRef<IBoardObject[]>(objects);
    const pendingPointerRef = useRef<IPosition | null>(null);
    const pointerFrameRef = useRef<number | null>(null);
    const viewportPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** Tracks whether spatial index dragging exemption has been set for the current individual shape drag. */
    const dragExemptionSetRef = useRef(false);

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
    }, [activeTool]);

    useCanvasKeyboardShortcuts({
      setActiveTool,
      canEdit,
      activeToolRef,
      onUndo,
      onRedo,
    });

    const { handleConnectorNodeClick, clearConnector } = useConnectorCreation({
      objects,
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
      objects,
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

        marquee.onMarqueeEnd(e, objects, getCanvasCoords, setSelectedIds);

        if (pointerFrameRef.current != null) {
          cancelAnimationFrame(pointerFrameRef.current);
          pointerFrameRef.current = null;
        }

        pendingPointerRef.current = null;
      },
      [drawingState.isDrawing, activeTool, activeColor, onObjectCreate, objects, getCanvasCoords, setSelectedIds, drawing, marquee]
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

    // Handle object selection
    const handleObjectSelect = useCallback(
      (objectId: string, e?: IKonvaMouseEvent) => {
        const metaPressed = e?.evt.shiftKey || e?.evt.ctrlKey || e?.evt.metaKey;

        if (metaPressed) {
          // Toggle selection
          toggleSelectedId(objectId);
        } else {
          // Single select
          setSelectedIds([objectId]);
        }
      },
      [setSelectedIds, toggleSelectedId]
    );

    // Handle object drag end (optionally snap position to grid); clear alignment guides.
    // When multiple objects are selected, apply same delta to all (batch update).
    // When a frame is dragged, its children move with it (same delta).
    // After any non-frame/non-connector drag, resolve parentFrameId via spatial containment.
    const handleObjectDragEnd = useCallback(
      (objectId: string, x: number, y: number) => {
        setAlignmentGuides(null);
        const draggedObj = objectsById.get(objectId);
        if (!draggedObj) return;

        const multiSelected =
          selectedIds.size > 1 && selectedIds.has(objectId) && onObjectsUpdate;

        if (multiSelected) {
          const updates = perfTime(
            'handleObjectDragEnd:multi',
            { selected: selectedIds.size, objects: objects.length },
            () => {
              const dx = x - draggedObj.x;
              const dy = y - draggedObj.y;
              const batch: Array<{ objectId: string; updates: Partial<IBoardObject> }> = [];

              // Cache frames once for the entire loop — O(n) filter runs ONCE, not per-selected-object
              const frames = objects.filter((o) => o.type === 'frame');
              const childIndex = useObjectsStore.getState().frameChildrenIndex;

              // Collect IDs being moved so we skip reparenting for frame children already in selection
              const movedIds = new Set<string>(selectedIds);

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
                  const childIds = childIndex.get(obj.id);
                  if (childIds) {
                    for (const childId of childIds) {
                      if (movedIds.has(childId)) continue;

                      const child = objectsById.get(childId);
                      if (!child) continue;

                      let cx = child.x + dx;
                      let cy = child.y + dy;
                      if (snapToGridEnabled) {
                        const snapped = snapPositionToGrid(cx, cy, GRID_SIZE);
                        cx = snapped.x;
                        cy = snapped.y;
                      }

                      batch.push({ objectId: childId, updates: { x: cx, y: cy } });
                      movedIds.add(childId);
                    }
                  }
                }

                // Resolve reparenting for non-frame, non-connector objects
                if (obj.type !== 'frame' && obj.type !== 'connector') {
                  const newBounds = {
                    x1: newX,
                    y1: newY,
                    x2: newX + obj.width,
                    y2: newY + obj.height,
                  };
                  const newParent = resolveParentFrameIdFromFrames(obj, newBounds, frames);
                  if (newParent !== obj.parentFrameId) {
                    objUpdates.parentFrameId = newParent ?? '';
                  }
                }

                batch.push({ objectId: id, updates: objUpdates });
              }

              return batch;
            }
          );

          if (updates.length > 0) {
            onObjectsUpdate(updates);
          }

          spatialIndex.clearDragging();
          dragExemptionSetRef.current = false;

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

        // Frame drag: move children with it (use store index, not O(n) filter)
        if (draggedObj.type === 'frame' && onObjectsUpdate) {
          const dx = finalX - draggedObj.x;
          const dy = finalY - draggedObj.y;
          const childIds = useObjectsStore.getState().frameChildrenIndex.get(draggedObj.id);
          if (childIds && childIds.size > 0) {
            const batchUpdates: Array<{ objectId: string; updates: Partial<IBoardObject> }> = [
              { objectId, updates: singleUpdates },
            ];
            for (const childId of childIds) {
              const child = objectsById.get(childId);
              if (!child) continue;

              let cx = child.x + dx;
              let cy = child.y + dy;
              if (snapToGridEnabled) {
                const snapped = snapPositionToGrid(cx, cy, GRID_SIZE);
                cx = snapped.x;
                cy = snapped.y;
              }

              batchUpdates.push({ objectId: childId, updates: { x: cx, y: cy } });
            }
            onObjectsUpdate(batchUpdates);
            spatialIndex.clearDragging();
            dragExemptionSetRef.current = false;

            return;
          }
        }

        // Non-frame single drag: resolve reparenting (single call, O(n) filter is fine)
        if (draggedObj.type !== 'frame' && draggedObj.type !== 'connector') {
          const newBounds = {
            x1: finalX,
            y1: finalY,
            x2: finalX + draggedObj.width,
            y2: finalY + draggedObj.height,
          };
          const singleFrames = objects.filter((o) => o.type === 'frame');
          const newParent = resolveParentFrameIdFromFrames(draggedObj, newBounds, singleFrames);
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
                spatialIndex.clearDragging();
                dragExemptionSetRef.current = false;

                return;
              }
            }
          }
        }

        onObjectUpdate?.(objectId, singleUpdates);

        // Phase 3: clear spatial index drag exemption now that positions are committed
        spatialIndex.clearDragging();
        dragExemptionSetRef.current = false;
      },
      [onObjectUpdate, onObjectsUpdate, snapToGridEnabled, selectedIds, objectsById, objects]
    );

    // Selection bounds when 2+ selected (for draggable handle over empty space in selection)
    const selectionBounds = useMemo(() => {
      if (selectedIds.size < 2) {
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

        // Phase 3: mark all selected (+ frame children) as dragging in spatial index
        const dragIds = new Set<string>(selectedIds);
        const childIndex = useObjectsStore.getState().frameChildrenIndex;
        for (const sid of selectedIds) {
          const obj = objectsById.get(sid);
          if (obj?.type === 'frame') {
            const children = childIndex.get(sid);
            if (children) for (const cid of children) dragIds.add(cid);
          }
        }

        spatialIndex.setDragging(dragIds);
      },
      [selectedIds, objectsById]
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
    }, [setGroupDragOffset]);

    const handleSelectionDragEnd = useCallback(() => {
      const b = selectionDragBoundsRef.current;
      if (!b || !onObjectsUpdate) {
        selectionDragBoundsRef.current = null;
        setGroupDragOffset(null);
        spatialIndex.clearDragging();

        return;
      }

      const updates = perfTime(
        'handleSelectionDragEnd',
        { selected: selectedIds.size, objects: objects.length },
        () => {
          const { dx, dy } = groupDragOffsetRef.current;
          const batch: Array<{ objectId: string; updates: Partial<IBoardObject> }> = [];
          const movedIds = new Set(selectedIds);

          // Cache frames once for the entire loop — O(n) filter runs ONCE, not per-selected-object
          const frames = objects.filter((o) => o.type === 'frame');
          const childIndex = useObjectsStore.getState().frameChildrenIndex;

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

            // Frame in selection: also move children not already in selection (O(1) index lookup)
            if (obj.type === 'frame') {
              const childIds = childIndex.get(obj.id);
              if (childIds) {
                for (const childId of childIds) {
                  if (movedIds.has(childId)) continue;

                  const child = objectsById.get(childId);
                  if (!child) continue;

                  const cx = child.x + dx + snapOffsetX;
                  const cy = child.y + dy + snapOffsetY;

                  batch.push({ objectId: childId, updates: { x: cx, y: cy } });
                  movedIds.add(childId);
                }
              }
            }

            // Reparent non-frame, non-connector objects (uses pre-cached frames list)
            if (obj.type !== 'frame' && obj.type !== 'connector') {
              const newBounds = {
                x1: newX,
                y1: newY,
                x2: newX + obj.width,
                y2: newY + obj.height,
              };
              const newParent = resolveParentFrameIdFromFrames(obj, newBounds, frames);
              if (newParent !== obj.parentFrameId) {
                objUpdates.parentFrameId = newParent ?? '';
              }
            }

            batch.push({ objectId: id, updates: objUpdates });
          }

          return batch;
        }
      );

      if (updates.length > 0) {
        onObjectsUpdate(updates);
      }

      selectionDragBoundsRef.current = null;
      setGroupDragOffset(null);
      spatialIndex.clearDragging();
    }, [onObjectsUpdate, selectedIds, objectsById, snapToGridEnabled, objects, setGroupDragOffset]);

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
    }, [setGuidesThrottled]);

    const { guideCandidateBoundsRef, dragBoundFuncCacheRef } = useAlignmentGuideCache({
      visibleShapeIds,
      visibleObjectIdsKey,
      snapToGridEnabled,
    });

    const getDragBoundFunc = useCallback(
      (objectId: string, width: number, height: number) => {
        const cached = dragBoundFuncCacheRef.current.get(objectId);
        if (cached && cached.width === width && cached.height === height) {
          return cached.fn;
        }

        // Build Map for O(1) candidate lookup (runs once per cache miss, not at 60Hz)
        const candidateMap = new Map<string, IAlignmentCandidate>();
        for (const c of guideCandidateBoundsRef.current) {
          if (c.id !== objectId) candidateMap.set(c.id, c.candidate);
        }

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

          // Narrow alignment candidates via spatial index (O(cells) vs O(all visible))
          const SNAP_EXPAND = 4;
          let nearbyCandidates: IAlignmentCandidate[];
          if (spatialIndex.size > 0) {
            const nearbyIds = spatialIndex.query({
              x1: dragged.x1 - SNAP_EXPAND,
              y1: dragged.y1 - SNAP_EXPAND,
              x2: dragged.x2 + SNAP_EXPAND,
              y2: dragged.y2 + SNAP_EXPAND,
            });
            nearbyCandidates = [];
            for (const id of nearbyIds) {
              const candidate = candidateMap.get(id);
              if (candidate) nearbyCandidates.push(candidate);
            }
          } else {
            nearbyCandidates = Array.from(candidateMap.values());
          }

          const guides = computeAlignmentGuidesWithCandidates(dragged, nearbyCandidates);
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

    // Handle text change for sticky notes — optimistic store update + debounced Firestore write
    const handleTextChange = useCallback(
      (objectId: string, text: string) => {
        useObjectsStore.getState().updateObject(objectId, { text });
        queueWrite(objectId, { text });
      },
      []
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
          clearDragState();
        };
        dragEndHandlerMapRef.current.set(objectId, nextHandler);
        return nextHandler;
      },
      [handleObjectDragEnd, clearDragState]
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
          // Phase 3: mark dragging objects in spatial index on first move so
          // viewport culling never drops them while positions are stale.
          if (!dragExemptionSetRef.current) {
            dragExemptionSetRef.current = true;
            const dragIds = new Set<string>();

            if (selectedIds.size > 1 && selectedIds.has(objectId)) {
              for (const sid of selectedIds) dragIds.add(sid);
              // Include frame children that move with the selection
              const childIndex = useObjectsStore.getState().frameChildrenIndex;
              for (const sid of selectedIds) {
                const selObj = objectsById.get(sid);
                if (selObj?.type === 'frame') {
                  const children = childIndex.get(sid);
                  if (children) for (const cid of children) dragIds.add(cid);
                }
              }
            } else {
              dragIds.add(objectId);
              const dragObj = objectsById.get(objectId);
              if (dragObj?.type === 'frame') {
                const children = useObjectsStore.getState().frameChildrenIndex.get(objectId);
                if (children) for (const cid of children) dragIds.add(cid);
              }
            }

            spatialIndex.setDragging(dragIds);
          }

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
      [objectsById, snapToGridEnabled, setFrameDragOffset, setDropTargetFrameId, selectedIds]
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
        const childIds = useObjectsStore.getState().frameChildrenIndex.get(frameId);
        if (childIds && childIds.size > 0) {
          setSelectedIds([...childIds]);
        }
      },
      [setSelectedIds]
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
      () =>
        staticIds.map((id) => (
          <StoreShapeRenderer key={id} id={id} {...shapeRendererProps} />
        )),
      [staticIds, shapeRendererProps]
    );

    const activeObjectNodes = useMemo(
      () =>
        activeIds.map((id) => (
          <StoreShapeRenderer key={id} id={id} {...shapeRendererProps} />
        )),
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

    const {
      handleZoomToSelection,
      handleZoomToFitAll,
      handleZoomPreset,
    } = useViewportActions({
      objects,
      selectedIds,
      zoomToFitBounds,
      resetViewport,
      zoomTo,
      exportViewport,
      exportFullBoard,
      objectsRef,
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
          {/* Background grid layer - single Shape draws all lines; no interaction */}
          {gridSceneFunc && (
            <Layer listening={false} name='grid'>
              <Shape sceneFunc={gridSceneFunc} listening={false} perfectDrawEnabled={false} />
            </Layer>
          )}

          {/* Static shapes layer — only redraws on add/delete/property changes, NOT during drag */}
          <Layer ref={staticLayerRef} name='objects-static' listening={shapesListening}>
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
            {activeObjectNodes}
          </Layer>

          {/* Connection nodes (when connector tool active) - above objects so node clicks are hit first */}
          {activeTool === 'connector' && (
            <Layer name='connector-nodes' listening={true}>
              <ConnectionNodesLayer
                shapeIds={visibleShapeIds}
                onNodeClick={handleConnectorNodeClick}
              />
            </Layer>
          )}

          {/* Drawing preview layer */}
          <Layer name='drawing' listening={false}>
            {drawingPreview}
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
          exportFullBoard={exportFullBoard}
          objects={objects}
          zoomToFitBounds={zoomToFitBounds}
          handleZoomToSelection={handleZoomToSelection}
          handleZoomToFitAll={handleZoomToFitAll}
          handleZoomPreset={handleZoomPreset}
          selectedIds={selectedIds}
          selectedIdsArray={selectedIdsArray}
          visibleCount={visibleShapeIds.length}
          totalCount={objects.length}
          zoomPercent={Math.round(viewport.scale.x * 100)}
          onObjectUpdate={onObjectUpdate}
          canEdit={canEdit}
        />
      </div>
    );
  }
);

BoardCanvas.displayName = 'BoardCanvas';
