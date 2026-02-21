import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useConnectorCreation } from '@/hooks/useConnectorCreation';
import type { IBoardObject, ToolMode, ConnectorAnchor } from '@/types';

// Mock getAnchorPosition — returns predictable positions based on anchor
vi.mock('@/lib/connectorAnchors', () => ({
  getAnchorPosition: vi.fn(
    (obj: Pick<IBoardObject, 'x' | 'y' | 'width' | 'height'>, anchor: ConnectorAnchor) => {
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      switch (anchor) {
        case 'top':
          return { x: cx, y: obj.y };
        case 'bottom':
          return { x: cx, y: obj.y + obj.height };
        case 'left':
          return { x: obj.x, y: cy };
        case 'right':
          return { x: obj.x + obj.width, y: cy };
        default:
          return { x: cx, y: cy };
      }
    }
  ),
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

describe('useConnectorCreation', () => {
  const objA = makeObject('a', 0, 0, 100, 100);
  const objB = makeObject('b', 300, 300, 100, 100);
  const objects = [objA, objB];

  type OnCreateFn = NonNullable<Parameters<typeof useConnectorCreation>[0]['onObjectCreate']>;
  const mockOnCreate = vi.fn<OnCreateFn>();
  const mockSetActiveTool = vi.fn();
  const activeToolRef = { current: 'connector' as ToolMode };

  const objectsRecord = Object.fromEntries(objects.map((o) => [o.id, o]));

  const defaultParams = () => ({
    objectsRecord,
    activeColor: '#ff0000',
    onObjectCreate: mockOnCreate,
    setActiveTool: mockSetActiveTool,
    activeToolRef,
  });

  const setup = (overrides = {}) =>
    renderHook(() => useConnectorCreation({ ...defaultParams(), ...overrides }));

  beforeEach(() => {
    vi.clearAllMocks();
    activeToolRef.current = 'connector';
    mockOnCreate.mockResolvedValue({
      id: 'conn-1',
      type: 'connector',
    } as IBoardObject);
  });

  describe('initial state', () => {
    it('starts with connectorFrom as null', () => {
      const { result } = setup();

      expect(result.current.connectorFrom).toBeNull();
    });
  });

  describe('first click — sets connectorFrom', () => {
    it('sets connectorFrom with shapeId and anchor', () => {
      const { result } = setup();

      act(() => {
        result.current.handleConnectorNodeClick('a', 'right');
      });

      expect(result.current.connectorFrom).toEqual({ shapeId: 'a', anchor: 'right' });
    });

    it('does not call onObjectCreate on first click', () => {
      const { result } = setup();

      act(() => {
        result.current.handleConnectorNodeClick('a', 'right');
      });

      expect(mockOnCreate).not.toHaveBeenCalled();
    });
  });

  describe('second click — creates connector', () => {
    it('calls onObjectCreate with connector params', async () => {
      const { result } = setup();

      act(() => {
        result.current.handleConnectorNodeClick('a', 'right');
      });

      await act(async () => {
        result.current.handleConnectorNodeClick('b', 'left');
        // Let the promise resolve
        await vi.waitFor(() => expect(mockOnCreate).toHaveBeenCalled());
      });

      expect(mockOnCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connector',
          fromObjectId: 'a',
          toObjectId: 'b',
          fromAnchor: 'right',
          toAnchor: 'left',
          stroke: '#ff0000',
          strokeWidth: 2,
        })
      );
    });

    it('resets connectorFrom after successful creation', async () => {
      const { result } = setup();

      act(() => {
        result.current.handleConnectorNodeClick('a', 'right');
      });

      await act(async () => {
        result.current.handleConnectorNodeClick('b', 'left');
        await vi.waitFor(() => expect(mockOnCreate).toHaveBeenCalled());
        // Wait for promise to settle
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.connectorFrom).toBeNull();
    });

    it('switches tool to select after creation', async () => {
      const { result } = setup();

      act(() => {
        result.current.handleConnectorNodeClick('a', 'right');
      });

      await act(async () => {
        result.current.handleConnectorNodeClick('b', 'left');
        await vi.waitFor(() => expect(mockOnCreate).toHaveBeenCalled());
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(mockSetActiveTool).toHaveBeenCalledWith('select');
      expect(activeToolRef.current).toBe('select');
    });
  });

  describe('click same shape twice — cancels', () => {
    it('resets connectorFrom when clicking the same shape', () => {
      const { result } = setup();

      act(() => {
        result.current.handleConnectorNodeClick('a', 'right');
      });
      expect(result.current.connectorFrom).not.toBeNull();

      act(() => {
        result.current.handleConnectorNodeClick('a', 'left');
      });
      expect(result.current.connectorFrom).toBeNull();
      expect(mockOnCreate).not.toHaveBeenCalled();
    });
  });

  describe('missing objects — resets', () => {
    it('resets when from object not found', () => {
      const recordBOnly = Object.fromEntries([objB].map((o) => [o.id, o]));
      const { result } = setup({ objectsRecord: recordBOnly }); // objA missing

      act(() => {
        result.current.handleConnectorNodeClick('a', 'right');
      });

      act(() => {
        result.current.handleConnectorNodeClick('b', 'left');
      });

      expect(mockOnCreate).not.toHaveBeenCalled();
      expect(result.current.connectorFrom).toBeNull();
    });

    it('resets when to object not found', () => {
      const recordAOnly = Object.fromEntries([objA].map((o) => [o.id, o]));
      const { result } = setup({ objectsRecord: recordAOnly }); // objB missing

      act(() => {
        result.current.handleConnectorNodeClick('a', 'right');
      });

      act(() => {
        result.current.handleConnectorNodeClick('b', 'left');
      });

      expect(mockOnCreate).not.toHaveBeenCalled();
      expect(result.current.connectorFrom).toBeNull();
    });
  });

  describe('no onObjectCreate — resets', () => {
    it('resets connectorFrom when onObjectCreate is undefined', () => {
      const { result } = setup({ onObjectCreate: undefined });

      act(() => {
        result.current.handleConnectorNodeClick('a', 'right');
      });

      act(() => {
        result.current.handleConnectorNodeClick('b', 'left');
      });

      expect(result.current.connectorFrom).toBeNull();
    });
  });

  describe('error path', () => {
    it('resets connectorFrom on create failure', async () => {
      mockOnCreate.mockRejectedValue(new Error('fail'));
      const { result } = setup();

      act(() => {
        result.current.handleConnectorNodeClick('a', 'right');
      });

      await act(async () => {
        result.current.handleConnectorNodeClick('b', 'left');
        await vi.waitFor(() => expect(mockOnCreate).toHaveBeenCalled());
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.connectorFrom).toBeNull();
      expect(mockSetActiveTool).not.toHaveBeenCalled();
    });
  });

  describe('clearConnector', () => {
    it('resets connectorFrom to null', () => {
      const { result } = setup();

      act(() => {
        result.current.handleConnectorNodeClick('a', 'right');
      });
      expect(result.current.connectorFrom).not.toBeNull();

      act(() => {
        result.current.clearConnector();
      });
      expect(result.current.connectorFrom).toBeNull();
    });
  });

  describe('unmount safety (isMountedRef guard)', () => {
    it('does not update state after unmount on success', async () => {
      let resolveCreate: () => void;
      const pendingPromise = new Promise<IBoardObject | null>((resolve) => {
        resolveCreate = () => resolve({ id: 'conn-1', type: 'connector' } as IBoardObject);
      });
      mockOnCreate.mockReturnValue(pendingPromise);

      const { result, unmount } = setup();

      act(() => {
        result.current.handleConnectorNodeClick('a', 'right');
      });

      act(() => {
        result.current.handleConnectorNodeClick('b', 'left');
      });

      expect(mockOnCreate).toHaveBeenCalled();

      // Unmount before promise resolves
      unmount();

      // Now resolve the promise — should not throw or update state
      await act(async () => {
        resolveCreate!();
        await new Promise((r) => setTimeout(r, 0));
      });

      // setActiveTool should NOT have been called since we unmounted
      expect(mockSetActiveTool).not.toHaveBeenCalled();
    });

    it('does not update state after unmount on error', async () => {
      let rejectCreate: (e: Error) => void;
      const pendingPromise = new Promise<IBoardObject | null>((_, reject) => {
        rejectCreate = reject;
      });
      mockOnCreate.mockReturnValue(pendingPromise);

      const { result, unmount } = setup();

      act(() => {
        result.current.handleConnectorNodeClick('a', 'right');
      });

      act(() => {
        result.current.handleConnectorNodeClick('b', 'left');
      });

      unmount();

      // Reject after unmount — should not throw
      await act(async () => {
        rejectCreate!(new Error('fail'));
        await new Promise((r) => setTimeout(r, 0));
      });

      // No errors thrown = pass
    });
  });
});
