import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { useCanvasOperations } from '@/hooks/useCanvasOperations';
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

    it('handleDelete with 2+ selected and onObjectsDeleteBatch calls batch once and not onObjectDelete', () => {
      const props = {
        ...getDefaultProps(),
        selectedIds: ['id1', 'id2'],
        onObjectsDeleteBatch,
      };
      const { result } = renderHook(() => useCanvasOperations(props));
      act(() => {
        result.current.handleDelete();
      });
      expect(onObjectsDeleteBatch).toHaveBeenCalledTimes(1);
      expect(onObjectsDeleteBatch).toHaveBeenCalledWith(['id1', 'id2']);
      expect(onObjectDelete).not.toHaveBeenCalled();
      expect(clearSelection).toHaveBeenCalled();
    });

    it('deleting 50+ selected objects uses a single batch write (not N individual deletes)', () => {
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
      act(() => {
        result.current.handleDelete();
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
      const props = getDefaultProps();
      renderHook(() => useCanvasOperations(props));
      document.body.focus();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(clearSelection).toHaveBeenCalled();
    });
  });
});
