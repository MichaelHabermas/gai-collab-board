import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSelectionSyncController } from '@/canvas/SelectionSyncController';
import { useSelectionStore } from '@/stores/selectionStore';
import { useDragOffsetStore } from '@/stores/dragOffsetStore';

describe('SelectionSyncController', () => {
  const mockMoveToLayer = vi.fn();
  const mockSetCacheState = vi.fn();
  const mockPosition = vi.fn();
  const mockScheduleBatchDraw = vi.fn();

  const activeLayer = {};
  const nodeManager = {
    moveToLayer: mockMoveToLayer,
    setCacheState: mockSetCacheState,
    getNode: (id: string) => ({
      id,
      lastObj: { x: 10, y: 20 },
      nodes: {
        root: {
          position: mockPosition,
        },
      },
    }),
  };

  const layerManager = {
    layers: { active: activeLayer },
    scheduleBatchDraw: mockScheduleBatchDraw,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useSelectionStore.getState().clearSelection();
    useDragOffsetStore.getState().clearDragState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('moves newly selected nodes to active layer and clears cache', () => {
    const controller = createSelectionSyncController({
      nodeManager: nodeManager as never,
      layerManager: layerManager as never,
    });
    controller.start();

    useSelectionStore.getState().setSelectedIds(['a', 'b']);

    expect(mockMoveToLayer).toHaveBeenCalledWith('a', 'active');
    expect(mockMoveToLayer).toHaveBeenCalledWith('b', 'active');
    expect(mockSetCacheState).toHaveBeenCalledWith('a', false);
    expect(mockSetCacheState).toHaveBeenCalledWith('b', false);

    controller.destroy();
  });

  it('moves deselected nodes to static layer and restores cache', () => {
    useSelectionStore.getState().setSelectedIds(['a']);
    const controller = createSelectionSyncController({
      nodeManager: nodeManager as never,
      layerManager: layerManager as never,
    });
    controller.start();
    vi.clearAllMocks();

    useSelectionStore.getState().setSelectedIds([]);

    expect(mockMoveToLayer).toHaveBeenCalledWith('a', 'static');
    expect(mockSetCacheState).toHaveBeenCalledWith('a', true);

    controller.destroy();
  });

  it('applies groupDragOffset to selected nodes and schedules active layer draw', () => {
    useSelectionStore.getState().setSelectedIds(['a']);
    const controller = createSelectionSyncController({
      nodeManager: nodeManager as never,
      layerManager: layerManager as never,
    });
    controller.start();
    vi.clearAllMocks();

    useDragOffsetStore.getState().setGroupDragOffset({ dx: 5, dy: -3 });

    expect(mockPosition).toHaveBeenCalledWith({ x: 15, y: 17 });
    expect(mockScheduleBatchDraw).toHaveBeenCalledWith(activeLayer);

    controller.destroy();
  });

  it('applies zero offset when groupDragOffset is cleared', () => {
    useSelectionStore.getState().setSelectedIds(['a']);
    useDragOffsetStore.getState().setGroupDragOffset({ dx: 1, dy: 1 });
    const controller = createSelectionSyncController({
      nodeManager: nodeManager as never,
      layerManager: layerManager as never,
    });
    controller.start();
    vi.clearAllMocks();

    useDragOffsetStore.getState().clearDragState();

    expect(mockPosition).toHaveBeenCalledWith({ x: 10, y: 20 });
    expect(mockScheduleBatchDraw).toHaveBeenCalledWith(activeLayer);

    controller.destroy();
  });

  it('destroy unsubscribes and does not throw', () => {
    const controller = createSelectionSyncController({
      nodeManager: nodeManager as never,
      layerManager: layerManager as never,
    });
    controller.start();
    controller.destroy();

    expect(() => controller.destroy()).not.toThrow();
  });
});
