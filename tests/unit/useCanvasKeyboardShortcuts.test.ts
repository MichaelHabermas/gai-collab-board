import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasKeyboardShortcuts } from '@/hooks/useCanvasKeyboardShortcuts';
import type { ToolMode } from '@/types';

describe('useCanvasKeyboardShortcuts', () => {
  let setActiveTool: (tool: ToolMode) => void;
  let activeToolRef: { current: ToolMode };

  beforeEach(() => {
    setActiveTool = vi.fn() as (tool: ToolMode) => void;
    activeToolRef = { current: 'select' };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderShortcuts = (canEdit = true) => {
    renderHook(() =>
      useCanvasKeyboardShortcuts({
        setActiveTool,
        canEdit,
        activeToolRef,
      })
    );
  };

  describe('Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+D do not change tool', () => {
    it('Ctrl+C does not call setActiveTool (copy is handled by useCanvasOperations)', () => {
      renderShortcuts();
      document.body.focus();
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true })
        );
      });
      expect(setActiveTool).not.toHaveBeenCalled();
    });

    it('Ctrl+V does not call setActiveTool (paste is handled by useCanvasOperations)', () => {
      renderShortcuts();
      document.body.focus();
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true })
        );
      });
      expect(setActiveTool).not.toHaveBeenCalled();
    });

    it('Ctrl+D does not call setActiveTool (duplicate is handled by useCanvasOperations)', () => {
      renderShortcuts();
      document.body.focus();
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true })
        );
      });
      expect(setActiveTool).not.toHaveBeenCalled();
    });

    it('Meta+C does not call setActiveTool (Cmd+C on Mac)', () => {
      renderShortcuts();
      document.body.focus();
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'c', metaKey: true, bubbles: true })
        );
      });
      expect(setActiveTool).not.toHaveBeenCalled();
    });
  });

  describe('plain letter keys still switch tool', () => {
    it('C without modifier calls setActiveTool with circle', () => {
      renderShortcuts();
      document.body.focus();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
      });
      expect(setActiveTool).toHaveBeenCalledWith('circle');
    });

    it('V without modifier calls setActiveTool with select', () => {
      renderShortcuts();
      document.body.focus();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
      });
      expect(setActiveTool).toHaveBeenCalledWith('select');
    });
  });
});
