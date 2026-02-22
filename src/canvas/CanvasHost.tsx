/**
 * CanvasHost — React shell for imperative Konva canvas. Replaces BoardCanvas when Epic 5 cutover is active.
 * See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 5.
 */

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  forwardRef,
  type ReactElement,
} from 'react';
import type { User } from 'firebase/auth';
import type { IBoardObject, ToolMode } from '@/types';
import type { ICreateObjectParams } from '@/modules/sync/objectService';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import { useVisibleShapeIds } from '@/hooks/useVisibleShapeIds';
import { useCursors } from '@/hooks/useCursors';
import { useCanvasOperations } from '@/hooks/useCanvasOperations';
import { useCanvasKeyboardShortcuts } from '@/hooks/useCanvasKeyboardShortcuts';
import { useBoardSettings } from '@/hooks/useBoardSettings';
import { useExportAsImage } from '@/hooks/useExportAsImage';
import { useSelectionStore } from '@/stores/selectionStore';
import { useObjectsStore } from '@/stores/objectsStore';
import { useHistoryStore } from '@/stores/historyStore';
import { STICKY_COLORS } from '@/lib/boardObjectDefaults';
import { useTheme } from '@/hooks/useTheme';
import {
  getBoardCanvasBackgroundColor,
  getBoardGridColor,
} from '@/components/canvas/boardCanvasTheme';
import { CanvasToolbarWrapper } from '@/components/canvas/CanvasToolbarWrapper';
import { CanvasControlPanel } from '@/components/canvas/CanvasControlPanel';
import { setupCanvas } from './useCanvasSetup';
import { BOARD_CANVAS_CONTAINER_CLASS } from '@/components/canvas/boardCanvasTheme';
import { getObjectBounds } from '@/lib/canvasBounds';
import Konva from 'konva';

/** Subscription island: only this div re-renders when selection changes (for data-selected-ids). */
const CanvasContainerWithSelectionAttr = memo(
  forwardRef<HTMLDivElement, { viewport: { width: number; height: number } }>(
    function CanvasContainerWithSelectionAttr({ viewport }, ref): ReactElement {
      const selectedIds = useSelectionStore((s) => s.selectedIds);
      const selectedIdsStr = useMemo(() => [...selectedIds].join(','), [selectedIds]);

      return (
        <div
          ref={ref}
          className={BOARD_CANVAS_CONTAINER_CLASS}
          style={{ width: viewport.width, height: viewport.height }}
          data-selected-ids={selectedIdsStr}
        />
      );
    }
  )
);

export interface ICanvasHostProps {
  boardId: string;
  boardName?: string;
  user: User;
  canEdit?: boolean;
  onObjectUpdate?: (objectId: string, updates: Partial<IBoardObject>) => void;
  onObjectsUpdate?: (updates: Array<{ objectId: string; updates: Partial<IBoardObject> }>) => void;
  onObjectCreate?: (params: Omit<ICreateObjectParams, 'createdBy'>) => Promise<IBoardObject | null>;
  onObjectDelete?: (objectId: string) => Promise<void>;
  onObjectsDeleteBatch?: (objectIds: string[]) => void | Promise<void>;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const CanvasHost = memo(function CanvasHost({
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
}: ICanvasHostProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const setupRef = useRef<ReturnType<typeof setupCanvas> | null>(null);

  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [activeColor, setActiveColor] = useState<string>(STICKY_COLORS.yellow);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const activeToolRef = useRef<ToolMode>(activeTool);
  const activeColorRef = useRef(activeColor);
  const canEditRef = useRef(canEdit);
  const {
    viewport: persistedViewport,
    setViewport: setPersistedViewport,
    showGrid: showGridSetting,
    setShowGrid: setShowGrid,
    snapToGrid: snapToGridEnabled,
    setSnapToGrid: setSnapToGridEnabled,
  } = useBoardSettings(boardId);

  const handleViewportPersist = useCallback(
    (next: { position: { x: number; y: number }; scale: { x: number; y: number } }) => {
      setPersistedViewport({ position: next.position, scale: next.scale });
    },
    [setPersistedViewport]
  );

  const { viewport, handleWheel, handleDragEnd, zoomToFitBounds, zoomTo } = useCanvasViewport({
    initialViewport: persistedViewport,
    onViewportChange: handleViewportPersist,
    stageRef: stageRef as React.RefObject<Konva.Stage | null>,
  });
  const viewportStateRef = useRef(viewport);

  const visibleShapeIds = useVisibleShapeIds(viewport);
  const visibleShapeIdsRef = useRef<string[]>(visibleShapeIds);
  const canUndoHistory = useHistoryStore((s) => s.canUndo);
  const canRedoHistory = useHistoryStore((s) => s.canRedo);
  const setSelectedIds = useSelectionStore((s) => s.setSelectedIds);
  const clearSelectionFromStore = useCallback(() => setSelectedIds([]), [setSelectedIds]);
  const { theme } = useTheme();

  const { cursors, handleMouseMove } = useCursors({ boardId, user });

  useCanvasKeyboardShortcuts({
    setActiveTool,
    canEdit,
    activeToolRef,
    onUndo,
    onRedo,
  });

  const onToolChange = useCallback(
    (tool: ToolMode) => {
      setActiveTool(tool);
      activeToolRef.current = tool;
      if (tool === 'connector') {
        clearSelectionFromStore();
      }
    },
    [clearSelectionFromStore]
  );

  useCanvasOperations({
    onObjectCreate:
      (onObjectCreate as (params: Partial<IBoardObject>) => Promise<IBoardObject | null>) ??
      (() => Promise.resolve(null)),
    onObjectUpdate,
    onObjectsUpdate,
    onObjectDelete: (onObjectDelete as (objectId: string) => void) ?? (() => {}),
    onObjectsDeleteBatch: onObjectsDeleteBatch
      ? (ids) => Promise.resolve(onObjectsDeleteBatch(ids))
      : undefined,
    clearSelection: clearSelectionFromStore,
  });

  const { exportViewport, exportFullBoard } = useExportAsImage({ stageRef, boardName });
  const handleExportFullBoard = useCallback(() => {
    const objectsRecord = useObjectsStore.getState().objects;
    const objs = Object.values(objectsRecord);
    exportFullBoard(objs, zoomToFitBounds);
  }, [exportFullBoard, zoomToFitBounds]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const result = setupCanvas({
      container,
      boardId,
      width: viewport.width,
      height: viewport.height,
      getActiveTool: () => activeToolRef.current,
      getActiveColor: () => activeColorRef.current,
      canEdit: () => canEditRef.current,
      snapToGridEnabled: () => snapToGridEnabled,
      setActiveTool: onToolChange,
      getVisibleShapeIds: () => visibleShapeIdsRef.current,
      cursorBroadcast: handleMouseMove,
      viewport: { handleWheel, handleDragEnd },
      onObjectCreate: onObjectCreate ?? (() => Promise.resolve(null)),
      onObjectUpdate: onObjectUpdate ?? (() => {}),
      onObjectsUpdate: onObjectsUpdate ?? (() => {}),
      onObjectDelete: onObjectDelete ?? (() => Promise.resolve()),
    });

    setupRef.current = result;
    stageRef.current = result.stage;
    const initialViewport = viewportStateRef.current;
    result.stage.x(initialViewport.position.x);
    result.stage.y(initialViewport.position.y);
    result.stage.scaleX(initialViewport.scale.x);
    result.stage.scaleY(initialViewport.scale.y);

    return () => {
      result.destroy();
      setupRef.current = null;
      stageRef.current = null;
    };
  }, [
    boardId,
    viewport.width,
    viewport.height,
    onObjectCreate,
    onObjectUpdate,
    onObjectsUpdate,
    onObjectDelete,
    snapToGridEnabled,
    onToolChange,
    handleMouseMove,
    handleWheel,
    handleDragEnd,
  ]);

  useEffect(() => {
    viewportStateRef.current = viewport;
    visibleShapeIdsRef.current = visibleShapeIds;
    activeToolRef.current = activeTool;
    activeColorRef.current = activeColor;
    canEditRef.current = canEdit;

    const s = setupRef.current;
    if (!s?.overlayManager) {
      return;
    }

    s.updateGrid({
      viewport,
      showGrid: showGridSetting,
      gridColor: getBoardGridColor(theme),
    });

    if (user?.uid) {
      s.overlayManager.updateCursors(cursors, user.uid);
    }

    if (activeTool === 'connector' && s.getConnectorController) {
      const objectsRecord = useObjectsStore.getState().objects;
      s.overlayManager.updateConnectionNodes(
        visibleShapeIds,
        objectsRecord,
        s.getConnectorController().onConnectorNodeClick
      );
    } else {
      s.overlayManager.clearConnectionNodes();
    }
  }, [
    activeTool,
    activeColor,
    canEdit,
    cursors,
    user?.uid,
    visibleShapeIds,
    viewport,
    showGridSetting,
    theme,
  ]);

  const handleZoomToSelection = useCallback(() => {
    const { selectedIds } = useSelectionStore.getState();
    if (selectedIds.size === 0) return;

    const objectsRecord = useObjectsStore.getState().objects;
    const selectedArr = [...selectedIds];
    const objs = selectedArr
      .map((id: string) => objectsRecord[id])
      .filter(Boolean) as IBoardObject[];
    if (objs.length === 0) return;

    const bounds = objs.reduce(
      (acc, o) => {
        const b = getObjectBounds(o);
        return {
          x1: Math.min(acc.x1, b.x1),
          y1: Math.min(acc.y1, b.y1),
          x2: Math.max(acc.x2, b.x2),
          y2: Math.max(acc.y2, b.y2),
        };
      },
      { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
    );
    if (bounds.x1 !== Infinity) zoomToFitBounds(bounds, 40);
  }, [zoomToFitBounds]);

  const handleZoomToFitAll = useCallback(() => {
    const objectsRecord = useObjectsStore.getState().objects;
    const objs = Object.values(objectsRecord);
    if (objs.length === 0) return;

    const bounds = objs.reduce(
      (acc, o) => {
        const b = getObjectBounds(o);
        return {
          x1: Math.min(acc.x1, b.x1),
          y1: Math.min(acc.y1, b.y1),
          x2: Math.max(acc.x2, b.x2),
          y2: Math.max(acc.y2, b.y2),
        };
      },
      { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
    );
    if (bounds.x1 !== Infinity) zoomToFitBounds(bounds, 60);
  }, [zoomToFitBounds]);

  const handleZoomPreset = useCallback((scale: number) => zoomTo(scale), [zoomTo]);

  return (
    <div
      className='flex flex-1 relative min-w-0 overflow-hidden'
      style={{ background: getBoardCanvasBackgroundColor(theme) }}
      data-testid='board-canvas'
      data-board-id={boardId}
    >
      <CanvasToolbarWrapper
        activeTool={activeTool}
        onToolChange={onToolChange}
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
      <CanvasContainerWithSelectionAttr ref={containerRef} viewport={viewport} />
      <CanvasControlPanel
        showGrid={showGridSetting}
        setShowGrid={setShowGrid}
        snapToGridEnabled={snapToGridEnabled}
        setSnapToGridEnabled={setSnapToGridEnabled}
        exportViewport={exportViewport}
        onExportFullBoard={handleExportFullBoard}
        handleZoomToSelection={handleZoomToSelection}
        handleZoomToFitAll={handleZoomToFitAll}
        handleZoomPreset={handleZoomPreset}
        visibleCount={visibleShapeIds.length}
        zoomPercent={Math.round(viewport.scale.x * 100)}
        onObjectUpdate={onObjectUpdate}
        canEdit={canEdit}
      />
    </div>
  );
});
