import { describe, it, expect, beforeEach } from 'vitest';
import { useSelectionStore, setSelectionStoreState } from '@/stores/selectionStore';

describe('selectionStore', () => {
  beforeEach(() => {
    useSelectionStore.getState().clearSelection();
  });

  describe('setSelectedIds', () => {
    it('replaces selection with given IDs', () => {
      useSelectionStore.getState().setSelectedIds(['a', 'b']);
      expect(useSelectionStore.getState().selectedIds).toEqual(new Set(['a', 'b']));
    });

    it('replaces previous selection entirely', () => {
      useSelectionStore.getState().setSelectedIds(['a']);
      useSelectionStore.getState().setSelectedIds(['b', 'c']);
      expect(useSelectionStore.getState().selectedIds).toEqual(new Set(['b', 'c']));
    });

    it('accepts empty array', () => {
      useSelectionStore.getState().setSelectedIds(['a']);
      useSelectionStore.getState().setSelectedIds([]);
      expect(useSelectionStore.getState().selectedIds.size).toBe(0);
    });
  });

  describe('toggleSelectedId', () => {
    it('adds an ID that is not selected', () => {
      useSelectionStore.getState().toggleSelectedId('a');
      expect(useSelectionStore.getState().selectedIds.has('a')).toBe(true);
    });

    it('removes an ID that is already selected', () => {
      useSelectionStore.getState().setSelectedIds(['a', 'b']);
      useSelectionStore.getState().toggleSelectedId('a');
      const ids = useSelectionStore.getState().selectedIds;
      expect(ids.has('a')).toBe(false);
      expect(ids.has('b')).toBe(true);
    });

    it('toggle add then remove round-trips', () => {
      useSelectionStore.getState().toggleSelectedId('x');
      expect(useSelectionStore.getState().selectedIds.has('x')).toBe(true);
      useSelectionStore.getState().toggleSelectedId('x');
      expect(useSelectionStore.getState().selectedIds.has('x')).toBe(false);
    });
  });

  describe('clearSelection', () => {
    it('clears all selected IDs', () => {
      useSelectionStore.getState().setSelectedIds(['a', 'b', 'c']);
      useSelectionStore.getState().clearSelection();
      expect(useSelectionStore.getState().selectedIds.size).toBe(0);
    });

    it('is idempotent on empty selection', () => {
      useSelectionStore.getState().clearSelection();
      expect(useSelectionStore.getState().selectedIds.size).toBe(0);
    });
  });

  describe('setSelectionStoreState helper', () => {
    it('sets selection from test helper', () => {
      setSelectionStoreState(['x', 'y']);
      expect(useSelectionStore.getState().selectedIds).toEqual(new Set(['x', 'y']));
    });
  });
});
