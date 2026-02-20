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
  getSelectionBounds: vi.fn(() => null),
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

vi.mock('@/hooks/useObjectDragHandlersRefSync', () => ({
  useObjectDragHandlersRefSync: vi.fn(),
}));

vi.mock('@/lib/perfTimer', () => ({
  perfTime: vi.fn((_label: string, _meta: unknown, fn: () => unknown) => fn()),
}));

vi.mock('@/lib/writeQueue', () => ({
  queueWrite: vi.fn(),
}));

import { queueWrite } from '@/lib/writeQueue';
import { spatialIndex } from '@/stores/objectsStore';
import { snapPositionToGrid } from '@/lib/snapToGrid';
import { getWidthHeightFromPoints } from '@/lib/lineTransform';

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

  return {
    objects,
    objectsById: new Map(objects.map((o) => [o.id, o])),
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
      mockFrameChildrenIndex.set('frame1', new Set(['child1']));

      const config = makeConfig({
        objects,
        objectsById: new Map(objects.map((o) => [o.id, o])),
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
    it('optimistically updates store and queues write', () => {
      const config = makeConfig();
      const { result } = renderHook(() => useObjectDragHandlers(config));

      act(() => {
        result.current.handleTextChange('a', 'Hello world');
      });

      expect(mockUpdateObject).toHaveBeenCalledWith('a', { text: 'Hello world' });
      expect(queueWrite).toHaveBeenCalledWith('a', { text: 'Hello world' });
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

      expect(mockUpdateObject).toHaveBeenCalledWith('a', { text: 'Updated text' });
      expect(queueWrite).toHaveBeenCalledWith('a', { text: 'Updated text' });
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
  });
});
