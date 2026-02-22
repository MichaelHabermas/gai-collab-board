/**
 * Konva Node Manager — Bridges Zustand objects store to imperative Konva nodes.
 * O(changed) diff, connector deduplication. See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 2.
 */

import Konva from 'konva';
import { useObjectsStore } from '@/stores/objectsStore';
import { getAnchorPosition } from '@/lib/connectorAnchors';
import type { IBoardObject } from '@/types';
import type { ShapeType } from '@/types';
import type { ILayerManagerReturn } from './LayerManager';
import type { IShapeNodes, IShapeFactoryEntry } from './factories/types';
import { getFactory } from './factories';

export interface IManagedNode {
  id: string;
  type: ShapeType;
  nodes: IShapeNodes;
  lastObj: IBoardObject;
  currentLayer: 'static' | 'active';
  isCached: boolean;
  isEditing: boolean;
}

export type GetFactoryFn = (type: ShapeType) => IShapeFactoryEntry;

export interface IKonvaNodeManagerConfig {
  layerManager: ILayerManagerReturn;
  getFactoryFn?: GetFactoryFn;
  onNodeCreated?: (node: Konva.Node, objectId: string) => void;
  onNodeDestroyed?: (node: Konva.Node, objectId: string) => void;
}

function computeConnectorPoints(
  connector: IBoardObject,
  objects: Record<string, IBoardObject>
): { x: number; y: number; points: number[] } | null {
  const fromObj = connector.fromObjectId ? objects[connector.fromObjectId] : undefined;
  const toObj = connector.toObjectId ? objects[connector.toObjectId] : undefined;
  const { fromAnchor } = connector;
  const { toAnchor } = connector;

  if (!fromObj || !toObj || fromAnchor == null || toAnchor == null) {
    return null;
  }

  const fromPos = getAnchorPosition(fromObj, fromAnchor);
  const toPos = getAnchorPosition(toObj, toAnchor);
  const { x } = fromPos;
  const { y } = fromPos;
  const points: number[] = [0, 0, toPos.x - fromPos.x, toPos.y - fromPos.y];

  return { x, y, points };
}

export class KonvaNodeManager {
  private readonly layerManager: ILayerManagerReturn;
  private readonly getFactoryFn: GetFactoryFn;
  private readonly onNodeCreated?: (node: Konva.Node, objectId: string) => void;
  private readonly onNodeDestroyed?: (node: Konva.Node, objectId: string) => void;
  private managed = new Map<string, IManagedNode>();
  private unsubObjects: (() => void) | null = null;

  constructor(config: IKonvaNodeManagerConfig) {
    this.layerManager = config.layerManager;
    this.getFactoryFn = config.getFactoryFn ?? getFactory;
    this.onNodeCreated = config.onNodeCreated;
    this.onNodeDestroyed = config.onNodeDestroyed;
  }

  start(): void {
    if (this.unsubObjects) {
      return;
    }

    this.unsubObjects = useObjectsStore.subscribe((state, prevState) => {
      if (state.objects === prevState.objects) {
        return;
      }

      this.handleStoreChange(state.objects, prevState.objects);
    });
  }

  handleStoreChange(
    nextObjects: Record<string, IBoardObject>,
    prevObjects: Record<string, IBoardObject>
  ): void {
    const affectedLayers = new Set<Konva.Layer>();
    const pendingConnectorIds = new Set<string>();
    const connectorsByEndpoint =
      useObjectsStore.getState().connectorsByEndpoint ?? new Map<string, Set<string>>();

    // Create or update
    for (const id of Object.keys(nextObjects)) {
      const nextObj = nextObjects[id]!;
      const prevObj = prevObjects[id];
      if (nextObj === prevObj) {
        continue;
      }

      const existing = this.managed.get(id);
      if (!existing) {
        this.createNode(id, nextObj, affectedLayers);
        continue;
      }

      const entry = this.getFactoryFn(nextObj.type);
      const visualChanged = entry.update(existing.nodes, nextObj, existing.lastObj);
      existing.lastObj = nextObj;

      if (visualChanged && existing.nodes.cacheable) {
        this.setCacheState(id, false);
      }

      const layer =
        existing.currentLayer === 'active'
          ? this.layerManager.layers.active
          : this.layerManager.layers.static;
      affectedLayers.add(layer);

      if (nextObj.type === 'connector') {
        continue;
      }

      const connectorIds = connectorsByEndpoint.get(id);
      if (connectorIds) {
        for (const cid of connectorIds) {
          pendingConnectorIds.add(cid);
        }
      }
    }

    // Deferred connector pass (Article XXI.2)
    for (const cid of pendingConnectorIds) {
      const connectorObj = nextObjects[cid];
      const existing = this.managed.get(cid);
      if (!connectorObj || !existing || connectorObj.type !== 'connector') {
        continue;
      }

      const computed = computeConnectorPoints(connectorObj, nextObjects);
      const prevConnector = prevObjects[cid];
      if (computed) {
        const connectorWithPoints: IBoardObject = {
          ...connectorObj,
          x: computed.x,
          y: computed.y,
          points: computed.points,
        };
        const entry = this.getFactoryFn('connector');
        entry.update(existing.nodes, connectorWithPoints, prevConnector ?? existing.lastObj);
        existing.lastObj = connectorWithPoints;
      } else {
        const entry = this.getFactoryFn('connector');
        entry.update(existing.nodes, connectorObj, prevConnector ?? existing.lastObj);
        existing.lastObj = connectorObj;
      }

      const layer =
        existing.currentLayer === 'active'
          ? this.layerManager.layers.active
          : this.layerManager.layers.static;
      affectedLayers.add(layer);
    }

    // Destroy removed
    for (const id of this.managed.keys()) {
      if (id in nextObjects) {
        continue;
      }

      this.destroyNode(id, affectedLayers);
    }

    for (const layer of affectedLayers) {
      this.layerManager.scheduleBatchDraw(layer);
    }
  }

  private createNode(id: string, obj: IBoardObject, affectedLayers: Set<Konva.Layer>): void {
    const entry = this.getFactoryFn(obj.type);
    const nodes = entry.create(obj);
    const staticLayer = this.layerManager.layers.static;
    staticLayer.add(nodes.root);

    const managed: IManagedNode = {
      id,
      type: obj.type,
      nodes,
      lastObj: obj,
      currentLayer: 'static',
      isCached: false,
      isEditing: false,
    };
    this.managed.set(id, managed);

    if (nodes.cacheable) {
      this.applyCache(nodes.root, true);
      managed.isCached = true;
    }

    if (this.onNodeCreated) {
      this.onNodeCreated(nodes.root, id);
    }

    affectedLayers.add(staticLayer);
  }

  private destroyNode(id: string, affectedLayers: Set<Konva.Layer>): void {
    const managed = this.managed.get(id);
    if (!managed) {
      return;
    }

    if (this.onNodeDestroyed) {
      this.onNodeDestroyed(managed.nodes.root, id);
    }

    const layer =
      managed.currentLayer === 'active'
        ? this.layerManager.layers.active
        : this.layerManager.layers.static;
    managed.nodes.root.remove();
    managed.nodes.root.destroy();
    this.managed.delete(id);
    affectedLayers.add(layer);
  }

  getNode(id: string): IManagedNode | undefined {
    return this.managed.get(id);
  }

  getAllManagedIds(): string[] {
    return Array.from(this.managed.keys());
  }

  setCacheState(id: string, cached: boolean): void {
    const managed = this.managed.get(id);
    if (!managed || !managed.nodes.cacheable) {
      return;
    }

    managed.isCached = cached;
    this.applyCache(managed.nodes.root, cached);
  }

  setEditingState(id: string, editing: boolean): void {
    const managed = this.managed.get(id);
    if (!managed) {
      return;
    }

    managed.isEditing = editing;
    if (managed.nodes.cacheable) {
      this.setCacheState(id, false);
    }
  }

  moveToLayer(id: string, layer: 'static' | 'active'): void {
    const managed = this.managed.get(id);
    if (!managed || managed.currentLayer === layer) {
      return;
    }

    const targetLayer =
      layer === 'active' ? this.layerManager.layers.active : this.layerManager.layers.static;
    managed.nodes.root.moveTo(targetLayer);
    managed.currentLayer = layer;
    this.layerManager.scheduleBatchDraw(targetLayer);
  }

  private applyCache(node: Konva.Node, enable: boolean): void {
    if (enable) {
      node.cache({ pixelRatio: 2 });
    } else {
      node.clearCache();
    }
  }

  destroy(): void {
    if (this.unsubObjects) {
      this.unsubObjects();
      this.unsubObjects = null;
    }

    for (const id of Array.from(this.managed.keys())) {
      this.destroyNode(id, new Set());
    }
  }
}
