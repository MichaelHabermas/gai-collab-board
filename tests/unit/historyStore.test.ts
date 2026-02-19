import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from '@/stores/historyStore';
import type { IHistoryEntry } from '@/types';

const makeEntry = (objectId: string): IHistoryEntry => [
  { type: 'create', objectId, after: { id: objectId } as any },
];

describe('historyStore', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear();
  });

  it('starts with empty stacks', () => {
    const state = useHistoryStore.getState();
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(0);
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
  });

  it('push adds to undo stack and clears redo', () => {
    const store = useHistoryStore.getState();
    store.push(makeEntry('obj-1'));

    const after = useHistoryStore.getState();
    expect(after.undoStack).toHaveLength(1);
    expect(after.canUndo).toBe(true);
    expect(after.canRedo).toBe(false);
  });

  it('undo moves entry from undo to redo stack', () => {
    const store = useHistoryStore.getState();
    store.push(makeEntry('obj-1'));

    const entry = store.undo();
    expect(entry).not.toBeNull();
    expect(entry?.[0]?.objectId).toBe('obj-1');

    const after = useHistoryStore.getState();
    expect(after.undoStack).toHaveLength(0);
    expect(after.redoStack).toHaveLength(1);
    expect(after.canUndo).toBe(false);
    expect(after.canRedo).toBe(true);
  });

  it('redo moves entry from redo back to undo stack', () => {
    const store = useHistoryStore.getState();
    store.push(makeEntry('obj-1'));
    store.undo();

    const entry = store.redo();
    expect(entry).not.toBeNull();
    expect(entry?.[0]?.objectId).toBe('obj-1');

    const after = useHistoryStore.getState();
    expect(after.undoStack).toHaveLength(1);
    expect(after.redoStack).toHaveLength(0);
    expect(after.canUndo).toBe(true);
    expect(after.canRedo).toBe(false);
  });

  it('push clears redo stack (new action after undo)', () => {
    const store = useHistoryStore.getState();
    store.push(makeEntry('obj-1'));
    store.undo(); // redo has 1
    store.push(makeEntry('obj-2')); // should clear redo

    const after = useHistoryStore.getState();
    expect(after.undoStack).toHaveLength(1);
    expect(after.undoStack[0]?.[0]?.objectId).toBe('obj-2');
    expect(after.redoStack).toHaveLength(0);
    expect(after.canRedo).toBe(false);
  });

  it('undo on empty stack returns null', () => {
    const result = useHistoryStore.getState().undo();
    expect(result).toBeNull();
  });

  it('redo on empty stack returns null', () => {
    const result = useHistoryStore.getState().redo();
    expect(result).toBeNull();
  });

  it('enforces max undo stack size of 50', () => {
    const store = useHistoryStore.getState();
    for (let i = 0; i < 55; i++) {
      store.push(makeEntry(`obj-${i}`));
    }

    const after = useHistoryStore.getState();
    expect(after.undoStack).toHaveLength(50);
    // Oldest entries should be dropped
    expect(after.undoStack[0]?.[0]?.objectId).toBe('obj-5');
    expect(after.undoStack[49]?.[0]?.objectId).toBe('obj-54');
  });

  it('clear resets all state', () => {
    const store = useHistoryStore.getState();
    store.push(makeEntry('obj-1'));
    store.push(makeEntry('obj-2'));
    store.undo();

    store.clear();

    const after = useHistoryStore.getState();
    expect(after.undoStack).toHaveLength(0);
    expect(after.redoStack).toHaveLength(0);
    expect(after.canUndo).toBe(false);
    expect(after.canRedo).toBe(false);
  });
});
