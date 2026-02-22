import Konva from 'konva';
import type { IBoardObject } from '@/types';
import type { IAlignmentCandidate } from '@/types';
import { spatialIndex } from '@/stores/objectsStore';
import type { IDragCoordinator } from '../drag/DragCoordinator';
import type { ITextEditController } from './TextEditController';

export interface IShapeEventConfig {
  drag: IDragCoordinator;
  canEdit(): boolean;
  getGuideCandidates(): IAlignmentCandidate[];
  getObjectsRecord(): Record<string, IBoardObject>;
  getFrames(): IBoardObject[];
  getChildIndex(): Map<string, Set<string>>;
  openTextEdit(objectId: string): void;
  /** When set, dblclick calls this instead of openTextEdit (Epic 5 orchestration). */
  textEditController?: ITextEditController;
}

/**
 * Wire click, drag, and dblclick on a shape node. Call from KonvaNodeManager when a node is created.
 */
export function wireEvents(node: Konva.Node, objectId: string, config: IShapeEventConfig): void {
  node.on('click tap', (e) => {
    config.drag.selectObject(objectId, e.evt.metaKey ?? false);
  });

  node.on('dragstart', () => {
    spatialIndex.setDragging(new Set([objectId]));
  });

  node.on('dragmove', (e) => {
    config.drag.onDragMove(e, config.getGuideCandidates());
  });

  node.on('dragend', (e) => {
    const { target } = e;
    config.drag.commitDragEnd(
      objectId,
      target.x(),
      target.y(),
      config.getObjectsRecord(),
      config.getFrames(),
      config.getChildIndex()
    );
  });

  node.on('dblclick dbltap', () => {
    if (config.textEditController) {
      config.textEditController.open(objectId);
    } else {
      config.openTextEdit(objectId);
    }
  });

  node.draggable(config.canEdit());
  node.dragBoundFunc(config.drag.createDragBoundFunc(objectId));
}

/**
 * Remove all shape events before destroying the node. Call from KonvaNodeManager before node.destroy().
 */
export function unwireEvents(node: Konva.Node): void {
  node.off('click tap dragstart dragmove dragend dblclick dbltap');
}
