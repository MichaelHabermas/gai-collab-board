import { useState, useCallback, useEffect, useRef } from 'react';
import type { IBoardObject } from '@/types';
import { getFrameChildren } from '@/hooks/useFrameContainment';
import { getObjectBounds } from '@/lib/canvasBounds';
import { useSelectionStore } from '@/stores/selectionStore';
import { useObjectsStore } from '@/stores/objectsStore';

interface IUseCanvasOperationsProps {
  objectsRecord: Record<string, IBoardObject>;
  selectedIds: string[];
  onObjectCreate: (params: Partial<IBoardObject>) => Promise<IBoardObject | null> | void;
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
}

const DUPLICATE_OFFSET = 20;
const PASTE_OFFSET = 30;

/**
 * Hook for managing canvas operations like delete, duplicate, copy, and paste.
 * Also handles keyboard shortcuts for these operations.
 */
export const useCanvasOperations = ({
  objectsRecord,
  selectedIds,
  onObjectCreate,
  onObjectUpdate,
  onObjectsUpdate,
  onObjectDelete,
  onObjectsDeleteBatch,
  clearSelection,
}: IUseCanvasOperationsProps): IUseCanvasOperationsReturn => {
  const [clipboard, setClipboard] = useState<IBoardObject[]>([]);

  // Delete selected objects (batch when multiple and batch callback provided).
  // When deleting a frame, unparent its children that are NOT also being deleted.
  const handleDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;

    const objects = Object.values(objectsRecord);
    const deletingIds = new Set(selectedIds);

    // Unparent children of frames being deleted (children NOT in the selection stay on canvas)
    const unparentUpdates: Array<{ objectId: string; updates: Partial<IBoardObject> }> = [];
    for (const id of selectedIds) {
      const obj = objectsRecord[id];
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
    objectsRecord,
    onObjectUpdate,
    onObjectsUpdate,
    onObjectDelete,
    onObjectsDeleteBatch,
    clearSelection,
  ]);

  // Duplicate selected objects with offset.
  // Frame-aware: when duplicating a frame, also duplicate its children and reparent them.
  const handleDuplicate = useCallback(async () => {
    const objects = Object.values(objectsRecord);
    const selectedObjects = objects.filter((obj) => selectedIds.includes(obj.id));
    const selectedIdSet = new Set(selectedIds);

    // Separate frames from non-frames to handle frame children
    const frames = selectedObjects.filter((o) => o.type === 'frame');
    const nonFrames = selectedObjects.filter((o) => o.type !== 'frame');

    // Track children of selected frames so we don't duplicate them twice
    const frameChildIds = new Set<string>();
    for (const frame of frames) {
      for (const child of getFrameChildren(frame.id, objects)) {
        frameChildIds.add(child.id);
      }
    }

    // Duplicate non-frame objects that aren't children of a selected frame
    for (const obj of nonFrames) {
      if (frameChildIds.has(obj.id) && !selectedIdSet.has(obj.id)) continue;

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
    }

    // Duplicate frames with their children
    for (const frame of frames) {
      const {
        id: _id,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        parentFrameId: _pfid,
        ...rest
      } = frame;
      const result = await Promise.resolve(
        onObjectCreate({
          ...rest,
          x: frame.x + DUPLICATE_OFFSET,
          y: frame.y + DUPLICATE_OFFSET,
        })
      );

      // If we got the new frame back, duplicate its children with the new parentFrameId
      const newFrameId = result?.id;
      if (newFrameId) {
        const children = getFrameChildren(frame.id, objects);
        for (const child of children) {
          // Skip children that are independently selected (already duplicated above)
          if (selectedIdSet.has(child.id)) continue;

          const {
            id: _cid,
            createdAt: _cca,
            updatedAt: _cua,
            parentFrameId: _cpfid,
            ...childRest
          } = child;
          onObjectCreate({
            ...childRest,
            x: child.x + DUPLICATE_OFFSET,
            y: child.y + DUPLICATE_OFFSET,
            parentFrameId: newFrameId,
          });
        }
      }
    }
  }, [selectedIds, objectsRecord, onObjectCreate]);

  // Copy selected objects to clipboard (includes frame children automatically)
  const handleCopy = useCallback(() => {
    const objects = Object.values(objectsRecord);
    const selectedObjects = objects.filter((obj) => selectedIds.includes(obj.id));
    const selectedIdSet = new Set(selectedIds);

    // Include children of selected frames that aren't independently selected
    const extras: IBoardObject[] = [];
    for (const obj of selectedObjects) {
      if (obj.type === 'frame') {
        const children = getFrameChildren(obj.id, objects);
        for (const child of children) {
          if (!selectedIdSet.has(child.id)) {
            extras.push(child);
          }
        }
      }
    }

    setClipboard([...selectedObjects, ...extras]);
  }, [selectedIds, objectsRecord]);

  // Paste objects from clipboard.
  // Frame-aware: when pasting a frame, also paste its children with correct parentFrameId.
  const handlePaste = useCallback(
    async (offsetX: number = PASTE_OFFSET, offsetY: number = PASTE_OFFSET) => {
      const clipboardIds = new Set(clipboard.map((o) => o.id));

      // Separate frames from non-frames
      const frames = clipboard.filter((o) => o.type === 'frame');
      const frameIds = new Set(frames.map((f) => f.id));

      // Identify children of clipboard frames (objects whose parentFrameId is a clipboard frame)
      const frameChildIds = new Set<string>();
      for (const obj of clipboard) {
        if (obj.parentFrameId && frameIds.has(obj.parentFrameId)) {
          frameChildIds.add(obj.id);
        }
      }

      // Paste non-frame objects that aren't children of a clipboard frame
      for (const obj of clipboard) {
        if (obj.type === 'frame') continue;

        if (frameChildIds.has(obj.id) && !clipboardIds.has(obj.id)) continue;

        // Skip frame children — they'll be pasted with their frame
        if (frameChildIds.has(obj.id)) continue;

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
      }

      // Paste frames with their children
      for (const frame of frames) {
        const {
          id: _id,
          createdAt: _createdAt,
          updatedAt: _updatedAt,
          parentFrameId: _pfid,
          ...rest
        } = frame;
        const result = await Promise.resolve(
          onObjectCreate({
            ...rest,
            x: frame.x + offsetX,
            y: frame.y + offsetY,
          })
        );

        const newFrameId = result?.id;
        if (newFrameId) {
          // Paste children of this frame
          const children = clipboard.filter(
            (o) => o.parentFrameId === frame.id && o.type !== 'frame'
          );
          for (const child of children) {
            const {
              id: _cid,
              createdAt: _cca,
              updatedAt: _cua,
              parentFrameId: _cpfid,
              ...childRest
            } = child;
            onObjectCreate({
              ...childRest,
              x: child.x + offsetX,
              y: child.y + offsetY,
              parentFrameId: newFrameId,
            });
          }
        }
      }
    },
    [clipboard, onObjectCreate]
  );

  // ── Keyboard shortcut effect ──────────────────────────────────────────
  // Reads selection + objects from Zustand stores at event time so the
  // listener registers once and never re-attaches.  Callbacks that can't
  // live in a store (local operations, callback props) are synced to refs
  // via a post-render effect — the React 19-sanctioned pattern.

  const handleDeleteRef = useRef(handleDelete);
  const handleDuplicateRef = useRef(handleDuplicate);
  const handleCopyRef = useRef(handleCopy);
  const handlePasteRef = useRef(handlePaste);
  const onObjectCreateRef = useRef(onObjectCreate);
  const clipboardRef = useRef(clipboard);

  useEffect(() => {
    handleDeleteRef.current = handleDelete;
    handleDuplicateRef.current = handleDuplicate;
    handleCopyRef.current = handleCopy;
    handlePasteRef.current = handlePaste;
    onObjectCreateRef.current = onObjectCreate;
    clipboardRef.current = clipboard;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Read latest state from stores at event time — always fresh
      const sel = useSelectionStore.getState();
      const selectedArr = [...sel.selectedIds];
      const objectsRecord = useObjectsStore.getState().objects;
      const allObjects = Object.values(objectsRecord);
      const clip = clipboardRef.current;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Delete or Backspace - delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedArr.length > 0) {
        e.preventDefault();
        handleDeleteRef.current();

        return;
      }

      // Ctrl/Cmd + D - duplicate
      if (isCtrlOrCmd && e.key === 'd' && selectedArr.length > 0) {
        e.preventDefault();
        handleDuplicateRef.current();

        return;
      }

      // Ctrl/Cmd + C - copy
      if (isCtrlOrCmd && e.key === 'c' && selectedArr.length > 0) {
        e.preventDefault();
        handleCopyRef.current();

        return;
      }

      // Ctrl/Cmd + V - paste
      if (isCtrlOrCmd && e.key === 'v' && clip.length > 0) {
        e.preventDefault();
        handlePasteRef.current();

        return;
      }

      // Enter — when a single frame is selected, select all its children
      if (e.key === 'Enter' && selectedArr.length === 1) {
        const obj = allObjects.find((o) => o.id === selectedArr[0]);
        if (obj?.type === 'frame') {
          e.preventDefault();
          const children = getFrameChildren(obj.id, allObjects);
          if (children.length > 0) {
            sel.setSelectedIds(children.map((c) => c.id));
          }

          return;
        }
      }

      // Ctrl/Cmd + A — when a single frame is selected, select its children instead of all objects
      if (isCtrlOrCmd && e.key === 'a') {
        e.preventDefault();
        if (selectedArr.length === 1) {
          const obj = allObjects.find((o) => o.id === selectedArr[0]);
          if (obj?.type === 'frame') {
            const children = getFrameChildren(obj.id, allObjects);
            if (children.length > 0) {
              sel.setSelectedIds(children.map((c) => c.id));

              return;
            }
          }
        }

        // Default: select all objects
        sel.setSelectedIds(allObjects.map((o) => o.id));

        return;
      }

      // Escape — navigate up: if all selected share a parentFrameId, select that frame;
      // otherwise clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedArr.length > 0) {
          const selectedObjs = allObjects.filter((o) => selectedArr.includes(o.id));
          const parentIds = new Set(
            selectedObjs.map((o) => o.parentFrameId).filter((pid) => pid != null && pid !== '')
          );
          if (parentIds.size === 1) {
            const parentId = parentIds.values().next().value;
            if (parentId) sel.setSelectedIds([parentId]);

            return;
          }
        }

        sel.clearSelection();

        return;
      }

      // F (no modifier) — frame the selection: create a frame around selected objects
      if (e.key === 'f' && !isCtrlOrCmd && !e.altKey && selectedArr.length > 0) {
        e.preventDefault();
        const selectedObjs = allObjects.filter((o) => selectedArr.includes(o.id));
        // Don't frame connectors or other frames
        const frameable = selectedObjs.filter((o) => o.type !== 'frame' && o.type !== 'connector');
        if (frameable.length === 0) return;

        // Calculate bounding box of all frameable objects
        const PADDING = 20;
        const TITLE_HEIGHT = 32;
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        for (const obj of frameable) {
          const bounds = getObjectBounds(obj);
          if (bounds.x1 < minX) minX = bounds.x1;

          if (bounds.y1 < minY) minY = bounds.y1;

          if (bounds.x2 > maxX) maxX = bounds.x2;

          if (bounds.y2 > maxY) maxY = bounds.y2;
        }

        const frameX = minX - PADDING;
        const frameY = minY - PADDING - TITLE_HEIGHT;
        const frameW = maxX - minX + PADDING * 2;
        const frameH = maxY - minY + PADDING * 2 + TITLE_HEIGHT;

        // Create the frame
        onObjectCreateRef.current({
          type: 'frame',
          x: frameX,
          y: frameY,
          width: frameW,
          height: frameH,
          text: 'Frame',
          fill: 'rgba(255, 255, 255, 0.01)',
          stroke: 'rgba(148, 163, 184, 0.6)',
          strokeWidth: 1,
        });

        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    clipboard,
    handleDelete,
    handleDuplicate,
    handleCopy,
    handlePaste,
  };
};
