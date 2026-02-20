import { create } from 'zustand';

interface ISelectionStoreState {
  selectedIds: Set<string>;
}

interface ISelectionStoreActions {
  setSelectedIds: (nextSelectedIds: string[]) => void;
  toggleSelectedId: (id: string) => void;
  clearSelection: () => void;
}

type ISelectionStore = ISelectionStoreState & ISelectionStoreActions;

const EMPTY_SET = new Set<string>();

export const useSelectionStore = create<ISelectionStore>()((set) => ({
  selectedIds: EMPTY_SET,
  setSelectedIds: (nextSelectedIds) => {
    set({ selectedIds: new Set(nextSelectedIds) });
  },
  toggleSelectedId: (id) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return { selectedIds: next };
    });
  },
  clearSelection: () => {
    set({ selectedIds: EMPTY_SET });
  },
}));

/** Test helper: set selection from tests without rendering. */
export const setSelectionStoreState = (nextSelectedIds: string[]): void => {
  useSelectionStore.getState().setSelectedIds(nextSelectedIds);
};
