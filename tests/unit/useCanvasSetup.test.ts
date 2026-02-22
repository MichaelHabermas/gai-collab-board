import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { ToolMode } from '@/types';
import { useObjectsStore } from '@/stores/objectsStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { setupCanvas } from '@/canvas/useCanvasSetup';

const shared = vi.hoisted(() => {
  const stageHandlers = new Map<string, (event: unknown) => void>();
  const drawingConfigRef: { current: unknown } = { current: null };
  const dragCoordinatorRef: {
    current: {
      handleSelectionDragStart: ReturnType<typeof vi.fn>;
      handleSelectionDragMove: ReturnType<typeof vi.fn>;
      handleSelectionDragEnd: ReturnType<typeof vi.fn>;
      selectObject: ReturnType<typeof vi.fn>;
      onDragMove: ReturnType<typeof vi.fn>;
      commitDragEnd: ReturnType<typeof vi.fn>;
      createDragBoundFunc: ReturnType<typeof vi.fn>;
    } | null;
  } = { current: null };
  const selectionDragHandleRef: {
    current: {
      setBounds: ReturnType<typeof vi.fn>;
      destroy: ReturnType<typeof vi.fn>;
      config: Record<string, unknown>;
    } | null;
  } = { current: null };
  return { stageHandlers, drawingConfigRef, dragCoordinatorRef, selectionDragHandleRef };
});

vi.mock('konva', () => {
  class MockStage {
    private pointer = { x: 200, y: 300 };
    public on = vi.fn((event: string, handler: (e: unknown) => void) => {
      shared.stageHandlers.set(event, handler);
      return this;
    });
    public off = vi.fn((event: string) => {
      shared.stageHandlers.delete(event);
      return this;
    });
    public add = vi.fn();
    public destroy = vi.fn();
    public x = vi.fn(() => 0);
    public y = vi.fn(() => 0);
    public scaleX = vi.fn(() => 1);
    public scaleY = vi.fn(() => 1);
    public getPointerPosition = vi.fn(() => this.pointer);
  }

  return {
    default: {
      Stage: MockStage,
    },
  };
});

vi.mock('@/canvas/LayerManager', () => ({
  createLayerManager: vi.fn(() => ({
    layers: { static: {}, active: {}, overlay: {}, selection: {} },
    scheduleBatchDraw: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('@/canvas/GridRenderer', () => ({
  GridRenderer: class {
    public update = vi.fn();
    public destroy = vi.fn();
  },
}));

vi.mock('@/canvas/OverlayManager', () => ({
  OverlayManager: class {
    public destroy = vi.fn();
    public clearHighlight = vi.fn();
  },
}));

vi.mock('@/canvas/KonvaNodeManager', () => ({
  KonvaNodeManager: class {
    public start = vi.fn();
    public destroy = vi.fn();
    public handleStoreChange = vi.fn();
  },
}));

vi.mock('@/canvas/TransformerManager', () => ({
  TransformerManager: class {
    public handleTransformEnd = vi.fn();
    public syncNodes = vi.fn();
    public destroy = vi.fn();
  },
}));

vi.mock('@/canvas/SelectionSyncController', () => ({
  createSelectionSyncController: vi.fn(() => ({ start: vi.fn(), destroy: vi.fn() })),
}));

vi.mock('@/canvas/SelectionDragHandle', () => ({
  SelectionDragHandle: class {
    public setBounds = vi.fn();
    public destroy = vi.fn();
    constructor(config: Record<string, unknown>) {
      shared.selectionDragHandleRef.current = {
        setBounds: this.setBounds,
        destroy: this.destroy,
        config,
      };
    }
  },
}));

vi.mock('@/canvas/drag/DragCoordinator', () => ({
  createDragCoordinator: vi.fn(() => {
    const drag = {
      selectObject: vi.fn(),
      onDragMove: vi.fn(),
      commitDragEnd: vi.fn(),
      createDragBoundFunc: vi.fn(() => vi.fn((pos: { x: number; y: number }) => pos)),
      handleSelectionDragStart: vi.fn(),
      handleSelectionDragMove: vi.fn(),
      handleSelectionDragEnd: vi.fn(),
    };
    shared.dragCoordinatorRef.current = drag;
    return drag;
  }),
}));

vi.mock('@/canvas/events/DrawingController', () => ({
  createDrawingController: vi.fn((cfg: unknown) => {
    shared.drawingConfigRef.current = cfg;
    return { onDrawStart: vi.fn(), onDrawMove: vi.fn(), onDrawEnd: vi.fn() };
  }),
}));

vi.mock('@/canvas/events/MarqueeController', () => ({
  createMarqueeController: vi.fn(() => ({
    onMarqueeStart: vi.fn(),
    onMarqueeMove: vi.fn(),
    onMarqueeEnd: vi.fn(),
  })),
}));

vi.mock('@/canvas/events/ConnectorController', () => ({
  createConnectorController: vi.fn(() => ({ onConnectorNodeClick: vi.fn(), clearConnector: vi.fn() })),
}));

vi.mock('@/canvas/events/TextEditController', () => ({
  createTextEditController: vi.fn(() => ({ open: vi.fn() })),
}));

vi.mock('@/canvas/events/StageEventRouter', () => ({
  createStageEventRouter: vi.fn(() => ({ destroy: vi.fn() })),
}));

vi.mock('@/canvas/events/ShapeEventWiring', () => ({
  wireEvents: vi.fn(),
}));

vi.mock('@/canvas/drag/alignmentEngine', () => ({
  buildGuideCandidates: vi.fn(() => []),
}));

vi.mock('@/lib/writeQueue', () => ({
  queueObjectUpdate: vi.fn(),
}));

vi.mock('@/lib/canvasBounds', () => ({
  getObjectBounds: vi.fn((obj: { x: number; y: number; width: number; height: number }) => ({
    x1: obj.x,
    y1: obj.y,
    x2: obj.x + obj.width,
    y2: obj.y + obj.height,
  })),
  getSelectionBoundsFromRecord: vi.fn(() => ({ x1: 10, y1: 20, x2: 110, y2: 120 })),
}));

describe('setupCanvas wiring', () => {
  beforeEach(() => {
    shared.stageHandlers.clear();
    shared.drawingConfigRef.current = null;
    shared.dragCoordinatorRef.current = null;
    shared.selectionDragHandleRef.current = null;
    useObjectsStore.getState().clear();
    useSelectionStore.getState().setSelectedIds([]);
  });

  function buildConfig(overrides?: Partial<Parameters<typeof setupCanvas>[0]>) {
    return {
      container: document.createElement('div'),
      boardId: 'board-1',
      width: 1000,
      height: 700,
      getActiveTool: () => 'select' as ToolMode,
      getActiveColor: () => '#fef08a',
      canEdit: () => true,
      snapToGridEnabled: () => false,
      setActiveTool: vi.fn(),
      getVisibleShapeIds: () => [],
      cursorBroadcast: vi.fn(),
      viewport: { handleWheel: vi.fn() },
      onObjectCreate: vi.fn().mockResolvedValue({ id: 'created-1' }),
      onObjectUpdate: vi.fn(),
      onObjectsUpdate: vi.fn(),
      onObjectDelete: vi.fn(),
      ...overrides,
    };
  }

  it('wires drawing success callback to setActiveTool(select)', () => {
    const cfg = buildConfig();
    const result = setupCanvas(cfg);
    const drawingCfg = shared.drawingConfigRef.current as { onSuccess?: () => void } | null;
    expect(drawingCfg?.onSuccess).toBeDefined();

    drawingCfg?.onSuccess?.();
    expect(cfg.setActiveTool).toHaveBeenCalledWith('select');
    result.destroy();
  });

  it('creates sticky on empty click and reverts tool to select', async () => {
    const cfg = buildConfig({
      getActiveTool: () => 'sticky',
    });
    const result = setupCanvas(cfg);
    const onClick = shared.stageHandlers.get('click');
    expect(onClick).toBeDefined();

    const fakeStage = {
      getPointerPosition: () => ({ x: 200, y: 300 }),
      scaleX: () => 1,
      x: () => 0,
      y: () => 0,
    };
    onClick?.({
      target: {
        getStage: () => fakeStage,
        name: () => 'background',
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(cfg.onObjectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sticky',
        width: 200,
        height: 200,
      })
    );
    expect(cfg.setActiveTool).toHaveBeenCalledWith('select');
    result.destroy();
  });

  it('wires SelectionDragHandle and updates bounds for multi-select', () => {
    const now = Timestamp.now();
    useObjectsStore.getState().setObject({
      id: 'a',
      type: 'rectangle',
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      fill: '#93c5fd',
      stroke: '#1e293b',
      strokeWidth: 2,
      rotation: 0,
      createdBy: 'u1',
      createdAt: now,
      updatedAt: now,
    });
    useObjectsStore.getState().setObject({
      id: 'b',
      type: 'rectangle',
      x: 180,
      y: 20,
      width: 100,
      height: 80,
      fill: '#93c5fd',
      stroke: '#1e293b',
      strokeWidth: 2,
      rotation: 0,
      createdBy: 'u1',
      createdAt: now,
      updatedAt: now,
    });
    useSelectionStore.getState().setSelectedIds(['a', 'b']);

    const cfg = buildConfig();
    const result = setupCanvas(cfg);
    const handleRef = shared.selectionDragHandleRef.current;
    expect(handleRef).toBeTruthy();
    expect(handleRef?.setBounds).toHaveBeenCalled();
    result.destroy();
  });
});
