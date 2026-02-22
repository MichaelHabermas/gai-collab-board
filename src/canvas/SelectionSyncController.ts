/**
 * Selection Sync Controller — Moves nodes static ↔ active on selection change,
 * applies groupDragOffset to active layer, cache lifecycle per Article XXIII.
 * See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 2.
 */

import { useSelectionStore } from '@/stores/selectionStore';
import { useDragOffsetStore } from '@/stores/dragOffsetStore';
import type { KonvaNodeManager } from './KonvaNodeManager';
import type { ILayerManagerReturn } from './LayerManager';

export interface ISelectionSyncControllerConfig {
  nodeManager: KonvaNodeManager;
  layerManager: ILayerManagerReturn;
}

export interface ISelectionSyncControllerReturn {
  start: () => void;
  destroy: () => void;
}

export function createSelectionSyncController(
  config: ISelectionSyncControllerConfig
): ISelectionSyncControllerReturn {
  const { nodeManager, layerManager } = config;
  let prevSelectedIds = new Set<string>();
  let prevGroupDragOffset: { dx: number; dy: number } | null = null;
  let unsubSelection: (() => void) | null = null;
  let unsubDragOffset: (() => void) | null = null;

  function onSelectionChange(nextIds: Set<string>): void {
    const added: string[] = [];
    const removed: string[] = [];
    for (const id of nextIds) {
      if (!prevSelectedIds.has(id)) added.push(id);
    }
    for (const id of prevSelectedIds) {
      if (!nextIds.has(id)) removed.push(id);
    }

    for (const id of added) {
      nodeManager.moveToLayer(id, 'active');
      nodeManager.setCacheState(id, false);
    }
    for (const id of removed) {
      nodeManager.moveToLayer(id, 'static');
      nodeManager.setCacheState(id, true);
    }

    prevSelectedIds = new Set(nextIds);
  }

  function applyGroupDragOffset(offset: { dx: number; dy: number } | null): void {
    const { selectedIds } = useSelectionStore.getState();
    const { layers } = layerManager;
    const dx = offset?.dx ?? 0;
    const dy = offset?.dy ?? 0;

    for (const id of selectedIds) {
      const managed = nodeManager.getNode(id);
      if (!managed) continue;

      const { lastObj, nodes } = managed;
      nodes.root.position({ x: lastObj.x + dx, y: lastObj.y + dy });
    }

    layerManager.scheduleBatchDraw(layers.active);
  }

  function start(): void {
    if (unsubSelection) return;

    prevSelectedIds = new Set();
    onSelectionChange(new Set(useSelectionStore.getState().selectedIds));

    unsubSelection = useSelectionStore.subscribe((state) => {
      if (state.selectedIds === prevSelectedIds) return;

      onSelectionChange(state.selectedIds);
    });

    unsubDragOffset = useDragOffsetStore.subscribe((state) => {
      const offset = state.groupDragOffset;
      if (offset === prevGroupDragOffset) return;

      prevGroupDragOffset = offset;
      applyGroupDragOffset(offset);
    });

    prevGroupDragOffset = useDragOffsetStore.getState().groupDragOffset;
    applyGroupDragOffset(prevGroupDragOffset);
  }

  function destroy(): void {
    if (unsubSelection) {
      unsubSelection();
      unsubSelection = null;
    }

    if (unsubDragOffset) {
      unsubDragOffset();
      unsubDragOffset = null;
    }

    prevSelectedIds = new Set();
  }

  return { start, destroy };
}
