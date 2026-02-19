import { create } from 'zustand';

type ISelectedIdsUpdater = string[] | ((prevSelectedIds: string[]) => string[]);

interface ISelectionStoreState {
  selectedIds: string[];
}

interface ISelectionStoreActions {
  setSelectedIds: (nextSelectedIds: ISelectedIdsUpdater) => void;
  clearSelection: () => void;
}

type ISelectionStore = ISelectionStoreState & ISelectionStoreActions;

export const useSelectionStore = create<ISelectionStore>()((set) => ({
  selectedIds: [],
  setSelectedIds: (nextSelectedIds) => {
    set((state) => ({
      selectedIds:
        typeof nextSelectedIds === 'function'
          ? nextSelectedIds(state.selectedIds)
          : nextSelectedIds,
    }));
  },
  clearSelection: () => {
    set({ selectedIds: [] });
  },
}));

/** Test helper: set selection from tests without rendering. */
export const setSelectionStoreState = (nextSelectedIds: string[]): void => {
  useSelectionStore.getState().setSelectedIds(nextSelectedIds);
};
