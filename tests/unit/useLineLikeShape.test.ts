import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLineLikeShape } from '@/hooks/useLineLikeShape';

describe('useLineLikeShape', () => {
  it('returns offset as center of points bbox', () => {
    const { result } = renderHook(() =>
      useLineLikeShape({ points: [0, 0, 100, 50], onDragEnd: undefined, onTransformEnd: undefined })
    );

    expect(result.current.offset).toEqual({ x: 50, y: 25 });
  });

  it('calls onDragEnd with origin coordinates when handleDragEnd is invoked', () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useLineLikeShape({ points: [0, 0, 10, 10], onDragEnd, onTransformEnd: undefined })
    );

    result.current.handleDragEnd({
      target: { x: () => 42, y: () => 24 },
    } as Parameters<typeof result.current.handleDragEnd>[0]);

    expect(onDragEnd).toHaveBeenCalledWith(37, 19);
  });
});
