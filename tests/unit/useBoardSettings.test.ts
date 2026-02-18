import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBoardSettings } from '@/hooks/useBoardSettings';

const storageKey = (boardId: string): string => `collabboard-board-${boardId}-settings`;

describe('useBoardSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns defaults when no persisted settings exist', () => {
    const { result } = renderHook(() => useBoardSettings('board-default'));

    expect(result.current.viewport).toEqual({
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
    });
    expect(result.current.showGrid).toBe(false);
    expect(result.current.snapToGrid).toBe(false);
    expect(result.current.sidebarTab).toBe('boards');
    expect(result.current.boardListFilter).toBe('all');
  });

  it('persists non-viewport settings immediately', () => {
    const { result } = renderHook(() => useBoardSettings('board-settings'));

    act(() => {
      result.current.setShowGrid(true);
      result.current.setSnapToGrid(true);
      result.current.setSidebarTab('ai');
      result.current.setBoardListFilter('favorites');
    });

    const persisted = window.localStorage.getItem(storageKey('board-settings'));
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted ?? '{}') as Record<string, unknown>;

    expect(parsed.showGrid).toBe(true);
    expect(parsed.snapToGrid).toBe(true);
    expect(parsed.sidebarTab).toBe('ai');
    expect(parsed.boardListFilter).toBe('favorites');
  });

  it('debounces viewport persistence writes', () => {
    const { result } = renderHook(() => useBoardSettings('board-viewport'));
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem');

    act(() => {
      result.current.setViewport({ position: { x: 10, y: 20 }, scale: { x: 1.1, y: 1.1 } });
      result.current.setViewport({ position: { x: 30, y: 40 }, scale: { x: 1.2, y: 1.2 } });
      result.current.setViewport({ position: { x: 50, y: 60 }, scale: { x: 1.3, y: 1.3 } });
    });

    expect(setItemSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(setItemSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(setItemSpy).toHaveBeenCalled();

    const persisted = JSON.parse(
      window.localStorage.getItem(storageKey('board-viewport')) ?? '{}'
    ) as Record<string, unknown>;
    expect(persisted.viewport).toEqual({
      position: { x: 50, y: 60 },
      scale: { x: 1.3, y: 1.3 },
    });
  });

  it('falls back to defaults for malformed or invalid persisted settings', () => {
    window.localStorage.setItem(storageKey('board-invalid-json'), '{not-json');
    window.localStorage.setItem(
      storageKey('board-invalid-values'),
      JSON.stringify({
        sidebarTab: 'invalid-tab',
        boardListFilter: 'invalid-filter',
      })
    );

    const { result: invalidJsonResult } = renderHook(() => useBoardSettings('board-invalid-json'));
    expect(invalidJsonResult.current.sidebarTab).toBe('boards');
    expect(invalidJsonResult.current.boardListFilter).toBe('all');

    const { result: invalidValuesResult } = renderHook(() =>
      useBoardSettings('board-invalid-values')
    );
    expect(invalidValuesResult.current.sidebarTab).toBe('boards');
    expect(invalidValuesResult.current.boardListFilter).toBe('all');
  });

  it('reloads persisted settings when board id changes', () => {
    window.localStorage.setItem(
      storageKey('board-a'),
      JSON.stringify({
        viewport: {
          position: { x: 11, y: 22 },
          scale: { x: 1.25, y: 1.25 },
        },
        showGrid: true,
        snapToGrid: true,
        sidebarTab: 'properties',
        boardListFilter: 'recent',
      })
    );

    window.localStorage.setItem(
      storageKey('board-b'),
      JSON.stringify({
        viewport: {
          position: { x: -5, y: -10 },
          scale: { x: 0.8, y: 0.8 },
        },
        showGrid: false,
        snapToGrid: false,
        sidebarTab: 'ai',
        boardListFilter: 'favorites',
      })
    );

    const { result, rerender } = renderHook(({ boardId }) => useBoardSettings(boardId), {
      initialProps: { boardId: 'board-a' },
    });

    expect(result.current.sidebarTab).toBe('properties');
    expect(result.current.boardListFilter).toBe('recent');

    rerender({ boardId: 'board-b' });

    expect(result.current.sidebarTab).toBe('ai');
    expect(result.current.boardListFilter).toBe('favorites');
    expect(result.current.viewport).toEqual({
      position: { x: -5, y: -10 },
      scale: { x: 0.8, y: 0.8 },
    });
  });
});
