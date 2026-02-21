import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useViewportActions } from '@/hooks/useViewportActions';
import { useViewportActionsStore } from '@/stores/viewportActionsStore';
import type { IBoardObject, IBounds } from '@/types';

// Mock canvasBounds — record-based bounds helpers
vi.mock('@/lib/canvasBounds', () => ({
  getSelectionBoundsFromRecord: vi.fn(),
  getBoardBoundsFromRecord: vi.fn(),
}));

import {
  getSelectionBoundsFromRecord,
  getBoardBoundsFromRecord,
} from '@/lib/canvasBounds';

const mockGetSelectionBoundsFromRecord = vi.mocked(getSelectionBoundsFromRecord);
const mockGetBoardBoundsFromRecord = vi.mocked(getBoardBoundsFromRecord);

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

describe('useViewportActions', () => {
  const mockZoomToFitBounds = vi.fn();
  const mockResetViewport = vi.fn();
  const mockZoomTo = vi.fn();
  const mockExportViewport = vi.fn();
  const mockExportFullBoard = vi.fn();
  const objects = [makeObject('a', 0, 0, 100, 100), makeObject('b', 200, 200, 50, 50)];
  const objectsRecord = Object.fromEntries(objects.map((o) => [o.id, o]));
  const objectsRecordRef = { current: objectsRecord };

  const defaultParams = () => ({
    objectsRecord,
    selectedIds: new Set<string>(['a']),
    zoomToFitBounds: mockZoomToFitBounds,
    resetViewport: mockResetViewport,
    zoomTo: mockZoomTo,
    exportViewport: mockExportViewport,
    exportFullBoard: mockExportFullBoard,
    objectsRecordRef,
  });

  const setup = (overrides = {}) =>
    renderHook(() => useViewportActions({ ...defaultParams(), ...overrides }));

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the store between tests
    useViewportActionsStore.getState().setActions(null);
  });

  describe('handleZoomToSelection', () => {
    it('zooms to selection bounds when bounds exist', () => {
      const bounds: IBounds = { x1: 0, y1: 0, x2: 100, y2: 100 };
      mockGetSelectionBoundsFromRecord.mockReturnValue(bounds);
      const { result } = setup();

      act(() => {
        result.current.handleZoomToSelection();
      });

      expect(mockGetSelectionBoundsFromRecord).toHaveBeenCalledWith(
        objectsRecord,
        new Set(['a'])
      );
      expect(mockZoomToFitBounds).toHaveBeenCalledWith(bounds);
    });

    it('does nothing when no selection bounds', () => {
      mockGetSelectionBoundsFromRecord.mockReturnValue(null);
      const { result } = setup();

      act(() => {
        result.current.handleZoomToSelection();
      });

      expect(mockZoomToFitBounds).not.toHaveBeenCalled();
    });
  });

  describe('handleZoomToFitAll', () => {
    it('zooms to board bounds when objects exist', () => {
      const bounds: IBounds = { x1: 0, y1: 0, x2: 250, y2: 250 };
      mockGetBoardBoundsFromRecord.mockReturnValue(bounds);
      const { result } = setup();

      act(() => {
        result.current.handleZoomToFitAll();
      });

      expect(mockGetBoardBoundsFromRecord).toHaveBeenCalledWith(objectsRecord);
      expect(mockZoomToFitBounds).toHaveBeenCalledWith(bounds);
    });

    it('resets viewport when board is empty', () => {
      mockGetBoardBoundsFromRecord.mockReturnValue(null);
      const { result } = setup();

      act(() => {
        result.current.handleZoomToFitAll();
      });

      expect(mockResetViewport).toHaveBeenCalled();
      expect(mockZoomToFitBounds).not.toHaveBeenCalled();
    });
  });

  describe('handleZoomPreset', () => {
    it('calls zoomTo with the given scale', () => {
      const { result } = setup();

      act(() => {
        result.current.handleZoomPreset(1.5);
      });

      expect(mockZoomTo).toHaveBeenCalledWith(1.5);
    });
  });

  describe('handleSetZoomLevel', () => {
    it('converts percent to scale and zooms', () => {
      const { result } = setup();

      act(() => {
        result.current.handleSetZoomLevel(150);
      });

      expect(mockZoomTo).toHaveBeenCalledWith(1.5);
    });
  });

  describe('handleZoomToObjectIds', () => {
    it('zooms to bounds of specified object IDs', () => {
      const bounds: IBounds = { x1: 200, y1: 200, x2: 250, y2: 250 };
      mockGetSelectionBoundsFromRecord.mockReturnValue(bounds);
      const { result } = setup();

      act(() => {
        result.current.handleZoomToObjectIds(['b']);
      });

      expect(mockGetSelectionBoundsFromRecord).toHaveBeenCalledWith(objectsRecord, ['b']);
      expect(mockZoomToFitBounds).toHaveBeenCalledWith(bounds);
    });

    it('does nothing when no bounds for given IDs', () => {
      mockGetSelectionBoundsFromRecord.mockReturnValue(null);
      const { result } = setup();

      act(() => {
        result.current.handleZoomToObjectIds(['nonexistent']);
      });

      expect(mockZoomToFitBounds).not.toHaveBeenCalled();
    });
  });

  describe('handleExportViewport', () => {
    it('exports viewport as png by default', () => {
      const { result } = setup();

      act(() => {
        result.current.handleExportViewport();
      });

      expect(mockExportViewport).toHaveBeenCalledWith('png');
    });

    it('exports viewport with specified format', () => {
      const { result } = setup();

      act(() => {
        result.current.handleExportViewport('jpeg');
      });

      expect(mockExportViewport).toHaveBeenCalledWith('jpeg');
    });
  });

  describe('handleExportFullBoard', () => {
    it('exports full board as png by default', () => {
      const { result } = setup();

      act(() => {
        result.current.handleExportFullBoard();
      });

      expect(mockExportFullBoard).toHaveBeenCalledWith(objects, mockZoomToFitBounds, 'png');
    });

    it('exports full board with specified format', () => {
      const { result } = setup();

      act(() => {
        result.current.handleExportFullBoard('jpeg');
      });

      expect(mockExportFullBoard).toHaveBeenCalledWith(objects, mockZoomToFitBounds, 'jpeg');
    });
  });

  describe('viewport actions store sync', () => {
    it('syncs actions to global store on mount', () => {
      setup();

      const store = useViewportActionsStore.getState();
      expect(store.zoomToFitAll).toBeInstanceOf(Function);
      expect(store.zoomToSelection).toBeInstanceOf(Function);
      expect(store.setZoomLevel).toBeInstanceOf(Function);
      expect(store.exportViewport).toBeInstanceOf(Function);
      expect(store.exportFullBoard).toBeInstanceOf(Function);
    });

    it('clears store on unmount', () => {
      const { unmount } = setup();

      unmount();

      const store = useViewportActionsStore.getState();
      expect(store.zoomToFitAll).toBeNull();
      expect(store.zoomToSelection).toBeNull();
      expect(store.setZoomLevel).toBeNull();
      expect(store.exportViewport).toBeNull();
      expect(store.exportFullBoard).toBeNull();
    });
  });
});
