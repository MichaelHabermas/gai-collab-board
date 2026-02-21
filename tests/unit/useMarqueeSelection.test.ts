import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useMarqueeSelection } from '@/hooks/useMarqueeSelection';
import type { IBoardObject, IPosition } from '@/types';

// Mock getObjectBounds — simple rectangle bounds
vi.mock('@/lib/canvasBounds', () => ({
  getObjectBounds: vi.fn((obj: IBoardObject) => ({
    x1: obj.x,
    y1: obj.y,
    x2: obj.x + obj.width,
    y2: obj.y + obj.height,
  })),
}));

const makeObject = (id: string, x: number, y: number, w: number, h: number): IBoardObject =>
  ({
    id,
    type: 'rectangle',
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    fill: '#000',
    createdBy: 'u1',
  }) as IBoardObject;

const toRecord = (arr: IBoardObject[]): Record<string, IBoardObject> =>
  Object.fromEntries(arr.map((o) => [o.id, o]));

/**
 * Build a minimal KonvaEventObject-like mock for onMarqueeEnd.
 * The hook reads: e.target.getStage(), stage.getPointerPosition(),
 * stage.container().getBoundingClientRect(), and e.evt.clientX/clientY.
 */
function makeMockEvent(pointerX: number, pointerY: number) {
  const stage = {
    getPointerPosition: () => ({ x: pointerX, y: pointerY }),
    container: () => ({
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }),
    }),
  };

  return {
    target: { getStage: () => stage },
    evt: { clientX: pointerX, clientY: pointerY },
  } as unknown as Parameters<ReturnType<typeof useMarqueeSelection>['onMarqueeEnd']>[0];
}

/** Identity transform — canvas coords equal pointer coords */
const identityGetCanvasCoords = (_stage: unknown, pointer: { x: number; y: number }): IPosition => ({
  x: pointer.x,
  y: pointer.y,
});

describe('useMarqueeSelection', () => {
  const setup = () => renderHook(() => useMarqueeSelection());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with invisible selection rect and not selecting', () => {
      const { result } = setup();

      expect(result.current.selectionRect.visible).toBe(false);
      expect(result.current.isSelecting).toBe(false);
      expect(result.current.selectingActiveRef.current).toBe(false);
    });
  });

  describe('onMarqueeStart', () => {
    it('sets isSelecting to true and captures start coords', () => {
      const { result } = setup();

      act(() => {
        result.current.onMarqueeStart({ x: 50, y: 75 });
      });

      expect(result.current.isSelecting).toBe(true);
      expect(result.current.selectingActiveRef.current).toBe(true);
      expect(result.current.selectionRect).toEqual({
        visible: true,
        x1: 50,
        y1: 75,
        x2: 50,
        y2: 75,
      });
    });
  });

  describe('onMarqueeMove', () => {
    it('updates x2/y2 of selection rect', () => {
      const { result } = setup();

      act(() => {
        result.current.onMarqueeStart({ x: 10, y: 10 });
      });

      act(() => {
        result.current.onMarqueeMove({ x: 200, y: 150 });
      });

      expect(result.current.selectionRect.x2).toBe(200);
      expect(result.current.selectionRect.y2).toBe(150);
      // Start coords unchanged
      expect(result.current.selectionRect.x1).toBe(10);
      expect(result.current.selectionRect.y1).toBe(10);
    });
  });

  describe('onMarqueeEnd — selects objects in rect', () => {
    it('selects objects that intersect the selection rectangle', () => {
      const { result } = setup();
      const setSelectedIds = vi.fn();
      const objects = [
        makeObject('a', 20, 20, 50, 50), // inside selection
        makeObject('b', 500, 500, 50, 50), // outside selection
        makeObject('c', 80, 80, 40, 40), // inside selection
      ];

      act(() => {
        result.current.onMarqueeStart({ x: 0, y: 0 });
      });

      const event = makeMockEvent(200, 200);
      act(() => {
        result.current.onMarqueeEnd(event, toRecord(objects), identityGetCanvasCoords, setSelectedIds);
      });

      expect(setSelectedIds).toHaveBeenCalledWith(['a', 'c']);
    });

    it('resets selection state after end', () => {
      const { result } = setup();
      const setSelectedIds = vi.fn();

      act(() => {
        result.current.onMarqueeStart({ x: 0, y: 0 });
      });

      const event = makeMockEvent(200, 200);
      act(() => {
        result.current.onMarqueeEnd(event, {}, identityGetCanvasCoords, setSelectedIds);
      });

      expect(result.current.isSelecting).toBe(false);
      expect(result.current.selectingActiveRef.current).toBe(false);
      expect(result.current.selectionRect.visible).toBe(false);
    });
  });

  describe('onMarqueeEnd — too small rect', () => {
    it('does not select when rect is smaller than 5px in either dimension', () => {
      const { result } = setup();
      const setSelectedIds = vi.fn();
      const objects = [makeObject('a', 0, 0, 10, 10)];

      act(() => {
        result.current.onMarqueeStart({ x: 0, y: 0 });
      });

      // Only 3px rect — too small
      const event = makeMockEvent(3, 3);
      act(() => {
        result.current.onMarqueeEnd(event, toRecord(objects), identityGetCanvasCoords, setSelectedIds);
      });

      expect(setSelectedIds).not.toHaveBeenCalled();
    });

    it('does not select when rect is narrow (wide but short)', () => {
      const { result } = setup();
      const setSelectedIds = vi.fn();

      act(() => {
        result.current.onMarqueeStart({ x: 0, y: 0 });
      });

      // 200px wide but only 3px tall
      const event = makeMockEvent(200, 3);
      act(() => {
        result.current.onMarqueeEnd(event, {}, identityGetCanvasCoords, setSelectedIds);
      });

      expect(setSelectedIds).not.toHaveBeenCalled();
    });
  });

  describe('onMarqueeEnd — no objects intersect', () => {
    it('calls setSelectedIds with empty array when no objects in rect', () => {
      const { result } = setup();
      const setSelectedIds = vi.fn();
      const objects = [makeObject('a', 500, 500, 50, 50)]; // far from selection

      act(() => {
        result.current.onMarqueeStart({ x: 0, y: 0 });
      });

      const event = makeMockEvent(100, 100);
      act(() => {
        result.current.onMarqueeEnd(event, toRecord(objects), identityGetCanvasCoords, setSelectedIds);
      });

      expect(setSelectedIds).toHaveBeenCalledWith([]);
    });
  });

  describe('onMarqueeEnd — pointer position fallback', () => {
    it('falls back to clientX/clientY when getPointerPosition returns null', () => {
      const { result } = setup();
      const setSelectedIds = vi.fn();
      const objects = [makeObject('a', 20, 20, 50, 50)];

      act(() => {
        result.current.onMarqueeStart({ x: 0, y: 0 });
      });

      // Create event with null pointer position
      const stage = {
        getPointerPosition: () => null,
        container: () => ({
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }),
        }),
      };
      const event = {
        target: { getStage: () => stage },
        evt: { clientX: 200, clientY: 200 },
      } as unknown as Parameters<ReturnType<typeof useMarqueeSelection>['onMarqueeEnd']>[0];

      act(() => {
        result.current.onMarqueeEnd(event, toRecord(objects), identityGetCanvasCoords, setSelectedIds);
      });

      expect(setSelectedIds).toHaveBeenCalledWith(['a']);
    });
  });

  describe('justDidMarqueeRef', () => {
    it('is set to true after a successful selection', () => {
      const { result } = setup();
      const setSelectedIds = vi.fn();
      const objects = [makeObject('a', 20, 20, 50, 50)];

      expect(result.current.justDidMarqueeRef.current).toBe(false);

      act(() => {
        result.current.onMarqueeStart({ x: 0, y: 0 });
      });

      const event = makeMockEvent(200, 200);
      act(() => {
        result.current.onMarqueeEnd(event, toRecord(objects), identityGetCanvasCoords, setSelectedIds);
      });

      expect(result.current.justDidMarqueeRef.current).toBe(true);
    });
  });

  describe('resetMarquee', () => {
    it('clears all selection state', () => {
      const { result } = setup();

      act(() => {
        result.current.onMarqueeStart({ x: 50, y: 50 });
      });
      expect(result.current.isSelecting).toBe(true);

      act(() => {
        result.current.resetMarquee();
      });

      expect(result.current.isSelecting).toBe(false);
      expect(result.current.selectingActiveRef.current).toBe(false);
      expect(result.current.selectionRect.visible).toBe(false);
    });
  });

  describe('reverse drag direction', () => {
    it('correctly selects objects when dragging right-to-left', () => {
      const { result } = setup();
      const setSelectedIds = vi.fn();
      const objects = [makeObject('a', 20, 20, 50, 50)];

      // Start at (200, 200), end at (0, 0) — reverse direction
      act(() => {
        result.current.onMarqueeStart({ x: 200, y: 200 });
      });

      const event = makeMockEvent(0, 0);
      act(() => {
        result.current.onMarqueeEnd(event, toRecord(objects), identityGetCanvasCoords, setSelectedIds);
      });

      // The hook uses Math.min/max to normalize, so reverse drag should work
      expect(setSelectedIds).toHaveBeenCalledWith(['a']);
    });
  });
});
