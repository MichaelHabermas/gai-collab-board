import { useState, useCallback, useEffect } from 'react';
import type { IBoardObject } from '@/types';
import { getFrameChildren } from '@/hooks/useFrameContainment';

interface IUseCanvasOperationsProps {
  objects: IBoardObject[];
  selectedIds: string[];
  onObjectCreate: (params: Partial<IBoardObject>) => void;
  onObjectUpdate?: (objectId: string, updates: Partial<IBoardObject>) => void;
  onObjectsUpdate?: (updates: Array<{ objectId: string; updates: Partial<IBoardObject> }>) => void;
  onObjectDelete: (objectId: string) => void;
  onObjectsDeleteBatch?: (objectIds: string[]) => void | Promise<void>;
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
  onObjectUpdate,
  onObjectsUpdate,
  onObjectDelete,
  onObjectsDeleteBatch,
  clearSelection,
}: IUseCanvasOperationsProps): IUseCanvasOperationsReturn => {
  const [clipboard, setClipboard] = useState<IBoardObject[]>([]);

  // Get selected objects
  const getSelectedObjects = useCallback(() => {
    return objects.filter((obj) => selectedIds.includes(obj.id));
  }, [objects, selectedIds]);

  // Delete selected objects (batch when multiple and batch callback provided).
  // When deleting a frame, unparent its children that are NOT also being deleted.
  const handleDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;

    const deletingIds = new Set(selectedIds);

    // Unparent children of frames being deleted (children NOT in the selection stay on canvas)
    const unparentUpdates: Array<{ objectId: string; updates: Partial<IBoardObject> }> = [];
    for (const id of selectedIds) {
      const obj = objects.find((o) => o.id === id);
      if (obj?.type !== 'frame') continue;

      const children = getFrameChildren(id, objects);
      for (const child of children) {
        if (deletingIds.has(child.id)) continue;

        unparentUpdates.push({ objectId: child.id, updates: { parentFrameId: '' } });
      }
    }

    if (unparentUpdates.length > 0 && onObjectsUpdate) {
      await Promise.resolve(onObjectsUpdate(unparentUpdates));
    } else if (unparentUpdates.length > 0 && onObjectUpdate) {
      for (const u of unparentUpdates) {
        onObjectUpdate(u.objectId, u.updates);
      }
    }

    // Delete the selected objects
    if (selectedIds.length > 1 && onObjectsDeleteBatch) {
      await Promise.resolve(onObjectsDeleteBatch(selectedIds));
    } else {
      selectedIds.forEach((id) => {
        onObjectDelete(id);
      });
    }

    clearSelection();
  }, [
    selectedIds,
    objects,
    onObjectUpdate,
    onObjectsUpdate,
    onObjectDelete,
    onObjectsDeleteBatch,
    clearSelection,
  ]);

  // Duplicate selected objects with offset.
  // Strip parentFrameId — duplicates land at an offset and are not inside the original frame.
  // Spatial reparenting resolves on the next drag-end if the duplicate is inside a frame.
  const handleDuplicate = useCallback(() => {
    const selectedObjects = getSelectedObjects();

    selectedObjects.forEach((obj) => {
      const {
        id: _id,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        parentFrameId: _pfid,
        ...rest
      } = obj;
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

  // Paste objects from clipboard.
  // Strip parentFrameId — pasted objects are unparented; spatial reparenting resolves on drag.
  const handlePaste = useCallback(
    (offsetX: number = PASTE_OFFSET, offsetY: number = PASTE_OFFSET) => {
      clipboard.forEach((obj) => {
        const {
          id: _id,
          createdAt: _createdAt,
          updatedAt: _updatedAt,
          parentFrameId: _pfid,
          ...rest
        } = obj;
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
