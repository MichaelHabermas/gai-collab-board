/**
 * Canvas setup — Manager instantiation, Zustand subscription wiring, cleanup.
 * Called from CanvasHost on mount. See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 5.
 */

import Konva from 'konva';
import type { IBoardObject, ToolMode, IPosition } from '@/types';
import type { ICreateObjectParams } from '@/types';
import { useObjectsStore } from '@/stores/objectsStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { spatialIndex } from '@/stores/objectsStore';
import { queueObjectUpdate } from '@/lib/writeQueue';
import { createLayerManager } from './LayerManager';
import { KonvaNodeManager } from './KonvaNodeManager';
import { TransformerManager } from './TransformerManager';
import { OverlayManager } from './OverlayManager';
import { createSelectionSyncController } from './SelectionSyncController';
import { createDragCoordinator } from './drag/DragCoordinator';
import { buildGuideCandidates } from './drag/alignmentEngine';
import { createDrawingController } from './events/DrawingController';
import { createMarqueeController } from './events/MarqueeController';
import { createConnectorController } from './events/ConnectorController';
import { createTextEditController } from './events/TextEditController';
import { createStageEventRouter } from './events/StageEventRouter';
import { wireEvents } from './events/ShapeEventWiring';

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
  const overlayManager = new OverlayManager(layerManager.layers.overlay);
  const dragCoordinator = createDragCoordinator({
    overlayManager,
    snapToGridEnabled: config.snapToGridEnabled,
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
    queueObjectUpdate,
  });

  const transformerManager = new TransformerManager(layerManager.layers.selection);
  transformerManager.handleTransformEnd((id, attrs) => {
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

  nodeManager.start();

  return {
    stage,
    destroy: () => {
      unsubTransformerSync();
      stageRouter.destroy();
      selectionSync.destroy();
      nodeManager.destroy();
      overlayManager.destroy();
      transformerManager.destroy();
      layerManager.destroy();
      stage.destroy();
    },
    overlayManager,
    getConnectorController: () => connectorController,
  };
}
