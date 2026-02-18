import {
  collection,
  type DocumentChange,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  Unsubscribe,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { IBoardObject, ICreateObjectParams, IUpdateObjectParams } from '@/types';

const OBJECTS_SUBCOLLECTION = 'objects';
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

/**
 * Gets the reference to the objects subcollection for a board.
 */
const getObjectsCollection = (boardId: string) => {
  return collection(firestore, 'boards', boardId, OBJECTS_SUBCOLLECTION);
};

/**
 * Gets a reference to a specific object document.
 */
const getObjectRef = (boardId: string, objectId: string) => {
  return doc(firestore, 'boards', boardId, OBJECTS_SUBCOLLECTION, objectId);
};

// ============================================================================
// Object Creation
// ============================================================================

export type { ICreateObjectParams, IUpdateObjectParams };

/**
 * Creates a new object on the board.
 * Returns the created object with its generated ID.
 */
export const createObject = async (
  boardId: string,
  params: ICreateObjectParams
): Promise<IBoardObject> => {
  const objectsRef = getObjectsCollection(boardId);
  const objectRef = doc(objectsRef);
  const now = Timestamp.now();

  // Build object, only including defined fields (Firestore doesn't allow undefined)
  const object: IBoardObject = {
    id: objectRef.id,
    type: params.type,
    x: params.x,
    y: params.y,
    width: params.width,
    height: params.height,
    rotation: params.rotation ?? 0,
    fill: params.fill,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  // Only add optional fields if they are defined
  if (params.stroke !== undefined) {
    object.stroke = params.stroke;
  }
  if (params.strokeWidth !== undefined) {
    object.strokeWidth = params.strokeWidth;
  }
  if (params.text !== undefined) {
    object.text = params.text;
  }
  if (params.textFill !== undefined) {
    object.textFill = params.textFill;
  }
  if (params.fontSize !== undefined) {
    object.fontSize = params.fontSize;
  }
  if (params.opacity !== undefined) {
    object.opacity = params.opacity;
  }
  if (params.points !== undefined) {
    object.points = params.points;
  }
  if (params.fromObjectId !== undefined) {
    object.fromObjectId = params.fromObjectId;
  }
  if (params.toObjectId !== undefined) {
    object.toObjectId = params.toObjectId;
  }
  if (params.fromAnchor !== undefined) {
    object.fromAnchor = params.fromAnchor;
  }
  if (params.toAnchor !== undefined) {
    object.toAnchor = params.toAnchor;
  }

  await setDoc(objectRef, object);
  return object;
};

/**
 * Creates multiple objects in a batch operation.
 * More efficient than creating objects one by one.
 */
export const createObjectsBatch = async (
  boardId: string,
  objects: ICreateObjectParams[]
): Promise<IBoardObject[]> => {
  const batch = writeBatch(firestore);
  const now = Timestamp.now();
  const createdObjects: IBoardObject[] = [];

  for (const params of objects) {
    const objectsRef = getObjectsCollection(boardId);
    const objectRef = doc(objectsRef);

    const object: IBoardObject = {
      id: objectRef.id,
      type: params.type,
      x: params.x,
      y: params.y,
      width: params.width,
      height: params.height,
      rotation: params.rotation ?? 0,
      fill: params.fill,
      stroke: params.stroke,
      strokeWidth: params.strokeWidth,
      text: params.text,
      textFill: params.textFill,
      fontSize: params.fontSize,
      points: params.points,
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    if (params.opacity !== undefined) {
      object.opacity = params.opacity;
    }

    batch.set(objectRef, object);
    createdObjects.push(object);
  }

  await batch.commit();
  return createdObjects;
};

// ============================================================================
// Object Updates
// ============================================================================

/**
 * Updates an existing object on the board.
 * Only updates the fields provided in the params.
 */
export const updateObject = async (
  boardId: string,
  objectId: string,
  updates: IUpdateObjectParams
): Promise<void> => {
  const objectRef = getObjectRef(boardId, objectId);
  await updateDoc(objectRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Updates multiple objects in a batch operation.
 */
export const updateObjectsBatch = async (
  boardId: string,
  updates: Array<{ objectId: string; updates: IUpdateObjectParams }>
): Promise<void> => {
  const batch = writeBatch(firestore);
  const now = Timestamp.now();

  for (const { objectId, updates: objectUpdates } of updates) {
    const objectRef = getObjectRef(boardId, objectId);
    batch.update(objectRef, {
      ...objectUpdates,
      updatedAt: now,
    });
  }

  await batch.commit();
};

// ============================================================================
// Object Deletion
// ============================================================================

/**
 * Deletes an object from the board.
 */
export const deleteObject = async (boardId: string, objectId: string): Promise<void> => {
  const objectRef = getObjectRef(boardId, objectId);
  await deleteDoc(objectRef);
};

/**
 * Deletes multiple objects in a batch operation.
 */
export const deleteObjectsBatch = async (boardId: string, objectIds: string[]): Promise<void> => {
  const batch = writeBatch(firestore);

  for (const objectId of objectIds) {
    const objectRef = getObjectRef(boardId, objectId);
    batch.delete(objectRef);
  }

  await batch.commit();
};

// ============================================================================
// Object Subscription
// ============================================================================

/**
 * Subscribes to real-time updates for all objects on a board.
 * Returns an unsubscribe function.
 */
export const subscribeToObjects = (
  boardId: string,
  callback: (objects: IBoardObject[]) => void
): Unsubscribe => {
  return subscribeToObjectsWithChanges(boardId, (update) => {
    callback(update.objects);
  });
};

/**
 * Subscribes to real-time updates for all objects on a board and returns
 * both the full object list and incremental document changes.
 */
export const subscribeToObjectsWithChanges = (
  boardId: string,
  callback: (update: IObjectsSnapshotUpdate) => void
): Unsubscribe => {
  const objectsRef = getObjectsCollection(boardId);
  const objectsQuery = query(objectsRef, orderBy('createdAt', 'asc'));
  let isFirstSnapshot = true;

  return onSnapshot(objectsQuery, (snapshot) => {
    const objects: IBoardObject[] =
      'docs' in snapshot && Array.isArray(snapshot.docs)
        ? snapshot.docs.map((snapshotDoc) => snapshotDoc.data() as IBoardObject)
        : (() => {
            const nextObjects: IBoardObject[] = [];
            snapshot.forEach((snapshotDoc) => {
              nextObjects.push(snapshotDoc.data() as IBoardObject);
            });
            return nextObjects;
          })();

    const changes: IObjectChange[] =
      typeof snapshot.docChanges === 'function'
        ? snapshot.docChanges().map(
            (change: DocumentChange): IObjectChange => ({
              type: change.type as ObjectChangeType,
              object: change.doc.data() as IBoardObject,
            })
          )
        : [];

    callback({
      objects,
      changes,
      isInitialSnapshot: isFirstSnapshot,
    });
    isFirstSnapshot = false;
  });
};

// ============================================================================
// Conflict Resolution
// ============================================================================

/**
 * Merges local and remote object states using last-write-wins strategy.
 * Returns the object with the most recent updatedAt timestamp.
 */
export const mergeObjectUpdates = (local: IBoardObject, remote: IBoardObject): IBoardObject => {
  const localTime = local.updatedAt?.toMillis?.() || 0;
  const remoteTime = remote.updatedAt?.toMillis?.() || 0;
  return remoteTime > localTime ? remote : local;
};
