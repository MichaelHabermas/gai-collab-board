import { create } from 'zustand';
import type { IBoardObject } from '@/types';

interface IObjectsStoreState {
  /** All board objects keyed by ID. Single source of truth for shape data. */
  objects: Record<string, IBoardObject>;
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

export const useObjectsStore = create<IObjectsStore>()((set) => ({
  objects: {},

  setAll: (objectsList) => {
    const record: Record<string, IBoardObject> = {};
    for (const obj of objectsList) {
      record[obj.id] = obj;
    }
    set({ objects: record });
  },

  setObject: (object) => {
    set((state) => ({
      objects: { ...state.objects, [object.id]: object },
    }));
  },

  setObjects: (objectsList) => {
    set((state) => {
      const next = { ...state.objects };
      for (const obj of objectsList) {
        next[obj.id] = obj;
      }
      return { objects: next };
    });
  },

  updateObject: (id, updates) => {
    set((state) => {
      const existing = state.objects[id];
      if (!existing) return state;

      return {
        objects: { ...state.objects, [id]: { ...existing, ...updates } },
      };
    });
  },

  deleteObject: (id) => {
    set((state) => {
      const rest = { ...state.objects };
      delete rest[id];
      return { objects: rest };
    });
  },

  deleteObjects: (ids) => {
    set((state) => {
      const next = { ...state.objects };
      for (const id of ids) {
        delete next[id];
      }
      return { objects: next };
    });
  },

  clear: () => {
    set({ objects: {} });
  },
}));

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

/** Select all children of a frame (treats '' and undefined as no parent). */
export const selectFrameChildren =
  (frameId: string) =>
  (state: IObjectsStore): IBoardObject[] =>
    Object.values(state.objects).filter((o) => o.parentFrameId === frameId && frameId !== '');

/** Select all frame objects. */
export const selectFrames = (state: IObjectsStore): IBoardObject[] =>
  Object.values(state.objects).filter((o) => o.type === 'frame');
