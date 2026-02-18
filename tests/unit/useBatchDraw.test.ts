import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Konva from 'konva';
import { useBatchDraw } from '@/hooks/useBatchDraw';

interface ILayerMock {
  batchDraw: ReturnType<typeof vi.fn>;
  isDestroyed?: () => boolean;
}

describe('useBatchDraw', () => {
  const frameCallbacks: FrameRequestCallback[] = [];
  const requestAnimationFrameMock = vi.fn((callback: FrameRequestCallback) => {
    frameCallbacks.push(callback);
    return frameCallbacks.length;
  });

  beforeEach(() => {
    frameCallbacks.length = 0;
    requestAnimationFrameMock.mockClear();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
  });

  it('ignores null layers', () => {
    const { result } = renderHook(() => useBatchDraw());

    act(() => {
      result.current.requestBatchDraw(null);
    });

    expect(requestAnimationFrameMock).not.toHaveBeenCalled();
  });

  it('batches multiple layer requests into one animation frame', () => {
    const layerA: ILayerMock = {
      batchDraw: vi.fn(),
      isDestroyed: () => false,
    };
    const layerB: ILayerMock = {
      batchDraw: vi.fn(),
      isDestroyed: () => false,
    };

    const { result } = renderHook(() => useBatchDraw());

    act(() => {
      result.current.requestBatchDraw(layerA as unknown as Konva.Layer);
      result.current.requestBatchDraw(layerA as unknown as Konva.Layer);
      result.current.requestBatchDraw(layerB as unknown as Konva.Layer);
    });

    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1);

    act(() => {
      const callback = frameCallbacks[0];
      callback?.(16);
    });

    expect(layerA.batchDraw).toHaveBeenCalledTimes(1);
    expect(layerB.batchDraw).toHaveBeenCalledTimes(1);
  });

  it('skips destroyed layers while still clearing the frame gate', () => {
    const destroyedLayer: ILayerMock = {
      batchDraw: vi.fn(),
      isDestroyed: () => true,
    };
    const liveLayer: ILayerMock = {
      batchDraw: vi.fn(),
      isDestroyed: () => false,
    };

    const { result } = renderHook(() => useBatchDraw());

    act(() => {
      result.current.requestBatchDraw(destroyedLayer as unknown as Konva.Layer);
      result.current.requestBatchDraw(liveLayer as unknown as Konva.Layer);
    });

    act(() => {
      const callback = frameCallbacks[0];
      callback?.(32);
    });

    expect(destroyedLayer.batchDraw).not.toHaveBeenCalled();
    expect(liveLayer.batchDraw).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.requestBatchDraw(liveLayer as unknown as Konva.Layer);
    });

    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(2);
  });
});
