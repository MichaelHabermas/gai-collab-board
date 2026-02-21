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

  const renderShortcuts = (options: {
    canEdit?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
  } = {}) => {
    const { canEdit = true, onUndo, onRedo } = options;
    renderHook(() =>
      useCanvasKeyboardShortcuts({
        setActiveTool,
        canEdit,
        activeToolRef,
        onUndo,
        onRedo,
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

    it('Space calls setActiveTool with pan and prevents default (branch 61)', () => {
      renderShortcuts();
      document.body.focus();
      const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      const preventDefault = vi.spyOn(ev, 'preventDefault');
      act(() => {
        window.dispatchEvent(ev);
      });
      expect(setActiveTool).toHaveBeenCalledWith('pan');
      expect(preventDefault).toHaveBeenCalled();
    });

    it('S calls setActiveTool with sticky (branch 57)', () => {
      renderShortcuts();
      document.body.focus();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
      });
      expect(setActiveTool).toHaveBeenCalledWith('sticky');
    });

    it('R calls setActiveTool with rectangle (branch 59)', () => {
      renderShortcuts();
      document.body.focus();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));
      });
      expect(setActiveTool).toHaveBeenCalledWith('rectangle');
    });

    it('L calls setActiveTool with line (branch 64)', () => {
      renderShortcuts();
      document.body.focus();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', bubbles: true }));
      });
      expect(setActiveTool).toHaveBeenCalledWith('line');
    });

    it('T calls setActiveTool with text (branch 66)', () => {
      renderShortcuts();
      document.body.focus();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
      });
      expect(setActiveTool).toHaveBeenCalledWith('text');
    });

    it('F calls setActiveTool with frame (branch 68)', () => {
      renderShortcuts();
      document.body.focus();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
      });
      expect(setActiveTool).toHaveBeenCalledWith('frame');
    });

    it('A calls setActiveTool with connector (branch 70)', () => {
      renderShortcuts();
      document.body.focus();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      });
      expect(setActiveTool).toHaveBeenCalledWith('connector');
    });
  });

  describe('when focus is in input/textarea (branch 44)', () => {
    it('does not call setActiveTool when keydown target is input', () => {
      renderShortcuts();
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      act(() => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
      });
      expect(setActiveTool).not.toHaveBeenCalled();
      document.body.removeChild(input);
    });

    it('does not call setActiveTool when keydown target is textarea', () => {
      renderShortcuts();
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();
      act(() => {
        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
      });
      expect(setActiveTool).not.toHaveBeenCalled();
      document.body.removeChild(textarea);
    });
  });

  describe('when canEdit is false (branch 75)', () => {
    it('does not switch to draw tools', () => {
      renderShortcuts({ canEdit: false });
      document.body.focus();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
      });
      expect(setActiveTool).not.toHaveBeenCalled();
    });

    it('still switches to select and pan', () => {
      renderShortcuts({ canEdit: false });
      document.body.focus();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
      });
      expect(setActiveTool).toHaveBeenCalledWith('select');
      vi.mocked(setActiveTool).mockClear();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      });
      expect(setActiveTool).toHaveBeenCalledWith('pan');
    });
  });

  describe('undo/redo (branches 33-44)', () => {
    it('Ctrl+Z without shift calls onUndo when provided', () => {
      const onUndo = vi.fn();
      renderShortcuts({ onUndo });
      document.body.focus();
      const ev = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: false,
        bubbles: true,
      });
      const preventDefault = vi.spyOn(ev, 'preventDefault');
      act(() => {
        window.dispatchEvent(ev);
      });
      expect(onUndo).toHaveBeenCalled();
      expect(preventDefault).toHaveBeenCalled();
      expect(setActiveTool).not.toHaveBeenCalled();
    });

    it('Ctrl+Shift+Z calls onRedo when provided', () => {
      const onRedo = vi.fn();
      renderShortcuts({ onRedo });
      document.body.focus();
      const ev = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      const preventDefault = vi.spyOn(ev, 'preventDefault');
      act(() => {
        window.dispatchEvent(ev);
      });
      expect(onRedo).toHaveBeenCalled();
      expect(preventDefault).toHaveBeenCalled();
      expect(setActiveTool).not.toHaveBeenCalled();
    });
  });
});
