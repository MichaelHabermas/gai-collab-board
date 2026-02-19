import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShapeDragHandler } from '@/hooks/useShapeDragHandler';

describe('useShapeDragHandler', () => {
  it('calls onDragEnd with node x,y when no offset', () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() => useShapeDragHandler(onDragEnd));
    const handler = result.current;

    handler({
      target: { x: () => 100, y: () => 50 },
    } as unknown as Parameters<typeof handler>[0]);

    expect(onDragEnd).toHaveBeenCalledWith(100, 50);
  });

  it('subtracts offset so persisted position is origin not node position', () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useShapeDragHandler(onDragEnd, { offsetX: 10, offsetY: 5 })
    );
    const handler = result.current;

    handler({
      target: { x: () => 100, y: () => 50 },
    } as unknown as Parameters<typeof handler>[0]);

    expect(onDragEnd).toHaveBeenCalledWith(90, 45);
  });
});
