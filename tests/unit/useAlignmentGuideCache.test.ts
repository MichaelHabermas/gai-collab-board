import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { useAlignmentGuideCache } from '@/hooks/useAlignmentGuideCache';
import { useObjectsStore } from '@/stores/objectsStore';
import type { IBoardObject } from '@/types';

const now = Timestamp.now();

const makeObj = (id: string, overrides: Partial<IBoardObject> = {}): IBoardObject => ({
  id,
  type: 'sticky',
  x: 0,
  y: 0,
  width: 100,
  height: 80,
  rotation: 0,
  fill: '#fff',
  createdBy: 'u',
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('useAlignmentGuideCache', () => {
  beforeEach(() => {
    useObjectsStore.getState().clear();
  });

  it('filters out missing objects when visibleShapeIds includes id not in store (branch line 41)', () => {
    useObjectsStore.getState().setAll([makeObj('obj-1'), makeObj('obj-2')]);

    const { result } = renderHook(() =>
      useAlignmentGuideCache({
        visibleShapeIds: ['obj-1', 'missing-id', 'obj-2'],
        visibleObjectIdsKey: 'obj-1,missing-id,obj-2',
        snapToGridEnabled: false,
      })
    );

    expect(result.current.guideCandidateBoundsRef.current).toHaveLength(2);
    expect(result.current.guideCandidateBoundsRef.current?.map((e) => e.id)).toEqual([
      'obj-1',
      'obj-2',
    ]);
  });
});
