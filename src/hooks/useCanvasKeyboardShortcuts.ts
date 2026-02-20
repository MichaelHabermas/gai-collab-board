import { useEffect, type RefObject } from 'react';
import type { ToolMode } from '@/types';

interface IUseCanvasKeyboardShortcutsParams {
  setActiveTool: (tool: ToolMode) => void;
  canEdit: boolean;
  activeToolRef: RefObject<ToolMode>;
  onUndo?: () => void;
  onRedo?: () => void;
}

/**
 * Subscribes to window keydown for tool shortcuts (V, Space, S, R, C, L, T, F, A).
 * Skips when focus is in input/textarea. Defers Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+D
 * to useCanvasOperations (copy, paste, duplicate). Syncs activeToolRef when tool changes.
 */
export const useCanvasKeyboardShortcuts = ({
  setActiveTool,
  canEdit,
  activeToolRef,
  onUndo,
  onRedo,
}: IUseCanvasKeyboardShortcutsParams): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Undo: Ctrl/Cmd+Z (without Shift)
      if (isCtrlOrCmd && key === 'z' && !e.shiftKey && onUndo) {
        e.preventDefault();
        onUndo();
        return;
      }

      // Redo: Ctrl/Cmd+Shift+Z
      if (isCtrlOrCmd && key === 'z' && e.shiftKey && onRedo) {
        e.preventDefault();
        onRedo();
        return;
      }

      if (isCtrlOrCmd && (key === 'c' || key === 'v' || key === 'd')) {
        return;
      }

      let next: ToolMode | null = null;

      if (key === 'v') {
        next = 'select';
      } else if (e.key === ' ') {
        next = 'pan';
        e.preventDefault();
      } else if (key === 's') {
        next = 'sticky';
      } else if (key === 'r') {
        next = 'rectangle';
      } else if (key === 'c') {
        next = 'circle';
      } else if (key === 'l') {
        next = 'line';
      } else if (key === 't') {
        next = 'text';
      } else if (key === 'f') {
        next = 'frame';
      } else if (key === 'a') {
        next = 'connector';
      }

      if (!next) {
        return;
      }

      const requiresEdit = next !== 'select' && next !== 'pan';
      if (requiresEdit && !canEdit) {
        return;
      }

      setActiveTool(next);
      activeToolRef.current = next;
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeToolRef is stable; omit to avoid unnecessary effect re-runs
  }, [setActiveTool, canEdit, onUndo, onRedo]);
};
