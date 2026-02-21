import {
  collection,
  type DocumentData,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  Timestamp,
  Unsubscribe,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  writeBatch,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { IBoardObject, ICreateObjectParams, IUpdateObjectParams } from '@/types';

const OBJECTS_SUBCOLLECTION = 'objects';
const LARGE_BOARD_BATCH_SIZE = 500;

export type ObjectChangeType = 'added' | 'modified' | 'removed';

function isBoardObject(value: DocumentData): value is IBoardObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    typeof value.x === 'number' &&
    typeof value.y === 'number'
  );
}

const VALID_CHANGE_TYPES: ReadonlySet<string> = new Set(['added', 'modified', 'removed']);

function isObjectChangeType(value: string): value is ObjectChangeType {
  return VALID_CHANGE_TYPES.has(value);
}

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
  if (params.stroke) {
    object.stroke = params.stroke;
  }

  if (params.strokeWidth) {
    object.strokeWidth = params.strokeWidth;
  }

  // Empty string is valid for sticky/text; do not use truthy check
  // eslint-disable-next-line local/prefer-falsy-over-explicit-nullish -- empty string must set text
  if (params.text !== undefined) {
    object.text = params.text;
  }

  if (params.textFill) {
    object.textFill = params.textFill;
  }

  if (params.fontSize) {
    object.fontSize = params.fontSize;
  }

  if (params.opacity) {
    object.opacity = params.opacity;
  }

  if (params.points) {
    object.points = params.points;
  }

  if (params.fromObjectId) {
    object.fromObjectId = params.fromObjectId;
  }

  if (params.toObjectId) {
    object.toObjectId = params.toObjectId;
  }

  if (params.fromAnchor) {
    object.fromAnchor = params.fromAnchor;
  }

  if (params.toAnchor) {
    object.toAnchor = params.toAnchor;
  }

  if (params.arrowheads) {
    object.arrowheads = params.arrowheads;
  }

  if (params.strokeStyle) {
    object.strokeStyle = params.strokeStyle;
  }

  if (params.parentFrameId) {
    object.parentFrameId = params.parentFrameId;
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

    // Build object with only required fields (same pattern as createObject)
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

    // Only add optional fields if defined (Firestore doesn't allow undefined)
    if (params.stroke) {
      object.stroke = params.stroke;
    }

    if (params.strokeWidth) {
      object.strokeWidth = params.strokeWidth;
    }

    // Empty string is valid for sticky/text; do not use truthy check
    // eslint-disable-next-line local/prefer-falsy-over-explicit-nullish -- empty string must set text
    if (params.text !== undefined) {
      object.text = params.text;
    }

    if (params.textFill) {
      object.textFill = params.textFill;
    }

    if (params.fontSize) {
      object.fontSize = params.fontSize;
    }

    if (params.opacity) {
      object.opacity = params.opacity;
    }

    if (params.points) {
      object.points = params.points;
    }

    if (params.fromObjectId) {
      object.fromObjectId = params.fromObjectId;
    }

    if (params.toObjectId) {
      object.toObjectId = params.toObjectId;
    }

    if (params.fromAnchor) {
      object.fromAnchor = params.fromAnchor;
    }

    if (params.toAnchor) {
      object.toAnchor = params.toAnchor;
    }

    if (params.arrowheads) {
      object.arrowheads = params.arrowheads;
    }

    if (params.strokeStyle) {
      object.strokeStyle = params.strokeStyle;
    }

    if (params.parentFrameId) {
      object.parentFrameId = params.parentFrameId;
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
    const objects: IBoardObject[] = [];

    if ('docs' in snapshot && Array.isArray(snapshot.docs)) {
      for (const snapshotDoc of snapshot.docs) {
        const data = snapshotDoc.data();
        if (isBoardObject(data)) {
          objects.push(data);
        }
      }
    } else {
      snapshot.forEach((snapshotDoc) => {
        const data = snapshotDoc.data();
        if (isBoardObject(data)) {
          objects.push(data);
        }
      });
    }

    const changes: IObjectChange[] = [];

    if (typeof snapshot.docChanges === 'function') {
      for (const change of snapshot.docChanges()) {
        const data = change.doc.data();
        if (isBoardObject(data) && isObjectChangeType(change.type)) {
          changes.push({ type: change.type, object: data });
        }
      }
    }

    callback({
      objects,
      changes,
      isInitialSnapshot: isFirstSnapshot,
    });
    isFirstSnapshot = false;
  });
};

// ============================================================================
// Paginated Fetch (large boards)
// ============================================================================

/**
 * Fetch a limited batch of objects for board size probing (S3).
 * Single getDocs call — use to determine if pagination is needed
 * before committing to a subscription strategy.
 */
export const fetchObjectsBatch = async (
  boardId: string,
  batchLimit: number
): Promise<IBoardObject[]> => {
  const objectsRef = getObjectsCollection(boardId);
  const batchQuery = query(objectsRef, orderBy('createdAt', 'asc'), limit(batchLimit));
  const snapshot = await getDocs(batchQuery);
  const objects: IBoardObject[] = [];

  for (const snapshotDoc of snapshot.docs) {
    const data = snapshotDoc.data();
    if (isBoardObject(data)) {
      objects.push(data);
    }
  }

  return objects;
};

/**
 * Fetches objects in batches for large boards.
 * Use when the initial load should avoid downloading all documents at once.
 */
export const fetchObjectsPaginated = async (
  boardId: string,
  batchSize = LARGE_BOARD_BATCH_SIZE
): Promise<IBoardObject[]> => {
  const objectsRef = getObjectsCollection(boardId);
  const allObjects: IBoardObject[] = [];
  let cursor: DocumentData | undefined;

  for (;;) {
    const batchQuery = cursor
      ? query(objectsRef, orderBy('createdAt', 'asc'), startAfter(cursor), limit(batchSize))
      : query(objectsRef, orderBy('createdAt', 'asc'), limit(batchSize));

    const snapshot = await getDocs(batchQuery);

    for (const snapshotDoc of snapshot.docs) {
      const data = snapshotDoc.data();
      if (isBoardObject(data)) {
        allObjects.push(data);
      }
    }

    if (snapshot.docs.length < batchSize) {
      break;
    }

    cursor = snapshot.docs[snapshot.docs.length - 1];
  }

  return allObjects;
};

/**
 * Subscribes to objects updated after a given timestamp.
 * Use for delta reconnection — merge results with cached state.
 */
export const subscribeToDeltaUpdates = (
  boardId: string,
  afterTimestamp: Timestamp,
  callback: (update: IObjectsSnapshotUpdate) => void
): Unsubscribe => {
  const objectsRef = getObjectsCollection(boardId);
  const deltaQuery = query(
    objectsRef,
    where('updatedAt', '>', afterTimestamp),
    orderBy('updatedAt', 'asc')
  );
  let isFirstSnapshot = true;

  return onSnapshot(deltaQuery, (snapshot) => {
    const objects: IBoardObject[] = [];

    if ('docs' in snapshot && Array.isArray(snapshot.docs)) {
      for (const snapshotDoc of snapshot.docs) {
        const data = snapshotDoc.data();
        if (isBoardObject(data)) {
          objects.push(data);
        }
      }
    }

    const changes: IObjectChange[] = [];

    if (typeof snapshot.docChanges === 'function') {
      for (const change of snapshot.docChanges()) {
        const data = change.doc.data();
        if (isBoardObject(data) && isObjectChangeType(change.type)) {
          changes.push({ type: change.type, object: data });
        }
      }
    }

    callback({ objects, changes, isInitialSnapshot: isFirstSnapshot });
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
