import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { useCanvasOperations } from '@/hooks/useCanvasOperations';
import type { IBoardObject } from '@/types';

/**
 * Tests for frame grouping behavior in canvas operations:
 * - Delete frame → unparent children
 * - Duplicate strips parentFrameId
 * - Copy/paste strips parentFrameId
 */

const ts = Timestamp.now();

const makeObj = (overrides: Partial<IBoardObject>): IBoardObject => ({
  id: 'obj-1',
  type: 'sticky',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  fill: '#fef08a',
  createdBy: 'user-1',
  createdAt: ts,
  updatedAt: ts,
  ...overrides,
});

describe('frame grouping — useCanvasOperations', () => {
  let onObjectCreate: (params: Partial<IBoardObject>) => void;
  let onObjectUpdate: (objectId: string, updates: Partial<IBoardObject>) => void;
  let onObjectsUpdate: (updates: Array<{ objectId: string; updates: Partial<IBoardObject> }>) => void;
  let onObjectDelete: (objectId: string) => void;
  let onObjectsDeleteBatch: (objectIds: string[]) => void | Promise<void>;
  let clearSelection: () => void;

  beforeEach(() => {
    onObjectCreate = vi.fn<(params: Partial<IBoardObject>) => void>();
    onObjectUpdate = vi.fn<(objectId: string, updates: Partial<IBoardObject>) => void>();
    onObjectsUpdate = vi.fn<(updates: Array<{ objectId: string; updates: Partial<IBoardObject> }>) => void>();
    onObjectDelete = vi.fn<(objectId: string) => void>();
    onObjectsDeleteBatch = vi.fn<(objectIds: string[]) => void>().mockResolvedValue(undefined) as unknown as (objectIds: string[]) => void | Promise<void>;
    clearSelection = vi.fn<() => void>();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Delete frame unparents children ──────────────────────────────

  describe('delete frame unparents children', () => {
    it('unparents children when frame is deleted', async () => {
      const frame = makeObj({ id: 'frame-1', type: 'frame', width: 300, height: 300 });
      const child1 = makeObj({ id: 'child-1', parentFrameId: 'frame-1', x: 50, y: 50 });
      const child2 = makeObj({ id: 'child-2', parentFrameId: 'frame-1', x: 100, y: 100 });
      const unrelated = makeObj({ id: 'other', x: 500, y: 500 });

      const { result } = renderHook(() =>
        useCanvasOperations({
          objects: [frame, child1, child2, unrelated],
          selectedIds: ['frame-1'],
          onObjectCreate,
          onObjectUpdate,
          onObjectsUpdate,
          onObjectDelete,
          onObjectsDeleteBatch,
          clearSelection,
        })
      );

      await act(async () => {
        await result.current.handleDelete();
      });

      // Should batch-update children to clear parentFrameId
      expect(onObjectsUpdate).toHaveBeenCalledWith([
        { objectId: 'child-1', updates: { parentFrameId: '' } },
        { objectId: 'child-2', updates: { parentFrameId: '' } },
      ]);

      // Should delete just the frame
      expect(onObjectDelete).toHaveBeenCalledWith('frame-1');
    });

    it('does not unparent children that are also being deleted', async () => {
      const frame = makeObj({ id: 'frame-1', type: 'frame', width: 300, height: 300 });
      const child1 = makeObj({ id: 'child-1', parentFrameId: 'frame-1', x: 50, y: 50 });
      const child2 = makeObj({ id: 'child-2', parentFrameId: 'frame-1', x: 100, y: 100 });

      const { result } = renderHook(() =>
        useCanvasOperations({
          objects: [frame, child1, child2],
          selectedIds: ['frame-1', 'child-1'], // child-1 is also being deleted
          onObjectCreate,
          onObjectUpdate,
          onObjectsUpdate,
          onObjectDelete,
          onObjectsDeleteBatch,
          clearSelection,
        })
      );

      await act(async () => {
        await result.current.handleDelete();
      });

      // Only child-2 should be unparented (child-1 is in the delete set)
      expect(onObjectsUpdate).toHaveBeenCalledWith([
        { objectId: 'child-2', updates: { parentFrameId: '' } },
      ]);
    });

    it('deleting a frame with no children does not call onObjectsUpdate', async () => {
      const frame = makeObj({ id: 'frame-1', type: 'frame', width: 300, height: 300 });

      const { result } = renderHook(() =>
        useCanvasOperations({
          objects: [frame],
          selectedIds: ['frame-1'],
          onObjectCreate,
          onObjectUpdate,
          onObjectsUpdate,
          onObjectDelete,
          clearSelection,
        })
      );

      await act(async () => {
        await result.current.handleDelete();
      });

      // No unparenting needed
      expect(onObjectsUpdate).not.toHaveBeenCalled();
      // Frame still gets deleted
      expect(onObjectDelete).toHaveBeenCalledWith('frame-1');
    });

    it('falls back to onObjectUpdate when onObjectsUpdate is not available', async () => {
      const frame = makeObj({ id: 'frame-1', type: 'frame', width: 300, height: 300 });
      const child = makeObj({ id: 'child-1', parentFrameId: 'frame-1', x: 50, y: 50 });

      const { result } = renderHook(() =>
        useCanvasOperations({
          objects: [frame, child],
          selectedIds: ['frame-1'],
          onObjectCreate,
          onObjectUpdate,
          // no onObjectsUpdate
          onObjectDelete,
          clearSelection,
        })
      );

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(onObjectUpdate).toHaveBeenCalledWith('child-1', { parentFrameId: '' });
    });
  });

  // ── Duplicate strips parentFrameId ────────────────────────────────

  describe('duplicate strips parentFrameId', () => {
    it('duplicated objects do not carry parentFrameId', () => {
      const child = makeObj({ id: 'child-1', parentFrameId: 'frame-1', x: 50, y: 50 });

      const { result } = renderHook(() =>
        useCanvasOperations({
          objects: [child],
          selectedIds: ['child-1'],
          onObjectCreate,
          onObjectDelete,
          clearSelection,
        })
      );

      act(() => {
        result.current.handleDuplicate();
      });

      expect(onObjectCreate).toHaveBeenCalledTimes(1);
      const createArgs = (onObjectCreate as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(createArgs.parentFrameId).toBeUndefined();
      expect(createArgs.x).toBe(70); // 50 + 20 offset
      expect(createArgs.y).toBe(70);
    });
  });

  // ── Paste strips parentFrameId ────────────────────────────────────

  describe('paste strips parentFrameId', () => {
    it('pasted objects do not carry parentFrameId', () => {
      const child = makeObj({ id: 'child-1', parentFrameId: 'frame-1', x: 50, y: 50 });

      const { result } = renderHook(() =>
        useCanvasOperations({
          objects: [child],
          selectedIds: ['child-1'],
          onObjectCreate,
          onObjectDelete,
          clearSelection,
        })
      );

      act(() => {
        result.current.handleCopy();
      });
      act(() => {
        result.current.handlePaste();
      });

      expect(onObjectCreate).toHaveBeenCalledTimes(1);
      const createArgs = (onObjectCreate as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(createArgs.parentFrameId).toBeUndefined();
      expect(createArgs.x).toBe(80); // 50 + 30 paste offset
    });
  });
});
