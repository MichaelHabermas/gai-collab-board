/**
 * Canvas setup — Manager instantiation, Zustand subscription wiring, cleanup.
 * Called from CanvasHost on mount. See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 5.
 */

import Konva from 'konva';
import type { IBoardObject, ToolMode, IPosition, IBounds } from '@/types';
import type { ICreateObjectParams } from '@/types';
import { useObjectsStore } from '@/stores/objectsStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useDragOffsetStore } from '@/stores/dragOffsetStore';
import { spatialIndex } from '@/stores/objectsStore';
import { queueObjectUpdate } from '@/lib/writeQueue';
import {
  DEFAULT_STICKY_WIDTH,
  DEFAULT_STICKY_HEIGHT,
  DEFAULT_STICKY_TEXT,
  DEFAULT_TEXT_WIDTH,
  DEFAULT_TEXT_HEIGHT,
  DEFAULT_TEXT_FONT_SIZE,
  STICKY_COLORS,
} from '@/lib/boardObjectDefaults';
import { getSelectionBoundsFromRecord } from '@/lib/canvasBounds';
import { createLayerManager } from './LayerManager';
import { KonvaNodeManager } from './KonvaNodeManager';
import { TransformerManager } from './TransformerManager';
import { OverlayManager } from './OverlayManager';
import { createSelectionSyncController } from './SelectionSyncController';
import { SelectionDragHandle } from './SelectionDragHandle';
import { createDragCoordinator } from './drag/DragCoordinator';
import { buildGuideCandidates } from './drag/alignmentEngine';
import { createDrawingController } from './events/DrawingController';
import { createMarqueeController } from './events/MarqueeController';
import { createConnectorController } from './events/ConnectorController';
import { createTextEditController } from './events/TextEditController';
import { createStageEventRouter } from './events/StageEventRouter';
import { wireEvents } from './events/ShapeEventWiring';
import { GridRenderer } from './GridRenderer';
import type { IViewportState } from '@/types';

export interface ICanvasSetupConfig {
  container: HTMLDivElement;
  boardId: string;
  width: number;
  height: number;
  getActiveTool: () => ToolMode;
  getActiveColor: () => string;
  canEdit: () => boolean;
  snapToGridEnabled: () => boolean;
  setActiveTool: (tool: ToolMode) => void;
  getVisibleShapeIds?: () => string[];
  cursorBroadcast: (x: number, y: number) => void;
  viewport: {
    handleWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
    handleDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  };
  onObjectCreate: (params: Omit<ICreateObjectParams, 'createdBy'>) => Promise<IBoardObject | null>;
  onObjectUpdate: (id: string, updates: Partial<IBoardObject>) => void;
  onObjectsUpdate: (updates: Array<{ objectId: string; updates: Partial<IBoardObject> }>) => void;
  onObjectDelete: (id: string) => void;
}

export interface ICanvasSetupReturn {
  stage: Konva.Stage;
  destroy: () => void;
  overlayManager: OverlayManager;
  getConnectorController: () => ReturnType<typeof createConnectorController>;
  updateGrid: (opts: { viewport: IViewportState; showGrid: boolean; gridColor: string }) => void;
}

function getCanvasCoords(stage: Konva.Stage, pointer: { x: number; y: number }): IPosition {
  const scale = stage.scaleX();
  return {
    x: (pointer.x - stage.x()) / scale,
    y: (pointer.y - stage.y()) / scale,
  };
}

export function setupCanvas(config: ICanvasSetupConfig): ICanvasSetupReturn {
  const stage = new Konva.Stage({
    container: config.container,
    width: config.width,
    height: config.height,
  });

  const layerManager = createLayerManager(stage);
  const gridRenderer = new GridRenderer({
    layer: layerManager.layers.static,
    scheduleBatchDraw: layerManager.scheduleBatchDraw,
  });
  const overlayManager = new OverlayManager(layerManager.layers.overlay);
  const dragCoordinator = createDragCoordinator({
    overlayManager,
    snapToGridEnabled: config.snapToGridEnabled,
    onObjectUpdate: config.onObjectUpdate,
    onObjectsUpdate: config.onObjectsUpdate,
  });

  let textEditController: ReturnType<typeof createTextEditController> | null = null;

  const getObjectsRecord = () => useObjectsStore.getState().objects;
  const getFrames = () => Object.values(getObjectsRecord()).filter((o) => o.type === 'frame');
  const getChildIndex = () =>
    useObjectsStore.getState().frameChildrenIndex ?? new Map<string, Set<string>>();
  const getVisibleIds = () => config.getVisibleShapeIds?.() ?? Object.keys(getObjectsRecord());

  const shapeEventConfig = {
    drag: dragCoordinator,
    canEdit: config.canEdit,
    getGuideCandidates: () =>
      buildGuideCandidates(getVisibleIds(), spatialIndex.getDragging(), getObjectsRecord()),
    getObjectsRecord,
    getFrames,
    getChildIndex,
    openTextEdit: (id: string) => textEditController?.open(id),
    get textEditController() {
      return textEditController ?? undefined;
    },
  };

  const nodeManager = new KonvaNodeManager({
    layerManager,
    onNodeCreated: (node, objectId) => wireEvents(node, objectId, shapeEventConfig),
  });

  textEditController = createTextEditController({
    nodeManager,
    getStage: () => stage,
    onObjectUpdate: config.onObjectUpdate,
    queueObjectUpdate,
  });

  const transformerManager = new TransformerManager(layerManager.layers.selection);
  transformerManager.handleTransformEnd((id, attrs) => {
    config.onObjectUpdate(id, attrs);
    queueObjectUpdate(id, attrs);
  });

  const selectionSync = createSelectionSyncController({ nodeManager, layerManager });
  selectionSync.start();

  const unsubTransformerSync = useSelectionStore.subscribe(() => {
    const { selectedIds } = useSelectionStore.getState();
    transformerManager.syncNodes(Array.from(selectedIds), layerManager.layers.active);
  });
  transformerManager.syncNodes(
    Array.from(useSelectionStore.getState().selectedIds),
    layerManager.layers.active
  );

  const drawingController = createDrawingController({
    overlay: overlayManager,
    getTool: config.getActiveTool,
    getColor: config.getActiveColor,
    onCreate: config.onObjectCreate,
    onSuccess: () => {
      config.setActiveTool('select');
    },
  });

  const setSelectedIds = (ids: string[]) => {
    useSelectionStore.getState().setSelectedIds(ids);
  };

  const marqueeController = createMarqueeController({
    overlay: overlayManager,
    getCanvasCoords: (s, p) => getCanvasCoords(s, p),
    getObjectsRecord,
    setSelectedIds,
  });

  const connectorController = createConnectorController({
    overlay: overlayManager,
    getObjectsRecord,
    getColor: config.getActiveColor,
    onObjectCreate: config.onObjectCreate,
    setActiveTool: config.setActiveTool,
  });

  const stageRouter = createStageEventRouter(stage, config.getActiveTool, {
    getCanvasCoords: (s, p) => getCanvasCoords(s, p),
    controllers: {
      drawing: drawingController,
      marquee: marqueeController,
      viewport: config.viewport,
      cursorBroadcast: config.cursorBroadcast,
    },
  });

  let selectionDragStartBounds: IBounds | null = null;
  const selectionDragHandle = new SelectionDragHandle({
    layer: layerManager.layers.active,
    scheduleBatchDraw: layerManager.scheduleBatchDraw,
    onDragStart: () => {
      const bounds = getSelectionBoundsFromRecord(
        useObjectsStore.getState().objects,
        useSelectionStore.getState().selectedIds
      );
      selectionDragStartBounds = bounds;
      if (!bounds) {
        return;
      }

      dragCoordinator.handleSelectionDragStart(
        bounds,
        useObjectsStore.getState().objects,
        useObjectsStore.getState().frameChildrenIndex ?? new Map<string, Set<string>>()
      );
    },
    onDragMove: (event) => {
      if (!selectionDragStartBounds) {
        return;
      }

      dragCoordinator.handleSelectionDragMove(event, selectionDragStartBounds);
    },
    onDragEnd: () => {
      if (!selectionDragStartBounds) {
        useDragOffsetStore.getState().setGroupDragOffset(null);
        spatialIndex.clearDragging();
        return;
      }

      dragCoordinator.handleSelectionDragEnd(
        selectionDragStartBounds,
        useObjectsStore.getState().objects,
        getFrames(),
        useObjectsStore.getState().frameChildrenIndex ?? new Map<string, Set<string>>()
      );
      selectionDragStartBounds = null;
    },
    onMouseEnter: () => {},
    onMouseLeave: () => {},
  });

  const syncSelectionDragHandleBounds = () => {
    const { selectedIds } = useSelectionStore.getState();
    if (!config.canEdit() || selectedIds.size <= 1) {
      selectionDragHandle.setBounds(null);
      return;
    }

    const bounds = getSelectionBoundsFromRecord(useObjectsStore.getState().objects, selectedIds);
    selectionDragHandle.setBounds(bounds);
  };
  syncSelectionDragHandleBounds();

  const unsubSelectionDragBounds = useSelectionStore.subscribe(syncSelectionDragHandleBounds);
  const unsubObjectsDragBounds = useObjectsStore.subscribe((state, prevState) => {
    if (state.objects !== prevState.objects) {
      syncSelectionDragHandleBounds();
    }
  });

  const handleClickCreate = (
    e: Konva.KonvaEventObject<MouseEvent> | Konva.KonvaEventObject<TouchEvent>
  ) => {
    if (!config.canEdit()) {
      return;
    }

    const tool = config.getActiveTool();
    if (tool !== 'sticky' && tool !== 'text') {
      return;
    }

    const targetName = typeof e.target.name === 'function' ? e.target.name() : '';
    const emptyLayerNames = ['static-layer', 'active-layer', 'overlay-layer', 'selection-layer'];
    const isEmptyTarget =
      e.target === stage ||
      targetName === 'background' ||
      (typeof targetName === 'string' && emptyLayerNames.includes(targetName));
    if (!isEmptyTarget) {
      return;
    }

    const stageRef = e.target.getStage();
    const pointer = stageRef?.getPointerPosition();
    if (!stageRef || !pointer) {
      return;
    }

    const { x, y } = getCanvasCoords(stageRef, pointer);
    const color = config.getActiveColor();
    const params =
      tool === 'sticky'
        ? {
            type: 'sticky' as const,
            x: x - DEFAULT_STICKY_WIDTH / 2,
            y: y - DEFAULT_STICKY_HEIGHT / 2,
            width: DEFAULT_STICKY_WIDTH,
            height: DEFAULT_STICKY_HEIGHT,
            fill: color,
            text: DEFAULT_STICKY_TEXT,
            rotation: 0,
          }
        : {
            type: 'text' as const,
            x,
            y,
            width: DEFAULT_TEXT_WIDTH,
            height: DEFAULT_TEXT_HEIGHT,
            fill: color === STICKY_COLORS.yellow ? '#1f2937' : color,
            text: '',
            fontSize: DEFAULT_TEXT_FONT_SIZE,
            rotation: 0,
          };

    void config
      .onObjectCreate(params)
      .catch(() => {
        // no-op: parity with BoardCanvas behavior (attempt and revert tool).
      })
      .finally(() => {
        config.setActiveTool('select');
      });
  };
  stage.on('click', handleClickCreate);
  stage.on('tap', handleClickCreate);

  nodeManager.start();
  const initialObjects = useObjectsStore.getState().objects;
  nodeManager.handleStoreChange(initialObjects, {});

  return {
    stage,
    destroy: () => {
      unsubTransformerSync();
      unsubSelectionDragBounds();
      unsubObjectsDragBounds();
      selectionDragHandle.destroy();
      stage.off('click', handleClickCreate);
      stage.off('tap', handleClickCreate);
      stageRouter.destroy();
      selectionSync.destroy();
      nodeManager.destroy();
      overlayManager.destroy();
      gridRenderer.destroy();
      transformerManager.destroy();
      layerManager.destroy();
      stage.destroy();
    },
    overlayManager,
    getConnectorController: () => connectorController,
    updateGrid: (opts) => gridRenderer.update(opts),
  };
}
