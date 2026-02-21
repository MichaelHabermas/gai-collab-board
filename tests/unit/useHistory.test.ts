import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from '@/hooks/useHistory';
import { useHistoryStore } from '@/stores/historyStore';
import { useObjectsStore } from '@/stores/objectsStore';
import * as historyService from '@/modules/history/historyService';
import type { IBoardObject } from '@/types';

vi.mock('@/modules/history/historyService', () => ({
  executeUndo: vi.fn(),
  executeRedo: vi.fn(),
}));

describe('useHistory', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear();
    useObjectsStore.getState().clear();
    vi.clearAllMocks();
  });

  it('initializes with no history', () => {
    const { result } = renderHook(() =>
      useHistory({
        createObject: vi.fn(),
        updateObject: vi.fn(),
        deleteObject: vi.fn(),
        boardId: 'test-board',
      })
    );

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('records create object', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'obj1' });
    const { result } = renderHook(() =>
      useHistory({
        createObject: mockCreate,
        updateObject: vi.fn(),
        deleteObject: vi.fn(),
        boardId: 'test-board',
      })
    );

    await act(async () => {
      await result.current.createObject({ type: 'sticky', x: 0, y: 0, width: 100, height: 100, text: 'test', fill: 'yellow' });
    });

    expect(mockCreate).toHaveBeenCalled();
    expect(useHistoryStore.getState().canUndo).toBe(true);
  });

  it('records update object', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    useObjectsStore.getState().setAll([{ id: 'obj1', type: 'sticky' } as IBoardObject]);

    const { result } = renderHook(() =>
      useHistory({
        createObject: vi.fn(),
        updateObject: mockUpdate,
        deleteObject: vi.fn(),
        boardId: 'test-board',
      })
    );

    await act(async () => {
      await result.current.updateObject('obj1', { text: 'new text' });
    });

    expect(mockUpdate).toHaveBeenCalledWith('obj1', { text: 'new text' });
    expect(useHistoryStore.getState().canUndo).toBe(true);
  });

  it('records delete object', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined);
    useObjectsStore.getState().setAll([{ id: 'obj1', type: 'sticky' } as IBoardObject]);

    const { result } = renderHook(() =>
      useHistory({
        createObject: vi.fn(),
        updateObject: vi.fn(),
        deleteObject: mockDelete,
        boardId: 'test-board',
      })
    );

    await act(async () => {
      await result.current.deleteObject('obj1');
    });

    expect(mockDelete).toHaveBeenCalledWith('obj1');
    expect(useHistoryStore.getState().canUndo).toBe(true);
  });

  it('executes undo and redo', () => {
    const { result } = renderHook(() =>
      useHistory({
        createObject: vi.fn(),
        updateObject: vi.fn(),
        deleteObject: vi.fn(),
        boardId: 'test-board',
      })
    );

    act(() => {
      useHistoryStore.getState().push([{ type: 'create', objectId: 'obj1', after: { id: 'obj1' } as IBoardObject }]);
    });

    act(() => {
      result.current.undo();
    });

    expect(historyService.executeUndo).toHaveBeenCalled();

    act(() => {
      result.current.redo();
    });

    expect(historyService.executeRedo).toHaveBeenCalled();
  });

  it('undo does nothing when nothing to undo', () => {
    const { result } = renderHook(() =>
      useHistory({
        createObject: vi.fn(),
        updateObject: vi.fn(),
        deleteObject: vi.fn(),
        boardId: 'test-board',
      })
    );

    act(() => {
      result.current.undo();
    });

    expect(historyService.executeUndo).not.toHaveBeenCalled();
  });

  it('redo does nothing when nothing to redo', () => {
    const { result } = renderHook(() =>
      useHistory({
        createObject: vi.fn(),
        updateObject: vi.fn(),
        deleteObject: vi.fn(),
        boardId: 'test-board',
      })
    );

    act(() => {
      result.current.redo();
    });

    expect(historyService.executeRedo).not.toHaveBeenCalled();
  });

  it('does not push history when createObject returns null', async () => {
    const mockCreate = vi.fn().mockResolvedValue(null);
    const { result } = renderHook(() =>
      useHistory({
        createObject: mockCreate,
        updateObject: vi.fn(),
        deleteObject: vi.fn(),
        boardId: 'test-board',
      })
    );

    await act(async () => {
      await result.current.createObject({ type: 'sticky', x: 0, y: 0, width: 100, height: 100, text: '', fill: 'yellow' });
    });

    expect(mockCreate).toHaveBeenCalled();
    expect(useHistoryStore.getState().canUndo).toBe(false);
  });

  it('does not push history when updateObject target is not in store', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    useObjectsStore.getState().setAll([]);

    const { result } = renderHook(() =>
      useHistory({
        createObject: vi.fn(),
        updateObject: mockUpdate,
        deleteObject: vi.fn(),
        boardId: 'test-board',
      })
    );

    await act(async () => {
      await result.current.updateObject('missing-id', { text: 'new' });
    });

    expect(mockUpdate).toHaveBeenCalledWith('missing-id', { text: 'new' });
    expect(useHistoryStore.getState().canUndo).toBe(false);
  });

  it('does not push history when deleteObject target is not in store', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined);
    useObjectsStore.getState().setAll([]);

    const { result } = renderHook(() =>
      useHistory({
        createObject: vi.fn(),
        updateObject: vi.fn(),
        deleteObject: mockDelete,
        boardId: 'test-board',
      })
    );

    await act(async () => {
      await result.current.deleteObject('missing-id');
    });

    expect(mockDelete).toHaveBeenCalledWith('missing-id');
    expect(useHistoryStore.getState().canUndo).toBe(false);
  });

  it('clears history on board change', () => {
    const { rerender } = renderHook(
      ({ boardId }) =>
        useHistory({
          createObject: vi.fn(),
          updateObject: vi.fn(),
          deleteObject: vi.fn(),
          boardId,
        }),
      { initialProps: { boardId: 'board1' } }
    );

    act(() => {
      useHistoryStore.getState().push([{ type: 'create', objectId: 'obj1', after: { id: 'obj1' } as IBoardObject }]);
    });

    expect(useHistoryStore.getState().canUndo).toBe(true);

    rerender({ boardId: 'board2' });

    expect(useHistoryStore.getState().canUndo).toBe(false);
  });
});