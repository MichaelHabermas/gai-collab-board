/**
 * Repository abstractions for board persistence (Constitution Article III).
 * Provider-agnostic — no Firestore/RTDB types in signatures.
 */

import type { IBoardObject, ICreateObjectParams, IUpdateObjectParams } from './board';
import type { IPosition } from './geometry';

export type ObjectChangeType = 'added' | 'modified' | 'removed';

export interface IObjectChange {
  type: ObjectChangeType;
  object: IBoardObject;
}

export interface IObjectsSnapshotUpdate {
  objects: IBoardObject[];
  changes: IObjectChange[];
  isInitialSnapshot: boolean;
}

export interface IBatchUpdate {
  objectId: string;
  updates: IUpdateObjectParams;
}

/**
 * Persistent board object CRUD + subscription (Firestore-backed).
 * Constitution Article III: all persistence ops go through this interface.
 */
export interface IBoardRepository {
  createObject(boardId: string, params: ICreateObjectParams): Promise<IBoardObject>;
  createObjectsBatch(boardId: string, objects: ICreateObjectParams[]): Promise<IBoardObject[]>;
  updateObject(boardId: string, objectId: string, updates: IUpdateObjectParams): Promise<void>;
  updateObjectsBatch(boardId: string, updates: IBatchUpdate[]): Promise<void>;
  deleteObject(boardId: string, objectId: string): Promise<void>;
  deleteObjectsBatch(boardId: string, objectIds: string[]): Promise<void>;
  subscribeToObjects(
    boardId: string,
    callback: (update: IObjectsSnapshotUpdate) => void
  ): () => void;
}

export interface IDragUpdate {
  objectId: string;
  position: IPosition;
  timestamp: number;
}

/**
 * Ephemeral high-frequency sync (RTDB-backed).
 * Used for live drag positions — not canonical state.
 */
export interface IRealtimeSyncRepository {
  publishDragUpdate(boardId: string, objectId: string, position: IPosition): void;
  subscribeToDragUpdates(boardId: string, callback: (updates: IDragUpdate[]) => void): () => void;
}
