import { create } from 'zustand';
import type { IHistoryEntry } from '@/types/history';

const MAX_UNDO_STACK = 50;

interface IHistoryStoreState {
  undoStack: IHistoryEntry[];
  redoStack: IHistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
}

interface IHistoryStoreActions {
  /** Push a new entry onto the undo stack (clears redo stack). */
  push: (entry: IHistoryEntry) => void;
  /** Pop the latest entry from the undo stack and move it to redo. Returns the entry to reverse. */
  undo: () => IHistoryEntry | null;
  /** Pop the latest entry from the redo stack and move it to undo. Returns the entry to reapply. */
  redo: () => IHistoryEntry | null;
  /** Clear all history (e.g. on board switch). */
  clear: () => void;
}

type IHistoryStore = IHistoryStoreState & IHistoryStoreActions;

export const useHistoryStore = create<IHistoryStore>()((set, get) => ({
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  push: (entry) => {
    set((state) => {
      const nextUndo = [...state.undoStack, entry].slice(-MAX_UNDO_STACK);
      return {
        undoStack: nextUndo,
        redoStack: [],
        canUndo: nextUndo.length > 0,
        canRedo: false,
      };
    });
  },

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return null;

    const entry = undoStack[undoStack.length - 1]!;
    set((state) => {
      const nextUndo = state.undoStack.slice(0, -1);
      const nextRedo = [...state.redoStack, entry];
      return {
        undoStack: nextUndo,
        redoStack: nextRedo,
        canUndo: nextUndo.length > 0,
        canRedo: true,
      };
    });
    return entry;
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return null;

    const entry = redoStack[redoStack.length - 1]!;
    set((state) => {
      const nextRedo = state.redoStack.slice(0, -1);
      const nextUndo = [...state.undoStack, entry].slice(-MAX_UNDO_STACK);
      return {
        undoStack: nextUndo,
        redoStack: nextRedo,
        canUndo: true,
        canRedo: nextRedo.length > 0,
      };
    });
    return entry;
  },

  clear: () => {
    set({ undoStack: [], redoStack: [], canUndo: false, canRedo: false });
  },
}));
