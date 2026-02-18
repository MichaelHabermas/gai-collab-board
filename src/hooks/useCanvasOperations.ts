import { useState, useCallback, useEffect } from 'react';
import type { IBoardObject } from '@/types';

interface IUseCanvasOperationsProps {
  objects: IBoardObject[];
  selectedIds: string[];
  onObjectCreate: (params: Partial<IBoardObject>) => void;
  onObjectDelete: (objectId: string) => void;
  onObjectsDeleteBatch?: (objectIds: string[]) => void;
  clearSelection: () => void;
}

interface IUseCanvasOperationsReturn {
  clipboard: IBoardObject[];
  handleDelete: () => void;
  handleDuplicate: () => void;
  handleCopy: () => void;
  handlePaste: (offsetX?: number, offsetY?: number) => void;
  handleSelectAll: () => void;
}

const DUPLICATE_OFFSET = 20;
const PASTE_OFFSET = 30;

/**
 * Hook for managing canvas operations like delete, duplicate, copy, and paste.
 * Also handles keyboard shortcuts for these operations.
 */
export const useCanvasOperations = ({
  objects,
  selectedIds,
  onObjectCreate,
  onObjectDelete,
  onObjectsDeleteBatch,
  clearSelection,
}: IUseCanvasOperationsProps): IUseCanvasOperationsReturn => {
  const [clipboard, setClipboard] = useState<IBoardObject[]>([]);

  // Get selected objects
  const getSelectedObjects = useCallback(() => {
    return objects.filter((obj) => selectedIds.includes(obj.id));
  }, [objects, selectedIds]);

  // Delete selected objects (batch when multiple and batch callback provided)
  const handleDelete = useCallback(() => {
    if (selectedIds.length === 0) {
      return;
    }

    if (selectedIds.length > 1 && onObjectsDeleteBatch) {
      onObjectsDeleteBatch(selectedIds);
    } else {
      selectedIds.forEach((id) => {
        onObjectDelete(id);
      });
    }

    clearSelection();
  }, [selectedIds, onObjectDelete, onObjectsDeleteBatch, clearSelection]);

  // Duplicate selected objects with offset
  const handleDuplicate = useCallback(() => {
    const selectedObjects = getSelectedObjects();

    selectedObjects.forEach((obj) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = obj;
      onObjectCreate({
        ...rest,
        x: obj.x + DUPLICATE_OFFSET,
        y: obj.y + DUPLICATE_OFFSET,
      });
    });
  }, [getSelectedObjects, onObjectCreate]);

  // Copy selected objects to clipboard
  const handleCopy = useCallback(() => {
    const selectedObjects = getSelectedObjects();
    setClipboard(selectedObjects);
  }, [getSelectedObjects]);

  // Paste objects from clipboard
  const handlePaste = useCallback(
    (offsetX: number = PASTE_OFFSET, offsetY: number = PASTE_OFFSET) => {
      clipboard.forEach((obj) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = obj;
        onObjectCreate({
          ...rest,
          x: obj.x + offsetX,
          y: obj.y + offsetY,
        });
      });
    },
    [clipboard, onObjectCreate]
  );

  // Select all objects
  const handleSelectAll = useCallback(() => {
    // This would need to be implemented with setSelectedIds
    // For now, it's a no-op since we don't have direct access to setSelectedIds
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Delete or Backspace - delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        handleDelete();
        return;
      }

      // Ctrl/Cmd + D - duplicate
      if (isCtrlOrCmd && e.key === 'd' && selectedIds.length > 0) {
        e.preventDefault();
        handleDuplicate();
        return;
      }

      // Ctrl/Cmd + C - copy
      if (isCtrlOrCmd && e.key === 'c' && selectedIds.length > 0) {
        e.preventDefault();
        handleCopy();
        return;
      }

      // Ctrl/Cmd + V - paste
      if (isCtrlOrCmd && e.key === 'v' && clipboard.length > 0) {
        e.preventDefault();
        handlePaste();
        return;
      }

      // Escape - clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedIds,
    clipboard,
    handleDelete,
    handleDuplicate,
    handleCopy,
    handlePaste,
    clearSelection,
  ]);

  return {
    clipboard,
    handleDelete,
    handleDuplicate,
    handleCopy,
    handlePaste,
    handleSelectAll,
  };
};
