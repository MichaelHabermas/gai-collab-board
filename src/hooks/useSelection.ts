import { useState, useCallback } from 'react';

interface IUseSelectionReturn {
  selectedIds: string[];
  selectOne: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

/**
 * Hook for managing selection state.
 * Supports single selection, multi-selection, and toggle operations.
 */
export const useSelection = (): IUseSelectionReturn => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Select a single item (replaces current selection)
  const selectOne = useCallback((id: string) => {
    setSelectedIds([id]);
  }, []);

  // Select multiple items (replaces current selection)
  const selectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  // Toggle selection of an item
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  }, []);

  // Add an item to selection
  const addToSelection = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  // Remove an item from selection
  const removeFromSelection = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Check if an item is selected
  const isSelected = useCallback(
    (id: string) => {
      return selectedIds.includes(id);
    },
    [selectedIds]
  );

  return {
    selectedIds,
    selectOne,
    selectMultiple,
    toggleSelection,
    addToSelection,
    removeFromSelection,
    clearSelection,
    isSelected,
  };
};
