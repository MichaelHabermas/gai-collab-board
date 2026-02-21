import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVisibleShapeIds } from '@/hooks/useVisibleShapeIds';
import type { IBoardObject, IViewportState } from '@/types';
import { Timestamp } from 'firebase/firestore';

type QueryBounds = { x1: number; y1: number; x2: number; y2: number };
const { mockQuery, mockObjectsRecord, mockSpatialSize } = vi.hoisted(() => {
  const mockQuery = vi.fn<(bounds: QueryBounds) => Set<string>>();
  const mockObjectsRecord: Record<string, IBoardObject> = {};
  const mockSpatialSize = { value: 0 };
  return { mockQuery, mockObjectsRecord, mockSpatialSize };
});

vi.mock('@/stores/objectsStore', () => ({
  useObjectsStore: (selector: (s: { objects: Record<string, IBoardObject> }) => Record<string, IBoardObject>) =>
    selector({ objects: mockObjectsRecord }),
  spatialIndex: {
    get size(): number {
      return mockSpatialSize.value;
    },
    query: mockQuery,
  },
}));

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

const defaultViewport: IViewportState = {
  position: { x: 0, y: 0 },
  scale: { x: 1, y: 1 },
  width: 800,
  height: 600,
};

describe('useVisibleShapeIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpatialSize.value = 0;
    Object.keys(mockObjectsRecord).forEach((k) => delete mockObjectsRecord[k]);
  });

  it('returns empty array when store has no objects', () => {
    const { result } = renderHook(() => useVisibleShapeIds(defaultViewport));
    expect(result.current).toEqual([]);
  });

  it('uses full object list when spatial index is empty (size 0)', () => {
    const sticky = makeObj({ id: 's1', x: 50, y: 50, width: 100, height: 100 });
    mockObjectsRecord['s1'] = sticky;

    const { result } = renderHook(() => useVisibleShapeIds(defaultViewport));
    expect(result.current).toContain('s1');
  });

  it('uses spatial index query when spatial index has entries', () => {
    mockSpatialSize.value = 1;
    const sticky = makeObj({ id: 's1', x: 50, y: 50, width: 100, height: 100 });
    mockObjectsRecord['s1'] = sticky;
    mockQuery.mockReturnValue(new Set(['s1']));
    const { result } = renderHook(() => useVisibleShapeIds(defaultViewport));
    expect(mockQuery).toHaveBeenCalled();
    expect(result.current).toContain('s1');
  });

  it('excludes object when id is in candidates but object is missing from record', () => {
    mockSpatialSize.value = 1;
    mockQuery.mockReturnValue(new Set(['missing-id']));
    const viewport: IViewportState = { ...defaultViewport, position: { x: 0, y: 0 }, scale: { x: 1, y: 1 } };
    const { result } = renderHook(() => useVisibleShapeIds(viewport));
    expect(result.current).not.toContain('missing-id');
    expect(result.current).toEqual([]);
  });

  it('computes visibility for rect shape (sticky) and includes when in viewport', () => {
    const sticky = makeObj({ id: 'rect-1', x: 100, y: 100, width: 50, height: 50 });
    mockObjectsRecord['rect-1'] = sticky;

    const viewport: IViewportState = { ...defaultViewport, position: { x: 0, y: 0 }, scale: { x: 1, y: 1 } };
    const { result } = renderHook(() => useVisibleShapeIds(viewport));
    expect(result.current).toContain('rect-1');
  });

  it('computes visibility for line/connector with points (points branch)', () => {
    const connector = makeObj({
      id: 'conn-1',
      type: 'connector',
      x: 10,
      y: 20,
      width: 0,
      height: 0,
      points: [0, 0, 100, 50],
    });
    mockObjectsRecord['conn-1'] = connector;

    const viewport: IViewportState = { ...defaultViewport, position: { x: 0, y: 0 }, scale: { x: 1, y: 1 } };
    const { result } = renderHook(() => useVisibleShapeIds(viewport));
    expect(result.current).toContain('conn-1');
  });

  it('sorts frames before non-frames in result', () => {
    const frame = makeObj({ id: 'f1', type: 'frame', x: 0, y: 0, width: 200, height: 200 });
    const sticky = makeObj({ id: 's1', x: 50, y: 50, width: 50, height: 50 });
    mockObjectsRecord['f1'] = frame;
    mockObjectsRecord['s1'] = sticky;

    const { result } = renderHook(() => useVisibleShapeIds(defaultViewport));
    expect(result.current).toEqual(['f1', 's1']);
  });

  it('excludes object outside viewport', () => {
    const sticky = makeObj({
      id: 'far',
      x: 10000,
      y: 10000,
      width: 50,
      height: 50,
    });
    mockObjectsRecord['far'] = sticky;

    const viewport: IViewportState = {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      width: 800,
      height: 600,
    };
    const { result } = renderHook(() => useVisibleShapeIds(viewport));
    expect(result.current).not.toContain('far');
  });
});
