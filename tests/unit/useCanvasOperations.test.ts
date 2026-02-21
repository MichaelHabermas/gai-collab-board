import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { useCanvasOperations } from '@/hooks/useCanvasOperations';
import { useSelectionStore } from '@/stores/selectionStore';
import { useObjectsStore } from '@/stores/objectsStore';
import type { IBoardObject } from '@/types';

describe('useCanvasOperations', () => {
  const mockObject: IBoardObject = {
    id: 'obj-1',
    type: 'sticky',
    x: 10,
    y: 20,
    width: 100,
    height: 100,
    rotation: 0,
    fill: '#fef08a',
    text: 'Test',
    createdBy: 'test-user',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  let onObjectCreate: (params: Partial<IBoardObject>) => void;
  let onObjectDelete: (objectId: string) => void;
  let onObjectsDeleteBatch: (objectIds: string[]) => void;
  let clearSelection: () => void;

  beforeEach(() => {
    onObjectCreate = vi.fn<(params: Partial<IBoardObject>) => void>();
    onObjectDelete = vi.fn<(objectId: string) => void>();
    onObjectsDeleteBatch = vi.fn<(objectIds: string[]) => void>();
    clearSelection = vi.fn<() => void>();
    // Reset stores to clean state
    useSelectionStore.getState().clearSelection();
    useObjectsStore.getState().clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const getDefaultProps = () => ({
    objects: [mockObject],
    selectedIds: ['obj-1'],
    onObjectCreate,
    onObjectDelete,
    clearSelection,
  });

  describe('keyboard shortcuts when canvas has focus', () => {
    it('handleDelete is wired and removes selected objects', () => {
      const { result } = renderHook(() => useCanvasOperations(getDefaultProps()));
      act(() => {
        result.current.handleDelete();
      });
      expect(onObjectDelete).toHaveBeenCalledWith('obj-1');
      expect(clearSelection).toHaveBeenCalled();
    });

    it('handleDelete with 2+ selected and onObjectsDeleteBatch calls batch once and not onObjectDelete', async () => {
      (onObjectsDeleteBatch as unknown as { mockResolvedValue: (v: undefined) => void })
        .mockResolvedValue(undefined);
      const props = {
        ...getDefaultProps(),
        selectedIds: ['id1', 'id2'],
        onObjectsDeleteBatch,
      };
      const { result } = renderHook(() => useCanvasOperations(props));
      await act(async () => {
        await result.current.handleDelete();
      });
      expect(onObjectsDeleteBatch).toHaveBeenCalledTimes(1);
      expect(onObjectsDeleteBatch).toHaveBeenCalledWith(['id1', 'id2']);
      expect(onObjectDelete).not.toHaveBeenCalled();
      expect(clearSelection).toHaveBeenCalled();
    });

    it('deleting 50+ selected objects uses a single batch write (not N individual deletes)', async () => {
      (onObjectsDeleteBatch as unknown as { mockResolvedValue: (v: undefined) => void })
        .mockResolvedValue(undefined);
      const ids = Array.from({ length: 55 }, (_, i) => `obj-${i}`);
      const objects: IBoardObject[] = ids.map((id) => ({
        ...mockObject,
        id,
      }));
      const props = {
        objects,
        selectedIds: ids,
        onObjectCreate,
        onObjectDelete,
        onObjectsDeleteBatch,
        clearSelection,
      };
      const { result } = renderHook(() => useCanvasOperations(props));
      await act(async () => {
        await result.current.handleDelete();
      });
      // Single batch write, not 55 individual calls
      expect(onObjectsDeleteBatch).toHaveBeenCalledTimes(1);
      expect(onObjectsDeleteBatch).toHaveBeenCalledWith(ids);
      expect(onObjectDelete).not.toHaveBeenCalled();
      expect(clearSelection).toHaveBeenCalled();
    });

    it('handleDelete with 2+ selected and no onObjectsDeleteBatch falls back to per-id onObjectDelete', () => {
      const props = {
        ...getDefaultProps(),
        selectedIds: ['id1', 'id2'],
        onObjectsDeleteBatch: undefined,
      };
      const { result } = renderHook(() => useCanvasOperations(props));
      act(() => {
        result.current.handleDelete();
      });
      expect(onObjectDelete).toHaveBeenCalledTimes(2);
      expect(onObjectDelete).toHaveBeenCalledWith('id1');
      expect(onObjectDelete).toHaveBeenCalledWith('id2');
      expect(clearSelection).toHaveBeenCalled();
    });

    it('Ctrl+C triggers copy when selection exists', () => {
      const { result } = renderHook(() => useCanvasOperations(getDefaultProps()));
      act(() => {
        result.current.handleCopy();
      });
      expect(result.current.clipboard).toHaveLength(1);
      expect(result.current.clipboard[0]?.id).toBe('obj-1');
    });

    it('Ctrl+V triggers paste when clipboard has content', () => {
      const props = getDefaultProps();
      const { result } = renderHook(() => useCanvasOperations(props));
      act(() => {
        result.current.handleCopy();
      });
      act(() => {
        result.current.handlePaste();
      });
      expect(onObjectCreate).toHaveBeenCalled();
    });

    it('handleDuplicate is wired and creates copies with offset', () => {
      const { result } = renderHook(() => useCanvasOperations(getDefaultProps()));
      act(() => {
        result.current.handleDuplicate();
      });
      expect(onObjectCreate).toHaveBeenCalled();
    });

  });

  describe('keyboard shortcuts when focus is in input', () => {
    it('shortcuts are ignored when focus is in an input element', () => {
      const props = getDefaultProps();
      renderHook(() => useCanvasOperations(props));

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      act(() => {
        const ev = new KeyboardEvent('keydown', {
          key: 'Delete',
          bubbles: true,
        });
        input.dispatchEvent(ev);
      });
      expect(onObjectDelete).not.toHaveBeenCalled();

      act(() => {
        const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        input.dispatchEvent(ev);
      });
      expect(clearSelection).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('shortcuts are ignored when focus is in a textarea element', () => {
      const props = getDefaultProps();
      renderHook(() => useCanvasOperations(props));

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      act(() => {
        const ev = new KeyboardEvent('keydown', {
          key: 'Delete',
          bubbles: true,
        });
        textarea.dispatchEvent(ev);
      });
      expect(onObjectDelete).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });
  });

  describe('handler functions', () => {
    it('handleCopy stores selected objects in clipboard', () => {
      const { result } = renderHook(() => useCanvasOperations(getDefaultProps()));
      act(() => {
        result.current.handleCopy();
      });
      expect(result.current.clipboard).toHaveLength(1);
      expect(result.current.clipboard[0]?.id).toBe('obj-1');
    });

    it('handlePaste with empty clipboard does not throw', () => {
      const { result } = renderHook(() =>
        useCanvasOperations({ ...getDefaultProps(), selectedIds: [] })
      );
      act(() => {
        result.current.handlePaste();
      });
      expect(onObjectCreate).not.toHaveBeenCalled();
    });
  });

  describe('keydown listener integration', () => {
    it('window keydown Escape calls clearSelection when document activeElement is body', () => {
      // Populate stores so the keyboard handler reads live data
      useSelectionStore.getState().setSelectedIds(['obj-1']);
      useObjectsStore.getState().setAll([mockObject]);

      const props = getDefaultProps();
      renderHook(() => useCanvasOperations(props));
      document.body.focus();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      // Keyboard handler reads clearSelection from the store, not the mock prop
      expect(useSelectionStore.getState().selectedIds.size).toBe(0);
    });

    it('window keydown Ctrl+C copies selection to clipboard', () => {
      // Populate stores so the keyboard handler reads live data
      useSelectionStore.getState().setSelectedIds(['obj-1']);
      useObjectsStore.getState().setAll([mockObject]);

      const props = getDefaultProps();
      const { result } = renderHook(() => useCanvasOperations(props));
      document.body.focus();
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true })
        );
      });
      expect(result.current.clipboard).toHaveLength(1);
      expect(result.current.clipboard[0]?.id).toBe('obj-1');
    });

    it('window keydown Ctrl+V pastes from clipboard and calls onObjectCreate', () => {
      useSelectionStore.getState().setSelectedIds(['obj-1']);
      useObjectsStore.getState().setAll([mockObject]);

      const props = getDefaultProps();
      const { result } = renderHook(() => useCanvasOperations(props));
      act(() => {
        result.current.handleCopy();
      });
      document.body.focus();
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true })
        );
      });
      expect(onObjectCreate).toHaveBeenCalled();
    });

    it('window keydown Ctrl+C with no selection does not change clipboard', () => {
      // Store has empty selection — keyboard handler should skip
      const props = { ...getDefaultProps(), selectedIds: [] as string[] };
      const { result } = renderHook(() => useCanvasOperations(props));
      document.body.focus();
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true })
        );
      });
      expect(result.current.clipboard).toHaveLength(0);
    });
  });

  // --- Delete frame with children ---

  describe('handleDelete — frame with children', () => {
    const makeFrame = (): IBoardObject => ({
      ...mockObject,
      id: 'frame-1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 500,
      height: 500,
    });

    const makeChild = (id: string, parentFrameId: string): IBoardObject => ({
      ...mockObject,
      id,
      parentFrameId,
      x: 50,
      y: 50,
      width: 80,
      height: 80,
    });

    it('unparents children via batch update when deleting frame with onObjectsUpdate', async () => {
      const frame = makeFrame();
      const child1 = makeChild('child-1', 'frame-1');
      const child2 = makeChild('child-2', 'frame-1');
      const onObjectsUpdate = vi.fn();

      const props = {
        objects: [frame, child1, child2],
        selectedIds: ['frame-1'],
        onObjectCreate,
        onObjectDelete,
        onObjectsUpdate,
        clearSelection,
      };
      const { result } = renderHook(() => useCanvasOperations(props));

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(onObjectsUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ objectId: 'child-1', updates: { parentFrameId: '' } }),
          expect.objectContaining({ objectId: 'child-2', updates: { parentFrameId: '' } }),
        ])
      );
      expect(onObjectDelete).toHaveBeenCalledWith('frame-1');
    });

    it('unparents children via single update fallback when no onObjectsUpdate', async () => {
      const frame = makeFrame();
      const child1 = makeChild('child-1', 'frame-1');
      const onObjectUpdate = vi.fn();

      const props = {
        objects: [frame, child1],
        selectedIds: ['frame-1'],
        onObjectCreate,
        onObjectUpdate,
        onObjectDelete,
        clearSelection,
      };
      const { result } = renderHook(() => useCanvasOperations(props));

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(onObjectUpdate).toHaveBeenCalledWith('child-1', { parentFrameId: '' });
    });

    it('skips unparenting for children that are also in the deletion set', async () => {
      const frame = makeFrame();
      const child1 = makeChild('child-1', 'frame-1');
      const onObjectsUpdate = vi.fn();
      (onObjectsDeleteBatch as unknown as { mockResolvedValue: (v: undefined) => void })
        .mockResolvedValue(undefined);

      const props = {
        objects: [frame, child1],
        selectedIds: ['frame-1', 'child-1'],
        onObjectCreate,
        onObjectDelete,
        onObjectsDeleteBatch,
        onObjectsUpdate,
        clearSelection,
      };
      const { result } = renderHook(() => useCanvasOperations(props));

      await act(async () => {
        await result.current.handleDelete();
      });

      // onObjectsUpdate should NOT be called for unparenting since child is being deleted too
      expect(onObjectsUpdate).not.toHaveBeenCalled();
    });

    it('handleDelete with empty selection does nothing', async () => {
      const props = {
        ...getDefaultProps(),
        selectedIds: [] as string[],
      };
      const { result } = renderHook(() => useCanvasOperations(props));

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(onObjectDelete).not.toHaveBeenCalled();
      expect(clearSelection).not.toHaveBeenCalled();
    });
  });

  // --- Duplicate with frame children ---

  describe('handleDuplicate — frame-aware', () => {
    it('duplicates a frame and its children with new parentFrameId', async () => {
      const frame: IBoardObject = {
        ...mockObject,
        id: 'frame-1',
        type: 'frame',
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      };
      const child: IBoardObject = {
        ...mockObject,
        id: 'child-1',
        parentFrameId: 'frame-1',
        x: 50,
        y: 50,
      };

      const newFrame: IBoardObject = {
        ...frame,
        id: 'new-frame-1',
      };
      const onObjectCreateMock = vi.fn()
        .mockResolvedValueOnce(newFrame)  // first call creates the frame
        .mockResolvedValueOnce(null);     // second call creates the child

      const props = {
        objects: [frame, child],
        selectedIds: ['frame-1'],
        onObjectCreate: onObjectCreateMock,
        onObjectDelete,
        clearSelection,
      };
      const { result } = renderHook(() => useCanvasOperations(props));

      await act(async () => {
        await result.current.handleDuplicate();
      });

      expect(onObjectCreateMock).toHaveBeenCalledTimes(2);
      // Second call should include the new parentFrameId
      expect(onObjectCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ parentFrameId: 'new-frame-1' })
      );
    });

    it('skips frame children that are independently selected when duplicating', async () => {
      const frame: IBoardObject = {
        ...mockObject,
        id: 'frame-1',
        type: 'frame',
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      };
      const child: IBoardObject = {
        ...mockObject,
        id: 'child-1',
        parentFrameId: 'frame-1',
        x: 50,
        y: 50,
      };

      const newFrame: IBoardObject = { ...frame, id: 'new-frame-1' };
      const onObjectCreateMock = vi.fn()
        .mockResolvedValueOnce(null)   // child-1 duplicate (independently selected non-frame)
        .mockResolvedValueOnce(newFrame); // frame-1 duplicate

      const props = {
        objects: [frame, child],
        selectedIds: ['frame-1', 'child-1'],
        onObjectCreate: onObjectCreateMock,
        onObjectDelete,
        clearSelection,
      };
      const { result } = renderHook(() => useCanvasOperations(props));

      await act(async () => {
        await result.current.handleDuplicate();
      });

      // child-1 is selected independently, so when duplicating frame children
      // it should be skipped (already duplicated as a non-frame)
      expect(onObjectCreateMock).toHaveBeenCalledTimes(2);
    });

    it('handles frame duplicate when onObjectCreate returns null', async () => {
      const frame: IBoardObject = {
        ...mockObject,
        id: 'frame-1',
        type: 'frame',
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      };
      const child: IBoardObject = {
        ...mockObject,
        id: 'child-1',
        parentFrameId: 'frame-1',
        x: 50,
        y: 50,
      };

      const onObjectCreateMock = vi.fn().mockResolvedValueOnce(null);

      const props = {
        objects: [frame, child],
        selectedIds: ['frame-1'],
        onObjectCreate: onObjectCreateMock,
        onObjectDelete,
        clearSelection,
      };
      const { result } = renderHook(() => useCanvasOperations(props));

      await act(async () => {
        await result.current.handleDuplicate();
      });

      // Only the frame duplicate call, no child duplicate since newFrameId is null
      expect(onObjectCreateMock).toHaveBeenCalledTimes(1);
    });
  });

  // --- Copy with frame children ---

  describe('handleCopy — frame-aware', () => {
    it('includes frame children in clipboard even when not selected', () => {
      const frame: IBoardObject = {
        ...mockObject,
        id: 'frame-1',
        type: 'frame',
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      };
      const child: IBoardObject = {
        ...mockObject,
        id: 'child-1',
        parentFrameId: 'frame-1',
        x: 50,
        y: 50,
      };

      const props = {
        objects: [frame, child],
        selectedIds: ['frame-1'],
        onObjectCreate,
        onObjectDelete,
        clearSelection,
      };
      const { result } = renderHook(() => useCanvasOperations(props));

      act(() => {
        result.current.handleCopy();
      });

      expect(result.current.clipboard).toHaveLength(2);
      const ids = result.current.clipboard.map((o) => o.id);
      expect(ids).toContain('frame-1');
      expect(ids).toContain('child-1');
    });

    it('does not double-add children that are independently selected', () => {
      const frame: IBoardObject = {
        ...mockObject,
        id: 'frame-1',
        type: 'frame',
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      };
      const child: IBoardObject = {
        ...mockObject,
        id: 'child-1',
        parentFrameId: 'frame-1',
        x: 50,
        y: 50,
      };

      const props = {
        objects: [frame, child],
        selectedIds: ['frame-1', 'child-1'],
        onObjectCreate,
        onObjectDelete,
        clearSelection,
      };
      const { result } = renderHook(() => useCanvasOperations(props));

      act(() => {
        result.current.handleCopy();
      });

      // child-1 is both selected and a frame child — should appear only once
      expect(result.current.clipboard).toHaveLength(2);
    });
  });

  // --- Paste with frame children ---

  describe('handlePaste — frame-aware', () => {
    it('pastes frame with children using correct offset', async () => {
      const frame: IBoardObject = {
        ...mockObject,
        id: 'frame-1',
        type: 'frame',
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      };
      const child: IBoardObject = {
        ...mockObject,
        id: 'child-1',
        parentFrameId: 'frame-1',
        x: 50,
        y: 50,
      };

      const newFrame: IBoardObject = { ...frame, id: 'new-frame-1' };
      const onObjectCreateMock = vi.fn()
        .mockResolvedValueOnce(newFrame)
        .mockResolvedValueOnce(null);

      const props = {
        objects: [frame, child],
        selectedIds: ['frame-1'],
        onObjectCreate: onObjectCreateMock,
        onObjectDelete,
        clearSelection,
      };
      const { result } = renderHook(() => useCanvasOperations(props));

      // Copy first
      act(() => {
        result.current.handleCopy();
      });

      // Paste
      await act(async () => {
        await result.current.handlePaste();
      });

      // Frame was pasted with offset
      expect(onObjectCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ x: 30, y: 30, type: 'frame' })
      );
      // Child was pasted with new parentFrameId
      expect(onObjectCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ parentFrameId: 'new-frame-1' })
      );
    });

    it('pastes with custom offset', async () => {
      const props = getDefaultProps();
      const { result } = renderHook(() => useCanvasOperations(props));

      act(() => {
        result.current.handleCopy();
      });

      await act(async () => {
        await result.current.handlePaste(50, 60);
      });

      expect(onObjectCreate).toHaveBeenCalledWith(
        expect.objectContaining({ x: 60, y: 80 })
      );
    });

    it('skips frame children in the non-frame paste loop', async () => {
      const frame: IBoardObject = {
        ...mockObject,
        id: 'frame-1',
        type: 'frame',
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      };
      const child: IBoardObject = {
        ...mockObject,
        id: 'child-1',
        parentFrameId: 'frame-1',
        x: 50,
        y: 50,
      };
      const standalone: IBoardObject = {
        ...mockObject,
        id: 'standalone-1',
        x: 300,
        y: 300,
      };

      const newFrame: IBoardObject = { ...frame, id: 'new-frame-1' };
      const onObjectCreateMock = vi.fn()
        .mockResolvedValueOnce(null)       // standalone
        .mockResolvedValueOnce(newFrame)   // frame
        .mockResolvedValueOnce(null);      // child

      const props = {
        objects: [frame, child, standalone],
        selectedIds: ['frame-1', 'standalone-1'],
        onObjectCreate: onObjectCreateMock,
        onObjectDelete,
        clearSelection,
      };
      const { result } = renderHook(() => useCanvasOperations(props));

      act(() => {
        result.current.handleCopy();
      });

      await act(async () => {
        await result.current.handlePaste();
      });

      // standalone + frame + child = 3 creates
      expect(onObjectCreateMock).toHaveBeenCalledTimes(3);
    });

    it('handles paste when frame create returns null (no children pasted)', async () => {
      const frame: IBoardObject = {
        ...mockObject,
        id: 'frame-1',
        type: 'frame',
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      };
      const child: IBoardObject = {
        ...mockObject,
        id: 'child-1',
        parentFrameId: 'frame-1',
        x: 50,
        y: 50,
      };

      const onObjectCreateMock = vi.fn().mockResolvedValueOnce(null);

      const props = {
        objects: [frame, child],
        selectedIds: ['frame-1'],
        onObjectCreate: onObjectCreateMock,
        onObjectDelete,
        clearSelection,
      };
      const { result } = renderHook(() => useCanvasOperations(props));

      act(() => {
        result.current.handleCopy();
      });

      await act(async () => {
        await result.current.handlePaste();
      });

      // Only frame create, no children since frame ID is null
      expect(onObjectCreateMock).toHaveBeenCalledTimes(1);
    });
  });

  // --- Keyboard shortcut: Ctrl+D Duplicate ---

  describe('keydown listener — Ctrl+D duplicate', () => {
    it('window keydown Ctrl+D duplicates selection', () => {
      useSelectionStore.getState().setSelectedIds(['obj-1']);
      useObjectsStore.getState().setAll([mockObject]);

      const props = getDefaultProps();
      renderHook(() => useCanvasOperations(props));
      document.body.focus();

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true })
        );
      });

      expect(onObjectCreate).toHaveBeenCalled();
    });
  });

  // --- Keyboard shortcut: Ctrl+A select all ---

  describe('keydown listener — Ctrl+A select all', () => {
    it('selects all objects when no frame is selected', () => {
      const obj2: IBoardObject = { ...mockObject, id: 'obj-2', x: 200, y: 200 };
      useSelectionStore.getState().setSelectedIds([]);
      useObjectsStore.getState().setAll([mockObject, obj2]);

      const props = {
        ...getDefaultProps(),
        objects: [mockObject, obj2],
        selectedIds: [] as string[],
      };
      renderHook(() => useCanvasOperations(props));
      document.body.focus();

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true })
        );
      });

      const selected = useSelectionStore.getState().selectedIds;
      expect(selected.has('obj-1')).toBe(true);
      expect(selected.has('obj-2')).toBe(true);
    });

    it('selects frame children when single frame selected with Ctrl+A', () => {
      const frame: IBoardObject = {
        ...mockObject,
        id: 'frame-1',
        type: 'frame',
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      };
      const child: IBoardObject = {
        ...mockObject,
        id: 'child-1',
        parentFrameId: 'frame-1',
        x: 50,
        y: 50,
      };

      useSelectionStore.getState().setSelectedIds(['frame-1']);
      useObjectsStore.getState().setAll([frame, child]);

      const props = {
        objects: [frame, child],
        selectedIds: ['frame-1'],
        onObjectCreate,
        onObjectDelete,
        clearSelection,
      };
      renderHook(() => useCanvasOperations(props));
      document.body.focus();

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true })
        );
      });

      const selected = useSelectionStore.getState().selectedIds;
      expect(selected.has('child-1')).toBe(true);
    });
  });

  // --- Keyboard shortcut: Enter on frame ---

  describe('keydown listener — Enter on frame', () => {
    it('selects frame children when pressing Enter on a selected frame', () => {
      const frame: IBoardObject = {
        ...mockObject,
        id: 'frame-1',
        type: 'frame',
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      };
      const child: IBoardObject = {
        ...mockObject,
        id: 'child-1',
        parentFrameId: 'frame-1',
        x: 50,
        y: 50,
      };

      useSelectionStore.getState().setSelectedIds(['frame-1']);
      useObjectsStore.getState().setAll([frame, child]);

      const props = {
        objects: [frame, child],
        selectedIds: ['frame-1'],
        onObjectCreate,
        onObjectDelete,
        clearSelection,
      };
      renderHook(() => useCanvasOperations(props));
      document.body.focus();

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        );
      });

      const selected = useSelectionStore.getState().selectedIds;
      expect(selected.has('child-1')).toBe(true);
    });
  });

  // --- Keyboard shortcut: Escape navigation ---

  describe('keydown listener — Escape navigation', () => {
    it('navigates to parent frame when all selected share a parentFrameId', () => {
      const frame: IBoardObject = {
        ...mockObject,
        id: 'frame-1',
        type: 'frame',
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      };
      const child1: IBoardObject = {
        ...mockObject,
        id: 'child-1',
        parentFrameId: 'frame-1',
        x: 50,
        y: 50,
      };
      const child2: IBoardObject = {
        ...mockObject,
        id: 'child-2',
        parentFrameId: 'frame-1',
        x: 100,
        y: 100,
      };

      useSelectionStore.getState().setSelectedIds(['child-1', 'child-2']);
      useObjectsStore.getState().setAll([frame, child1, child2]);

      const props = {
        objects: [frame, child1, child2],
        selectedIds: ['child-1', 'child-2'],
        onObjectCreate,
        onObjectDelete,
        clearSelection,
      };
      renderHook(() => useCanvasOperations(props));
      document.body.focus();

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
      });

      const selected = useSelectionStore.getState().selectedIds;
      expect(selected.has('frame-1')).toBe(true);
      expect(selected.size).toBe(1);
    });
  });

  // --- Keyboard shortcut: F to frame selection ---

  describe('keydown listener — F to frame selection', () => {
    it('creates a frame around selected frameable objects', () => {
      const obj1: IBoardObject = { ...mockObject, id: 'obj-1', x: 10, y: 20, width: 100, height: 100 };
      const obj2: IBoardObject = { ...mockObject, id: 'obj-2', x: 200, y: 300, width: 80, height: 80 };

      useSelectionStore.getState().setSelectedIds(['obj-1', 'obj-2']);
      useObjectsStore.getState().setAll([obj1, obj2]);

      const props = {
        objects: [obj1, obj2],
        selectedIds: ['obj-1', 'obj-2'],
        onObjectCreate,
        onObjectDelete,
        clearSelection,
      };
      renderHook(() => useCanvasOperations(props));
      document.body.focus();

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'f', bubbles: true })
        );
      });

      expect(onObjectCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'frame' })
      );
    });

    it('does not create frame when only connectors/frames selected', () => {
      const frame: IBoardObject = {
        ...mockObject,
        id: 'frame-1',
        type: 'frame',
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      };
      const connector: IBoardObject = {
        ...mockObject,
        id: 'conn-1',
        type: 'connector',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
      };

      useSelectionStore.getState().setSelectedIds(['frame-1', 'conn-1']);
      useObjectsStore.getState().setAll([frame, connector]);

      const props = {
        objects: [frame, connector],
        selectedIds: ['frame-1', 'conn-1'],
        onObjectCreate,
        onObjectDelete,
        clearSelection,
      };
      renderHook(() => useCanvasOperations(props));
      document.body.focus();

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'f', bubbles: true })
        );
      });

      expect(onObjectCreate).not.toHaveBeenCalled();
    });
  });

  // --- Keyboard: Backspace deletes ---

  describe('keydown listener — Backspace', () => {
    it('window keydown Backspace deletes selected objects', () => {
      useSelectionStore.getState().setSelectedIds(['obj-1']);
      useObjectsStore.getState().setAll([mockObject]);

      const props = getDefaultProps();
      renderHook(() => useCanvasOperations(props));
      document.body.focus();

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true })
        );
      });

      expect(onObjectDelete).toHaveBeenCalledWith('obj-1');
    });
  });

  // --- Ctrl+V with empty clipboard ---

  describe('keydown listener — Ctrl+V with empty clipboard', () => {
    it('does not paste when clipboard is empty', () => {
      useSelectionStore.getState().setSelectedIds(['obj-1']);
      useObjectsStore.getState().setAll([mockObject]);

      const props = getDefaultProps();
      renderHook(() => useCanvasOperations(props));
      document.body.focus();

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true })
        );
      });

      expect(onObjectCreate).not.toHaveBeenCalled();
    });
  });
});
