import { create } from 'zustand';
import type { IBoardObject } from '@/types';
import { SpatialIndex } from '@/lib/spatialIndex';
import { getObjectBounds } from '@/lib/canvasBounds';

interface IObjectsStoreState {
  /** All board objects keyed by ID. Single source of truth for shape data. */
  objects: Record<string, IBoardObject>;
  /** Cached index: frameId → Set of child object IDs with that parentFrameId. */
  frameChildrenIndex: Map<string, Set<string>>;
  /** Cached index: shapeId → Set of connector IDs that reference it as from/to endpoint. */
  connectorsByEndpoint: Map<string, Set<string>>;
}

interface IObjectsStoreActions {
  /** Replace all objects (initial snapshot or full reset). */
  setAll: (objects: IBoardObject[]) => void;
  /** Insert or update a single object. */
  setObject: (object: IBoardObject) => void;
  /** Batch insert/update multiple objects. */
  setObjects: (objects: IBoardObject[]) => void;
  /** Update a single object by merging partial fields. */
  updateObject: (id: string, updates: Partial<IBoardObject>) => void;
  /** Remove a single object. */
  deleteObject: (id: string) => void;
  /** Remove multiple objects. */
  deleteObjects: (ids: string[]) => void;
  /** Clear entire store (board switch / unmount). */
  clear: () => void;
}

type IObjectsStore = IObjectsStoreState & IObjectsStoreActions;

const EMPTY_INDEX = new Map<string, Set<string>>();

interface IIndexes {
  frameChildrenIndex: Map<string, Set<string>>;
  connectorsByEndpoint: Map<string, Set<string>>;
}

/** Helper: add id to a Map<string, Set<string>> under key. Mutates in place. */
const addToIndex = (index: Map<string, Set<string>>, key: string, id: string): void => {
  let set = index.get(key);
  if (!set) {
    set = new Set<string>();
    index.set(key, set);
  }

  set.add(id);
};

/** Build both indexes from objects record in a single O(n) pass. */
const buildIndexes = (objects: Record<string, IBoardObject>): IIndexes => {
  const frameChildrenIndex = new Map<string, Set<string>>();
  const connectorsByEndpoint = new Map<string, Set<string>>();

  for (const id in objects) {
    const obj = objects[id]!;
    if (obj.parentFrameId) {
      addToIndex(frameChildrenIndex, obj.parentFrameId, id);
    }

    if (obj.type === 'connector') {
      if (obj.fromObjectId) addToIndex(connectorsByEndpoint, obj.fromObjectId, id);

      if (obj.toObjectId) addToIndex(connectorsByEndpoint, obj.toObjectId, id);
    }
  }

  return { frameChildrenIndex, connectorsByEndpoint };
};

// ── Module-level spatial index (not Zustand state — avoids subscriber churn) ──

/** Singleton spatial index for viewport culling and containment queries. */
export const spatialIndex = new SpatialIndex();

/** Rebuild the entire spatial index from an objects record. */
const rebuildSpatialIndex = (objects: Record<string, IBoardObject>): void => {
  spatialIndex.clear();
  for (const id in objects) {
    spatialIndex.insert(id, getObjectBounds(objects[id]!));
  }
};

/** Update spatial index for a single object. */
const updateSpatialForObject = (obj: IBoardObject): void => {
  spatialIndex.insert(obj.id, getObjectBounds(obj));
};

export const useObjectsStore = create<IObjectsStore>()((set) => ({
  objects: {},
  frameChildrenIndex: EMPTY_INDEX,
  connectorsByEndpoint: EMPTY_INDEX,

  setAll: (objectsList) => {
    const record: Record<string, IBoardObject> = {};
    for (const obj of objectsList) {
      record[obj.id] = obj;
    }
    rebuildSpatialIndex(record);
    set({ objects: record, ...buildIndexes(record) });
  },

  setObject: (object) => {
    updateSpatialForObject(object);
    set((state) => {
      const nextObjects = { ...state.objects, [object.id]: object };

      // Skip relationship index rebuild when parent/endpoints are unchanged (hot-path optimization).
      const existing = state.objects[object.id];
      if (existing) {
        const parentChanged = object.parentFrameId !== existing.parentFrameId;
        const endpointsChanged =
          (object.type === 'connector' || existing.type === 'connector') &&
          (object.fromObjectId !== existing.fromObjectId ||
            object.toObjectId !== existing.toObjectId);

        if (!parentChanged && !endpointsChanged) {
          return {
            objects: nextObjects,
            frameChildrenIndex: state.frameChildrenIndex,
            connectorsByEndpoint: state.connectorsByEndpoint,
          };
        }
      }

      return { objects: nextObjects, ...buildIndexes(nextObjects) };
    });
  },

  setObjects: (objectsList) => {
    for (const obj of objectsList) {
      updateSpatialForObject(obj);
    }
    set((state) => {
      const next = { ...state.objects };
      let needsIndexRebuild = false;
      for (const obj of objectsList) {
        const existing = state.objects[obj.id];
        if (!existing) {
          needsIndexRebuild = true;
        } else {
          const parentChanged = obj.parentFrameId !== existing.parentFrameId;
          const endpointsChanged =
            (obj.type === 'connector' || existing.type === 'connector') &&
            (obj.fromObjectId !== existing.fromObjectId || obj.toObjectId !== existing.toObjectId);
          if (parentChanged || endpointsChanged) needsIndexRebuild = true;
        }

        next[obj.id] = obj;
      }

      if (needsIndexRebuild) {
        return { objects: next, ...buildIndexes(next) };
      }

      return {
        objects: next,
        frameChildrenIndex: state.frameChildrenIndex,
        connectorsByEndpoint: state.connectorsByEndpoint,
      };
    });
  },

  updateObject: (id, updates) => {
    set((state) => {
      const existing = state.objects[id];
      if (!existing) return state;

      const merged = { ...existing, ...updates };
      const nextObjects = { ...state.objects, [id]: merged };

      // Update spatial index for position/size changes (always cheap — single object)
      updateSpatialForObject(merged);

      // Skip relationship index rebuild on hot path (drag moves that don't change relationships)
      const parentChanged =
        'parentFrameId' in updates && updates.parentFrameId !== existing.parentFrameId;
      const endpointsChanged =
        ('fromObjectId' in updates && updates.fromObjectId !== existing.fromObjectId) ||
        ('toObjectId' in updates && updates.toObjectId !== existing.toObjectId);

      if (parentChanged || endpointsChanged) {
        return { objects: nextObjects, ...buildIndexes(nextObjects) };
      }

      return {
        objects: nextObjects,
        frameChildrenIndex: state.frameChildrenIndex,
        connectorsByEndpoint: state.connectorsByEndpoint,
      };
    });
  },

  deleteObject: (id) => {
    spatialIndex.remove(id);
    set((state) => {
      const rest = { ...state.objects };
      delete rest[id];

      return { objects: rest, ...buildIndexes(rest) };
    });
  },

  deleteObjects: (ids) => {
    for (const id of ids) {
      spatialIndex.remove(id);
    }
    set((state) => {
      const next = { ...state.objects };
      for (const id of ids) {
        delete next[id];
      }

      return { objects: next, ...buildIndexes(next) };
    });
  },

  clear: () => {
    spatialIndex.clear();
    set({ objects: {}, frameChildrenIndex: EMPTY_INDEX, connectorsByEndpoint: EMPTY_INDEX });
  },
}));

// ── Dev-only store exposure for E2E benchmarks ──────────────────────────

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__objectsStore = useObjectsStore;
}

// ── Selectors ──────────────────────────────────────────────────────────

/** Select a single object by ID (per-shape subscription). */
export const selectObject =
  (id: string) =>
  (state: IObjectsStore): IBoardObject | undefined =>
    state.objects[id];

/** Select all objects as an array (use sparingly — causes re-render on any change). */
export const selectAllObjects = (state: IObjectsStore): IBoardObject[] =>
  Object.values(state.objects);

/** Select all object IDs. */
export const selectObjectIds = (state: IObjectsStore): string[] => Object.keys(state.objects);

/** Select all children of a frame via index (O(k) where k = children count). */
export const selectFrameChildren =
  (frameId: string) =>
  (state: IObjectsStore): IBoardObject[] => {
    if (!frameId) return [];

    const childIds = state.frameChildrenIndex.get(frameId);
    if (!childIds || childIds.size === 0) return [];

    const result: IBoardObject[] = [];
    for (const id of childIds) {
      const obj = state.objects[id];
      if (obj) result.push(obj);
    }

    return result;
  };

/** Select the count of children of a frame (O(1) via index). */
export const selectFrameChildCount =
  (frameId: string) =>
  (state: IObjectsStore): number => {
    if (!frameId) return 0;

    return state.frameChildrenIndex.get(frameId)?.size ?? 0;
  };

/** Select all frame objects. */
export const selectFrames = (state: IObjectsStore): IBoardObject[] =>
  Object.values(state.objects).filter((o) => o.type === 'frame');

/** Select connector IDs that reference a given shape as from/to endpoint (O(1) via index). */
export const selectConnectorsForObject =
  (objectId: string) =>
  (state: IObjectsStore): ReadonlySet<string> =>
    state.connectorsByEndpoint.get(objectId) ?? EMPTY_SET;

const EMPTY_SET = new Set<string>();
