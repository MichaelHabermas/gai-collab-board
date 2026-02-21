import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useObjectDragHandlers } from '@/hooks/useObjectDragHandlers';
import type { IBoardObject, ITransformEndAttrs } from '@/types';

// --- Mock stores ---
const mockFrameChildrenIndex = new Map<string, Set<string>>();
const mockUpdateObject = vi.fn();

vi.mock('@/stores/objectsStore', () => ({
  useObjectsStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        frameChildrenIndex: mockFrameChildrenIndex,
        updateObject: mockUpdateObject,
      }),
    {
      getState: () => ({
        frameChildrenIndex: mockFrameChildrenIndex,
        updateObject: mockUpdateObject,
      }),
    }
  ),
  spatialIndex: {
    setDragging: vi.fn(),
    clearDragging: vi.fn(),
    query: vi.fn(() => []),
    size: 0,
  },
}));

const mockSetFrameDragOffset = vi.fn();
const mockSetDropTargetFrameId = vi.fn();
const mockSetGroupDragOffset = vi.fn();
const mockClearDragState = vi.fn();

vi.mock('@/stores/dragOffsetStore', () => ({
  useDragOffsetStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      setFrameDragOffset: mockSetFrameDragOffset,
      setDropTargetFrameId: mockSetDropTargetFrameId,
      setGroupDragOffset: mockSetGroupDragOffset,
      clearDragState: mockClearDragState,
    }),
}));

// --- Mock libs ---
vi.mock('@/lib/canvasBounds', () => ({
  getSelectionBoundsFromRecord: vi.fn(() => null),
}));

vi.mock('@/lib/alignmentGuides', () => ({
  computeAlignmentGuidesWithCandidates: vi.fn(() => ({ horizontal: [], vertical: [] })),
  computeSnappedPositionFromGuides: vi.fn((_, pos: { x: number; y: number }) => pos),
}));

vi.mock('@/lib/snapToGrid', () => ({
  applySnapPositionToNode: vi.fn(),
  snapPositionToGrid: vi.fn((x: number, y: number) => ({ x, y })),
  snapResizeRectToGrid: vi.fn(
    (_orig: unknown, next: { x: number; y: number; width: number; height: number }) => next
  ),
}));

vi.mock('@/lib/lineTransform', () => ({
  getWidthHeightFromPoints: vi.fn(() => ({ width: 100, height: 50 })),
}));

vi.mock('@/hooks/useFrameContainment', () => ({
  resolveParentFrameIdFromFrames: vi.fn(() => null),
  findContainingFrame: vi.fn(() => null),
}));

vi.mock('@/hooks/useAlignmentGuideCache', () => ({
  useAlignmentGuideCache: () => ({
    guideCandidateBoundsRef: { current: [] },
    dragBoundFuncCacheRef: { current: new Map() },
  }),
}));

// Do not mock useObjectDragHandlersRefSync — it populates framesRef from objectsRecord;
// tests that depend on frame lookup (drop target, reparenting) need it to run.

vi.mock('@/lib/perfTimer', () => ({
  perfTime: vi.fn((_label: string, _meta: unknown, fn: () => unknown) => fn()),
}));

vi.mock('@/lib/writeQueue', () => ({
  queueObjectUpdate: vi.fn(),
}));

import { queueObjectUpdate } from '@/lib/writeQueue';
import { spatialIndex } from '@/stores/objectsStore';
import { snapPositionToGrid, snapResizeRectToGrid, applySnapPositionToNode } from '@/lib/snapToGrid';
import { getWidthHeightFromPoints } from '@/lib/lineTransform';
import { resolveParentFrameIdFromFrames, findContainingFrame } from '@/hooks/useFrameContainment';
import { getSelectionBoundsFromRecord } from '@/lib/canvasBounds';
import { computeAlignmentGuidesWithCandidates, computeSnappedPositionFromGuides } from '@/lib/alignmentGuides';

// --- Helpers ---

const makeObject = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  type: IBoardObject['type'] = 'rectangle'
): IBoardObject =>
  ({
    id,
    type,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    fill: '#000',
    createdBy: 'u1',
    parentFrameId: '',
  }) as IBoardObject;

const objA = makeObject('a', 0, 0, 100, 100);
const objB = makeObject('b', 200, 200, 50, 50);
const objC = makeObject('c', 400, 400, 80, 80);

function makeConfig(overrides = {}) {
  const objects = [objA, objB, objC];
  const objectsRecord = Object.fromEntries(objects.map((o) => [o.id, o]));

  return {
    objectsRecord,
    selectedIds: new Set<string>(),
    setSelectedIds: vi.fn(),
    toggleSelectedId: vi.fn(),
    snapToGridEnabled: false,
    canEdit: true,
    onObjectUpdate: vi.fn(),
    onObjectsUpdate: vi.fn(),
    visibleShapeIds: objects.map((o) => o.id),
    visibleObjectIdsKey: 'a,b,c',
    ...overrides,
  };
}

describe('useObjectDragHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrameChildrenIndex.clear();
  });

  // --- Selection ---

  describe('handleObjectSelect', () => {
    it('selects a single object', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectSelect('a');
      });

      expect(config.setSelectedIds).toHaveBeenCalledWith(['a']);
    });

    it('toggles selection with shift key', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectSelect('a', {
          evt: { shiftKey: true, ctrlKey: false, metaKey: false } as MouseEvent,
        });
      });

      expect(config.toggleSelectedId).toHaveBeenCalledWith('a');
      expect(config.setSelectedIds).not.toHaveBeenCalled();
    });

    it('toggles selection with ctrl key', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectSelect('b', {
          evt: { shiftKey: false, ctrlKey: true, metaKey: false } as MouseEvent,
        });
      });

      expect(config.toggleSelectedId).toHaveBeenCalledWith('b');
    });

    it('toggles selection with meta key', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectSelect('c', {
          evt: { shiftKey: false, ctrlKey: false, metaKey: true } as MouseEvent,
        });
      });

      expect(config.toggleSelectedId).toHaveBeenCalledWith('c');
    });
  });

  // --- Single Object Drag ---

  describe('handleObjectDragEnd — single', () => {
    it('calls onObjectUpdate with new position', () => {
      const config = makeConfig({ selectedIds: new Set(['a']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('a', 50, 60);
      });

      expect(config.onObjectUpdate).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ x: 50, y: 60 })
      );
    });

    it('applies grid snap when enabled', () => {
      vi.mocked(snapPositionToGrid).mockReturnValue({ x: 40, y: 60 });
      const config = makeConfig({
        selectedIds: new Set(['a']),
        snapToGridEnabled: true,
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('a', 43, 57);
      });

      expect(snapPositionToGrid).toHaveBeenCalled();
      expect(config.onObjectUpdate).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ x: 40, y: 60 })
      );
    });

    it('clears spatial index after drag', () => {
      const config = makeConfig({ selectedIds: new Set(['a']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('a', 50, 60);
      });

      expect(spatialIndex.clearDragging).toHaveBeenCalled();
    });

    it('does nothing when object not found', () => {
      const config = makeConfig({ selectedIds: new Set(['nonexistent']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('nonexistent', 50, 60);
      });

      expect(config.onObjectUpdate).not.toHaveBeenCalled();
    });
  });

  // --- Multi-Object Drag ---

  describe('handleObjectDragEnd — multi-select', () => {
    it('calls onObjectsUpdate with batch when multiple selected', () => {
      const config = makeConfig({ selectedIds: new Set(['a', 'b']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      // Drag objA from (0,0) to (10,10) → dx=10, dy=10
      act(() => {
        result.current.handleObjectDragEnd('a', 10, 10);
      });

      expect(config.onObjectsUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ objectId: 'a', updates: expect.objectContaining({ x: 10, y: 10 }) }),
          expect.objectContaining({
            objectId: 'b',
            updates: expect.objectContaining({ x: 210, y: 210 }),
          }),
        ])
      );
    });

    it('moves frame children with multi-select drag', () => {
      const frame = makeObject('frame1', 100, 100, 300, 300, 'frame');
      const child = makeObject('child1', 150, 150, 50, 50);
      const objects = [frame, child];
      const objectsRecord = Object.fromEntries(objects.map((o) => [o.id, o]));
      mockFrameChildrenIndex.set('frame1', new Set(['child1']));

      const config = makeConfig({
        objectsRecord,
        selectedIds: new Set(['frame1']),
        visibleShapeIds: ['frame1', 'child1'],
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      // Drag frame from (100,100) to (110,110) → dx=10, dy=10
      act(() => {
        result.current.handleObjectDragEnd('frame1', 110, 110);
      });

      // Should include frame AND child in batch
      const batch = config.onObjectsUpdate.mock.calls[0]?.[0];
      expect(batch).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ objectId: 'child1' }),
          expect.objectContaining({ objectId: 'frame1' }),
        ])
      );
    });
  });

  // --- Enter Frame ---

  describe('handleEnterFrame', () => {
    it('selects all children of the frame', () => {
      mockFrameChildrenIndex.set('frame1', new Set(['c1', 'c2', 'c3']));
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleEnterFrame('frame1');
      });

      expect(config.setSelectedIds).toHaveBeenCalledWith(
        expect.arrayContaining(['c1', 'c2', 'c3'])
      );
    });

    it('does nothing when frame has no children', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleEnterFrame('frame-empty');
      });

      expect(config.setSelectedIds).not.toHaveBeenCalled();
    });
  });

  // --- Transform ---

  describe('handleTransformEnd', () => {
    it('calls onObjectUpdate with transform attrs', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const attrs: ITransformEndAttrs = { x: 10, y: 20, width: 200, height: 150, rotation: 45 };
      act(() => {
        result.current.handleTransformEnd('a', attrs);
      });

      expect(config.onObjectUpdate).toHaveBeenCalledWith('a', attrs);
    });

    it('adds width/height from points for line transforms', () => {
      vi.mocked(getWidthHeightFromPoints).mockReturnValue({ width: 180, height: 90 });
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const attrs = { x: 10, y: 20, points: [0, 0, 180, 90], rotation: 0 } as ITransformEndAttrs;
      act(() => {
        result.current.handleTransformEnd('a', attrs);
      });

      expect(config.onObjectUpdate).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ width: 180, height: 90 })
      );
    });
  });

  // --- Text Change ---

  describe('handleTextChange', () => {
    it('delegates to canonical queueObjectUpdate', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleTextChange('a', 'Hello world');
      });

      // handleTextChange delegates to the canonical queueObjectUpdate (Article X)
      expect(queueObjectUpdate).toHaveBeenCalledWith('a', { text: 'Hello world' });
    });
  });

  // --- Handler Maps (Caching) ---

  describe('handler map caching', () => {
    it('getSelectHandler returns same function for same objectId', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const handler1 = result.current.getSelectHandler('a');
      const handler2 = result.current.getSelectHandler('a');

      expect(handler1).toBe(handler2);
    });

    it('getSelectHandler returns different functions for different objectIds', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const handlerA = result.current.getSelectHandler('a');
      const handlerB = result.current.getSelectHandler('b');

      expect(handlerA).not.toBe(handlerB);
    });

    it('getDragEndHandler returns same function for same objectId', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const handler1 = result.current.getDragEndHandler('a');
      const handler2 = result.current.getDragEndHandler('a');

      expect(handler1).toBe(handler2);
    });

    it('getTextChangeHandler returns same function for same objectId', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const handler1 = result.current.getTextChangeHandler('a');
      const handler2 = result.current.getTextChangeHandler('a');

      expect(handler1).toBe(handler2);
    });

    it('cached select handler calls handleObjectSelect with correct objectId', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const handler = result.current.getSelectHandler('b');
      act(() => {
        handler();
      });

      expect(config.setSelectedIds).toHaveBeenCalledWith(['b']);
    });

    it('cached text handler calls handleTextChange with correct args', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const handler = result.current.getTextChangeHandler('a');
      act(() => {
        handler('Updated text');
      });

      expect(queueObjectUpdate).toHaveBeenCalledWith('a', { text: 'Updated text' });
    });
  });

  // --- Selection bounds ---

  describe('selectionBounds', () => {
    it('returns null when fewer than 2 objects selected', () => {
      const config = makeConfig({ selectedIds: new Set(['a']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      expect(result.current.selectionBounds).toBeNull();
    });
  });

  // --- canEdit gate ---

  describe('onDragMoveProp', () => {
    it('returns handleDragMove when canEdit is true', () => {
      const config = makeConfig({ canEdit: true });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      expect(result.current.onDragMoveProp).toBeInstanceOf(Function);
    });

    it('returns undefined when canEdit is false', () => {
      const config = makeConfig({ canEdit: false });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      expect(result.current.onDragMoveProp).toBeUndefined();
    });
  });

  // --- getDragBoundFunc ---

  describe('getDragBoundFunc', () => {
    it('returns a function that returns position', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const boundFunc = result.current.getDragBoundFunc('a', 100, 100);
      const pos = boundFunc({ x: 50, y: 50 });

      expect(pos).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    });

    it('returns cached function for same objectId and dimensions', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const fn1 = result.current.getDragBoundFunc('a', 100, 100);
      const fn2 = result.current.getDragBoundFunc('a', 100, 100);

      expect(fn1).toBe(fn2);
    });

    it('returns new function when dimensions change', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const fn1 = result.current.getDragBoundFunc('a', 100, 100);
      const fn2 = result.current.getDragBoundFunc('a', 200, 150);

      expect(fn1).not.toBe(fn2);
    });

    it('uses grid snap when snapToGridEnabled and returns snapped position', () => {
      vi.mocked(snapPositionToGrid).mockReturnValue({ x: 40, y: 60 });
      const config = makeConfig({ snapToGridEnabled: true });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const boundFunc = result.current.getDragBoundFunc('a', 100, 100);
      const pos = boundFunc({ x: 43, y: 57 });

      expect(snapPositionToGrid).toHaveBeenCalledWith(43, 57, 20);
      expect(pos).toEqual({ x: 40, y: 60 });
    });

    it('uses alignment guides when snapToGrid is disabled and spatial index has entries', () => {
      const mockGuides = {
        horizontal: [50],
        vertical: [100],
      };
      vi.mocked(computeAlignmentGuidesWithCandidates).mockReturnValue(mockGuides as ReturnType<typeof computeAlignmentGuidesWithCandidates>);
      vi.mocked(computeSnappedPositionFromGuides).mockReturnValue({ x: 48, y: 52 });

      // Set spatial index size > 0 so it uses the query path
      Object.defineProperty(spatialIndex, 'size', { value: 5, writable: true });
      vi.mocked(spatialIndex.query).mockReturnValue(new Set(['b']));

      const config = makeConfig({ snapToGridEnabled: false });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const boundFunc = result.current.getDragBoundFunc('a', 100, 100);
      const pos = boundFunc({ x: 50, y: 50 });

      expect(spatialIndex.query).toHaveBeenCalled();
      expect(computeAlignmentGuidesWithCandidates).toHaveBeenCalled();
      expect(computeSnappedPositionFromGuides).toHaveBeenCalled();
      expect(pos).toEqual({ x: 48, y: 52 });

      // Restore
      Object.defineProperty(spatialIndex, 'size', { value: 0, writable: true });
    });

    it('falls back to all candidates when spatial index size is 0', () => {
      vi.mocked(computeSnappedPositionFromGuides).mockReturnValue({ x: 55, y: 65 });
      Object.defineProperty(spatialIndex, 'size', { value: 0, writable: true });

      const config = makeConfig({ snapToGridEnabled: false });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const boundFunc = result.current.getDragBoundFunc('a', 100, 100);
      const pos = boundFunc({ x: 55, y: 65 });

      expect(spatialIndex.query).not.toHaveBeenCalled();
      expect(pos).toEqual({ x: 55, y: 65 });
    });
  });

  // --- Multi-select drag with grid snap ---

  describe('handleObjectDragEnd — multi-select with snap', () => {
    it('applies grid snap to each object in multi-select', () => {
      vi.mocked(snapPositionToGrid).mockImplementation((x: number, y: number) => ({
        x: Math.round(x / 20) * 20,
        y: Math.round(y / 20) * 20,
      }));

      const config = makeConfig({
        selectedIds: new Set(['a', 'b']),
        snapToGridEnabled: true,
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('a', 13, 17);
      });

      expect(snapPositionToGrid).toHaveBeenCalled();
      expect(config.onObjectsUpdate).toHaveBeenCalled();
    });

    it('skips objects not in objectsById during multi-select drag', () => {
      const config = makeConfig({
        selectedIds: new Set(['a', 'nonexistent']),
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('a', 10, 10);
      });

      // Should still call update (only for 'a')
      const batch = config.onObjectsUpdate.mock.calls[0]?.[0];
      const ids = batch?.map((b: { objectId: string }) => b.objectId) ?? [];
      expect(ids).toContain('a');
      expect(ids).not.toContain('nonexistent');
    });

    it('includes frame children that are not in selected set during multi-drag', () => {
      const frame = makeObject('frame1', 100, 100, 300, 300, 'frame');
      const child1 = makeObject('child1', 150, 150, 50, 50);
      const child2 = makeObject('child2', 180, 180, 50, 50);
      const otherObj = makeObject('other', 500, 500, 50, 50);
      const objects = [frame, child1, child2, otherObj];
      mockFrameChildrenIndex.set('frame1', new Set(['child1', 'child2']));

      const config = makeConfig({
        objectsRecord: Object.fromEntries(objects.map((o) => [o.id, o])),
        selectedIds: new Set(['frame1', 'other']),
        visibleShapeIds: objects.map((o) => o.id),
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('frame1', 110, 110);
      });

      const batch = config.onObjectsUpdate.mock.calls[0]?.[0];
      const batchIds = batch?.map((b: { objectId: string }) => b.objectId) ?? [];
      expect(batchIds).toContain('child1');
      expect(batchIds).toContain('child2');
      expect(batchIds).toContain('frame1');
      expect(batchIds).toContain('other');
    });

    it('skips frame children that are already in selection (movedIds)', () => {
      const frame = makeObject('frame1', 100, 100, 300, 300, 'frame');
      const child1 = makeObject('child1', 150, 150, 50, 50);
      const objects = [frame, child1];
      mockFrameChildrenIndex.set('frame1', new Set(['child1']));

      const config = makeConfig({
        objectsRecord: Object.fromEntries(objects.map((o) => [o.id, o])),
        selectedIds: new Set(['frame1', 'child1']),
        visibleShapeIds: objects.map((o) => o.id),
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('frame1', 110, 110);
      });

      // child1 is in selectedIds so it gets moved once as a selected item, not duplicated as a frame child
      const batch = config.onObjectsUpdate.mock.calls[0]?.[0];
      const childEntries = batch?.filter((b: { objectId: string }) => b.objectId === 'child1') ?? [];
      expect(childEntries).toHaveLength(1);
    });
  });

  // --- Single frame drag with children ---

  describe('handleObjectDragEnd — single frame drag', () => {
    it('moves frame children via batch update when single frame dragged', () => {
      const frame = makeObject('f1', 100, 100, 300, 300, 'frame');
      const child = makeObject('c1', 150, 150, 50, 50);
      const objects = [frame, child];
      mockFrameChildrenIndex.set('f1', new Set(['c1']));

      const config = makeConfig({
        objectsRecord: Object.fromEntries(objects.map((o) => [o.id, o])),
        selectedIds: new Set(['f1']),
        visibleShapeIds: objects.map((o) => o.id),
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('f1', 120, 120);
      });

      expect(config.onObjectsUpdate).toHaveBeenCalled();
      const batch = config.onObjectsUpdate.mock.calls[0]?.[0];
      const childEntry = batch?.find((b: { objectId: string }) => b.objectId === 'c1');
      expect(childEntry).toBeDefined();
      // dx=20, dy=20: child goes from (150,150) to (170,170)
      expect(childEntry?.updates).toEqual(expect.objectContaining({ x: 170, y: 170 }));
    });

    it('skips single frame batch when frame has no children', () => {
      const frame = makeObject('f1', 100, 100, 300, 300, 'frame');
      const objects = [frame];

      const config = makeConfig({
        objectsRecord: Object.fromEntries(objects.map((o) => [o.id, o])),
        selectedIds: new Set(['f1']),
        visibleShapeIds: ['f1'],
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('f1', 120, 120);
      });

      // Falls through to single object update (onObjectUpdate) because no children
      expect(config.onObjectUpdate).toHaveBeenCalledWith('f1', expect.objectContaining({ x: 120, y: 120 }));
    });

    it('applies grid snap to frame children during single frame drag', () => {
      vi.mocked(snapPositionToGrid).mockImplementation((x: number, y: number) => ({
        x: Math.round(x / 20) * 20,
        y: Math.round(y / 20) * 20,
      }));

      const frame = makeObject('f1', 100, 100, 300, 300, 'frame');
      const child = makeObject('c1', 150, 150, 50, 50);
      const objects = [frame, child];
      mockFrameChildrenIndex.set('f1', new Set(['c1']));

      const config = makeConfig({
        objectsRecord: Object.fromEntries(objects.map((o) => [o.id, o])),
        selectedIds: new Set(['f1']),
        snapToGridEnabled: true,
        visibleShapeIds: objects.map((o) => o.id),
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('f1', 113, 117);
      });

      expect(snapPositionToGrid).toHaveBeenCalled();
      expect(config.onObjectsUpdate).toHaveBeenCalled();
    });
  });

  // --- Non-frame single drag reparenting ---

  describe('handleObjectDragEnd — non-frame reparenting', () => {
    it('resolves new parent frame when non-frame object dragged', () => {
      vi.mocked(resolveParentFrameIdFromFrames).mockReturnValue('frame-target');
      const rect = makeObject('r1', 50, 50, 100, 100, 'rectangle');
      const frame = makeObject('frame-target', 0, 0, 500, 500, 'frame');
      const objects = [rect, frame];

      const config = makeConfig({
        objectsRecord: Object.fromEntries(objects.map((o) => [o.id, o])),
        selectedIds: new Set(['r1']),
        visibleShapeIds: objects.map((o) => o.id),
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('r1', 60, 70);
      });

      expect(resolveParentFrameIdFromFrames).toHaveBeenCalled();
      expect(config.onObjectUpdate).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ parentFrameId: 'frame-target' })
      );
    });

    it('auto-expands frame when child falls outside bounds', () => {
      vi.mocked(resolveParentFrameIdFromFrames).mockReturnValue('f1');
      const frame = makeObject('f1', 0, 0, 200, 200, 'frame');
      const child = { ...makeObject('c1', 50, 50, 100, 100, 'rectangle'), parentFrameId: 'f1' } as IBoardObject;
      const objects = [frame, child];

      const config = makeConfig({
        objectsRecord: Object.fromEntries(objects.map((o) => [o.id, o])),
        selectedIds: new Set(['c1']),
        visibleShapeIds: objects.map((o) => o.id),
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      // Drag child to position that exceeds frame bounds
      act(() => {
        result.current.handleObjectDragEnd('c1', 150, 150);
      });

      // Should call onObjectsUpdate with batch (child + frame resize)
      expect(config.onObjectsUpdate).toHaveBeenCalled();
    });

    it('skips reparenting for connector objects', () => {
      const connector = makeObject('conn1', 50, 50, 100, 100, 'connector');
      const objects = [connector, objA, objB, objC];
      const objectsRecord = Object.fromEntries(objects.map((o) => [o.id, o]));

      const config = makeConfig({
        objectsRecord,
        selectedIds: new Set(['conn1']),
        visibleShapeIds: objects.map((o) => o.id),
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('conn1', 60, 70);
      });

      expect(resolveParentFrameIdFromFrames).not.toHaveBeenCalled();
      expect(config.onObjectUpdate).toHaveBeenCalledWith('conn1', expect.objectContaining({ x: 60, y: 70 }));
    });
  });

  // --- Transform end with grid snap ---

  describe('handleTransformEnd — grid snap', () => {
    it('snaps resize rect to grid when width/height present and object found', () => {
      vi.mocked(snapResizeRectToGrid).mockReturnValue({ x: 0, y: 0, width: 120, height: 80 });
      const config = makeConfig({ snapToGridEnabled: true });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const attrs: ITransformEndAttrs = { x: 5, y: 5, width: 115, height: 78, rotation: 0 };
      act(() => {
        result.current.handleTransformEnd('a', attrs);
      });

      expect(snapResizeRectToGrid).toHaveBeenCalled();
      expect(config.onObjectUpdate).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ width: 120, height: 80 })
      );
    });

    it('falls back to position snap when object not found in objectsById', () => {
      vi.mocked(snapPositionToGrid).mockReturnValue({ x: 20, y: 20 });
      const config = makeConfig({ snapToGridEnabled: true });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const attrs: ITransformEndAttrs = { x: 15, y: 15, width: 100, height: 80, rotation: 0 };
      act(() => {
        result.current.handleTransformEnd('nonexistent', attrs);
      });

      expect(snapPositionToGrid).toHaveBeenCalled();
      expect(config.onObjectUpdate).toHaveBeenCalledWith(
        'nonexistent',
        expect.objectContaining({ x: 20, y: 20 })
      );
    });

    it('snaps line transform position to grid when points present', () => {
      vi.mocked(snapPositionToGrid).mockReturnValue({ x: 20, y: 40 });
      vi.mocked(getWidthHeightFromPoints).mockReturnValue({ width: 180, height: 90 });
      const config = makeConfig({ snapToGridEnabled: true });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const attrs = { x: 15, y: 38, points: [0, 0, 180, 90], rotation: 0 } as ITransformEndAttrs;
      act(() => {
        result.current.handleTransformEnd('a', attrs);
      });

      expect(snapPositionToGrid).toHaveBeenCalled();
      expect(config.onObjectUpdate).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ x: 20, y: 40, width: 180, height: 90 })
      );
    });
  });

  // --- handleDragMove ---

  describe('handleDragMove', () => {
    const makeDragEvent = (objectId: string, x: number, y: number) => ({
      target: {
        id: () => objectId,
        name: () => objectId,
        x: () => x,
        y: () => y,
        position: vi.fn(),
      },
    });

    it('applies snap to grid on drag move when enabled', () => {
      const config = makeConfig({ snapToGridEnabled: true, selectedIds: new Set(['a']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));
      const event = makeDragEvent('a', 50, 60);

      act(() => {
        result.current.handleDragMove(event as never);
      });

      expect(applySnapPositionToNode).toHaveBeenCalled();
    });

    it('sets drag exemption on first drag move', () => {
      const config = makeConfig({ selectedIds: new Set(['a']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));
      const event = makeDragEvent('a', 50, 60);

      act(() => {
        result.current.handleDragMove(event as never);
      });

      expect(spatialIndex.setDragging).toHaveBeenCalled();
    });

    it('sets frame drag offset when dragging a frame', () => {
      const frame = makeObject('f1', 100, 100, 300, 300, 'frame');
      const objects = [frame];
      const config = makeConfig({
        objectsRecord: Object.fromEntries(objects.map((o) => [o.id, o])),
        selectedIds: new Set(['f1']),
        visibleShapeIds: ['f1'],
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));
      const event = makeDragEvent('f1', 120, 130);

      act(() => {
        result.current.handleDragMove(event as never);
      });

      expect(mockSetFrameDragOffset).toHaveBeenCalledWith({
        frameId: 'f1',
        dx: 20,
        dy: 30,
      });
    });

    it('detects drop target frame for non-frame non-connector drag', () => {
      vi.mocked(findContainingFrame).mockReturnValue('target-frame');
      const rect = makeObject('r1', 50, 50, 100, 100, 'rectangle');
      const objects = [rect];
      const config = makeConfig({
        objectsRecord: Object.fromEntries(objects.map((o) => [o.id, o])),
        selectedIds: new Set(['r1']),
        visibleShapeIds: ['r1'],
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));
      const event = makeDragEvent('r1', 60, 70);

      act(() => {
        result.current.handleDragMove(event as never);
      });

      expect(mockSetDropTargetFrameId).toHaveBeenCalled();
    });

    it('builds drag ids including frame children for multi-select', () => {
      const frame = makeObject('f1', 100, 100, 300, 300, 'frame');
      const child = makeObject('c1', 150, 150, 50, 50);
      const otherRect = makeObject('r1', 500, 500, 50, 50, 'rectangle');
      const objects = [frame, child, otherRect];
      mockFrameChildrenIndex.set('f1', new Set(['c1']));

      const config = makeConfig({
        objectsRecord: Object.fromEntries(objects.map((o) => [o.id, o])),
        selectedIds: new Set(['f1', 'r1']),
        visibleShapeIds: objects.map((o) => o.id),
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));
      const event = makeDragEvent('f1', 110, 110);

      act(() => {
        result.current.handleDragMove(event as never);
      });

      const setDraggingCall = vi.mocked(spatialIndex.setDragging).mock.calls[0]?.[0];
      expect(setDraggingCall).toBeDefined();
      expect(setDraggingCall?.has('f1')).toBe(true);
      expect(setDraggingCall?.has('r1')).toBe(true);
      expect(setDraggingCall?.has('c1')).toBe(true);
    });

    it('adds frame children to drag ids when single frame is dragged', () => {
      const frame = makeObject('f1', 100, 100, 300, 300, 'frame');
      const child = makeObject('c1', 150, 150, 50, 50);
      const objects = [frame, child];
      mockFrameChildrenIndex.set('f1', new Set(['c1']));

      const config = makeConfig({
        objectsRecord: Object.fromEntries(objects.map((o) => [o.id, o])),
        selectedIds: new Set(['f1']),
        visibleShapeIds: objects.map((o) => o.id),
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));
      const event = makeDragEvent('f1', 110, 110);

      act(() => {
        result.current.handleDragMove(event as never);
      });

      const setDraggingCall = vi.mocked(spatialIndex.setDragging).mock.calls[0]?.[0];
      expect(setDraggingCall?.has('f1')).toBe(true);
      expect(setDraggingCall?.has('c1')).toBe(true);
    });
  });

  // --- Selection drag ---

  describe('handleSelectionDragStart / handleSelectionDragMove / handleSelectionDragEnd', () => {
    it('sets up selection drag bounds and spatial exemption', () => {
      const config = makeConfig({ selectedIds: new Set(['a', 'b']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleSelectionDragStart({ x1: 0, y1: 0, x2: 300, y2: 300 });
      });

      expect(spatialIndex.setDragging).toHaveBeenCalled();
    });

    it('sets group drag offset on selection drag move', () => {
      const config = makeConfig({ selectedIds: new Set(['a', 'b']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleSelectionDragStart({ x1: 10, y1: 20, x2: 200, y2: 200 });
      });

      const moveEvent = {
        target: { x: () => 30, y: () => 40 },
      };

      act(() => {
        result.current.handleSelectionDragMove(moveEvent as never);
      });

      expect(mockSetGroupDragOffset).toHaveBeenCalledWith({ dx: 20, dy: 20 });
    });

    it('handles selection drag end without onObjectsUpdate', () => {
      const config = makeConfig({
        selectedIds: new Set(['a', 'b']),
        onObjectsUpdate: undefined,
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleSelectionDragStart({ x1: 0, y1: 0, x2: 300, y2: 300 });
      });

      act(() => {
        result.current.handleSelectionDragEnd();
      });

      expect(mockSetGroupDragOffset).toHaveBeenCalledWith(null);
      expect(spatialIndex.clearDragging).toHaveBeenCalled();
    });

    it('commits batch update on selection drag end with onObjectsUpdate', () => {
      const config = makeConfig({ selectedIds: new Set(['a', 'b']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleSelectionDragStart({ x1: 0, y1: 0, x2: 300, y2: 300 });
      });

      const moveEvent = { target: { x: () => 10, y: () => 10 } };
      act(() => {
        result.current.handleSelectionDragMove(moveEvent as never);
      });

      act(() => {
        result.current.handleSelectionDragEnd();
      });

      expect(config.onObjectsUpdate).toHaveBeenCalled();
    });

    it('applies grid snap during selection drag end', () => {
      vi.mocked(snapPositionToGrid).mockImplementation((x: number, y: number) => ({
        x: Math.round(x / 20) * 20,
        y: Math.round(y / 20) * 20,
      }));

      const config = makeConfig({
        selectedIds: new Set(['a']),
        snapToGridEnabled: true,
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleSelectionDragStart({ x1: 0, y1: 0, x2: 100, y2: 100 });
      });

      const moveEvent = { target: { x: () => 13, y: () => 17 } };
      act(() => {
        result.current.handleSelectionDragMove(moveEvent as never);
      });

      act(() => {
        result.current.handleSelectionDragEnd();
      });

      expect(snapPositionToGrid).toHaveBeenCalled();
      expect(config.onObjectsUpdate).toHaveBeenCalled();
    });

    it('handles selection drag move when bounds ref is null (early return)', () => {
      const config = makeConfig({ selectedIds: new Set(['a', 'b']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      // Call move without starting drag first — bounds ref is null
      const moveEvent = { target: { x: () => 30, y: () => 40 } };
      act(() => {
        result.current.handleSelectionDragMove(moveEvent as never);
      });

      // Should not set group drag offset since bounds ref is null
      expect(mockSetGroupDragOffset).not.toHaveBeenCalled();
    });
  });

  // --- Selection bounds with 2+ objects ---

  describe('selectionBounds with multiple selected', () => {
    it('calls getSelectionBoundsFromRecord when 2+ objects selected', () => {
      vi.mocked(getSelectionBoundsFromRecord).mockReturnValue({ x1: 0, y1: 0, x2: 250, y2: 250 });
      const config = makeConfig({ selectedIds: new Set(['a', 'b']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      expect(result.current.selectionBounds).toEqual({ x1: 0, y1: 0, x2: 250, y2: 250 });
    });
  });

  // --- isHoveringSelectionHandleEffective ---

  describe('isHoveringSelectionHandleEffective', () => {
    it('is false when selectionBounds is null', () => {
      const config = makeConfig({ selectedIds: new Set(['a']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.setIsHoveringSelectionHandle(true);
      });

      expect(result.current.isHoveringSelectionHandleEffective).toBe(false);
    });

    it('is true when selectionBounds exists and hovering', () => {
      vi.mocked(getSelectionBoundsFromRecord).mockReturnValue({ x1: 0, y1: 0, x2: 250, y2: 250 });
      const config = makeConfig({ selectedIds: new Set(['a', 'b']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.setIsHoveringSelectionHandle(true);
      });

      expect(result.current.isHoveringSelectionHandleEffective).toBe(true);
    });

    it('is false when selectionBounds exists but not hovering', () => {
      vi.mocked(getSelectionBoundsFromRecord).mockReturnValue({ x1: 0, y1: 0, x2: 250, y2: 250 });
      const config = makeConfig({ selectedIds: new Set(['a', 'b']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      expect(result.current.isHoveringSelectionHandleEffective).toBe(false);
    });
  });

  // --- getDragEndHandler clears drag state ---

  describe('getDragEndHandler behavior', () => {
    it('calls clearDragState after drag end', () => {
      const config = makeConfig({ selectedIds: new Set(['a']) });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      const handler = result.current.getDragEndHandler('a');
      act(() => {
        handler(50, 60);
      });

      expect(mockClearDragState).toHaveBeenCalled();
    });
  });

  // --- Multi-select reparenting ---

  describe('handleObjectDragEnd — multi-select reparenting', () => {
    it('resolves new parent for non-frame non-connector objects in multi-drag', () => {
      vi.mocked(resolveParentFrameIdFromFrames).mockReturnValue('new-frame');

      const frame = makeObject('new-frame', 0, 0, 500, 500, 'frame');
      const rectA = makeObject('r1', 50, 50, 100, 100, 'rectangle');
      const rectB = makeObject('r2', 200, 200, 100, 100, 'rectangle');
      const objects = [frame, rectA, rectB];

      const config = makeConfig({
        objectsRecord: Object.fromEntries(objects.map((o) => [o.id, o])),
        selectedIds: new Set(['r1', 'r2']),
        visibleShapeIds: objects.map((o) => o.id),
      });
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleObjectDragEnd('r1', 60, 60);
      });

      expect(resolveParentFrameIdFromFrames).toHaveBeenCalled();
      const batch = config.onObjectsUpdate.mock.calls[0]?.[0];
      const r1Entry = batch?.find((b: { objectId: string }) => b.objectId === 'r1');
      expect(r1Entry?.updates?.parentFrameId).toBe('new-frame');
    });
  });
});
