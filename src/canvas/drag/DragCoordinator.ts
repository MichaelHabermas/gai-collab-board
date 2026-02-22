import Konva from 'konva';
import type { IBoardObject } from '@/types';
import type { IAlignmentCandidate } from '@/types';
import * as dragCommit from './dragCommit';
import * as alignmentEngine from './alignmentEngine';
import * as dragBounds from './dragBounds';
import type { IDragCommitConfig } from './dragCommit';
import type { IOverlayManagerGuides } from './alignmentEngine';

export interface IDragCoordinatorConfig extends IDragCommitConfig {
  overlayManager: IOverlayManagerGuides;
}

export interface IDragCoordinator {
  selectObject(objectId: string, metaKey: boolean): void;
  onDragMove(e: Konva.KonvaEventObject<DragEvent>, candidates: IAlignmentCandidate[]): void;
  commitDragEnd(
    objectId: string,
    x: number,
    y: number,
    objectsRecord: Record<string, IBoardObject>,
    frames: IBoardObject[],
    childIndex: Map<string, Set<string>>
  ): void;
  createDragBoundFunc(objectId: string): (pos: Konva.Vector2d) => Konva.Vector2d;
  handleSelectionDragStart(
    bounds: { x1: number; y1: number; x2: number; y2: number },
    objectsRecord: Record<string, IBoardObject>,
    childIndex: Map<string, Set<string>>
  ): void;
  handleSelectionDragMove(
    e: Konva.KonvaEventObject<DragEvent>,
    initialBounds: { x1: number; y1: number; x2: number; y2: number }
  ): void;
  handleSelectionDragEnd(
    initialBounds: { x1: number; y1: number; x2: number; y2: number },
    objectsRecord: Record<string, IBoardObject>,
    frames: IBoardObject[],
    childIndex: Map<string, Set<string>>
  ): void;
}

export function createDragCoordinator(config: IDragCoordinatorConfig): IDragCoordinator {
  return {
    selectObject: (id, metaKey) => dragCommit.selectObject(id, metaKey),
    onDragMove: (e, candidates) => alignmentEngine.onDragMove(e, candidates, config.overlayManager),
    commitDragEnd: (id, x, y, objectsRecord, frames, childIndex) =>
      dragCommit.commitDragEnd(id, x, y, config, objectsRecord, frames, childIndex),
    createDragBoundFunc: (id) => dragBounds.createDragBoundFunc(id, config),
    handleSelectionDragStart: (bounds, objectsRecord, childIndex) =>
      dragCommit.handleSelectionDragStart(bounds, objectsRecord, childIndex),
    handleSelectionDragMove: (e, initialBounds) =>
      dragCommit.handleSelectionDragMove(e, initialBounds),
    handleSelectionDragEnd: (initialBounds, objectsRecord, frames, childIndex) =>
      dragCommit.handleSelectionDragEnd(initialBounds, config, objectsRecord, frames, childIndex),
  };
}
