import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { renderHook } from '@testing-library/react';
import type Konva from 'konva';
import { useExportAsImage } from '@/hooks/useExportAsImage';
import type { IBoardObject } from '@/types';

describe('useExportAsImage', () => {
  const mockToDataURL = vi.fn().mockReturnValue('data:image/png;base64,abc');
  const rafCallbacks: Array<(t: number) => void> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    mockToDataURL.mockReturnValue('data:image/png;base64,abc');
    rafCallbacks.length = 0;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: (t: number) => void) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      })
    );
  });

  it('exportViewport calls stage.toDataURL when stageRef has current', () => {
    const stageRef = { current: { toDataURL: mockToDataURL } as unknown as Konva.Stage };
    const { result } = renderHook(() =>
      useExportAsImage({
        stageRef: stageRef as React.RefObject<Konva.Stage | null>,
        boardName: 'Test',
      })
    );
    result.current.exportViewport('png');
    expect(mockToDataURL).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: 'image/png',
        pixelRatio: 2,
      })
    );
  });

  it('exportViewport does nothing when stageRef.current is null', () => {
    const stageRef = { current: null };
    const { result } = renderHook(() =>
      useExportAsImage({
        stageRef: stageRef as React.RefObject<Konva.Stage | null>,
        boardName: 'Test',
      })
    );
    result.current.exportViewport('png');
    expect(mockToDataURL).not.toHaveBeenCalled();
  });

  it('exportFullBoard calls zoomToFitBounds with board bounds and padding', () => {
    const mockZoomToFitBounds = vi.fn();
    const stageRef = { current: { toDataURL: mockToDataURL } as unknown as Konva.Stage };
    const now = Timestamp.now();
    const objects: IBoardObject[] = [
      {
        id: '1',
        type: 'sticky',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        rotation: 0,
        fill: '#fff',
        createdBy: 'u',
        createdAt: now,
        updatedAt: now,
      },
    ];
    const { result } = renderHook(() =>
      useExportAsImage({
        stageRef: stageRef as React.RefObject<Konva.Stage | null>,
        boardName: 'Test',
      })
    );
    result.current.exportFullBoard(objects, mockZoomToFitBounds, 'png');
    expect(mockZoomToFitBounds).toHaveBeenCalledWith(
      expect.objectContaining({ x1: 10, y1: 20, x2: 110, y2: 100 }),
      40
    );
  });

  it('exportFullBoard does nothing when objects empty or stage null', () => {
    const mockZoomToFitBounds = vi.fn();
    const stageRef = { current: null };
    const { result } = renderHook(() =>
      useExportAsImage({
        stageRef: stageRef as React.RefObject<Konva.Stage | null>,
        boardName: 'Test',
      })
    );
    result.current.exportFullBoard([], mockZoomToFitBounds, 'png');
    expect(mockZoomToFitBounds).not.toHaveBeenCalled();
  });

  it('exportFullBoard does nothing when stage is set but objects empty (bounds null)', () => {
    const mockZoomToFitBounds = vi.fn();
    const stageRef = { current: { toDataURL: mockToDataURL } as unknown as Konva.Stage };
    const { result } = renderHook(() =>
      useExportAsImage({
        stageRef: stageRef as React.RefObject<Konva.Stage | null>,
        boardName: 'Test',
      })
    );
    result.current.exportFullBoard([], mockZoomToFitBounds, 'png');
    expect(mockZoomToFitBounds).not.toHaveBeenCalled();
  });

  it('exportViewport uses default png when format omitted', () => {
    const stageRef = { current: { toDataURL: mockToDataURL } as unknown as Konva.Stage };
    const { result } = renderHook(() =>
      useExportAsImage({
        stageRef: stageRef as React.RefObject<Konva.Stage | null>,
        boardName: 'Test',
      })
    );
    result.current.exportViewport();
    expect(mockToDataURL).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: 'image/png',
        quality: 1,
      })
    );
  });

  it('exportViewport uses jpeg mimeType and quality when format is jpeg', () => {
    const stageRef = { current: { toDataURL: mockToDataURL } as unknown as Konva.Stage };
    const { result } = renderHook(() =>
      useExportAsImage({
        stageRef: stageRef as React.RefObject<Konva.Stage | null>,
        boardName: 'Test',
      })
    );
    result.current.exportViewport('jpeg');
    expect(mockToDataURL).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: 'image/jpeg',
        quality: 0.92,
      })
    );
  });

  it('exportFullBoard uses jpeg options when format is jpeg', () => {
    const mockZoomToFitBounds = vi.fn();
    const stageRef = { current: { toDataURL: mockToDataURL } as unknown as Konva.Stage };
    const now = Timestamp.now();
    const objects: IBoardObject[] = [
      {
        id: '1',
        type: 'sticky',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        rotation: 0,
        fill: '#fff',
        createdBy: 'u',
        createdAt: now,
        updatedAt: now,
      },
    ];
    const { result } = renderHook(() =>
      useExportAsImage({
        stageRef: stageRef as React.RefObject<Konva.Stage | null>,
        boardName: 'Test',
      })
    );
    result.current.exportFullBoard(objects, mockZoomToFitBounds, 'jpeg');
    rafCallbacks[0]?.(0);
    rafCallbacks[1]?.(0);
    expect(mockToDataURL).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: 'image/jpeg',
        quality: 0.92,
      })
    );
  });

  it('exportFullBoard does not call toDataURL when stage is null in second rAF', () => {
    const mockZoomToFitBounds = vi.fn();
    const stageRef = { current: { toDataURL: mockToDataURL } as unknown as Konva.Stage };
    const now = Timestamp.now();
    const objects: IBoardObject[] = [
      {
        id: '1',
        type: 'sticky',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        rotation: 0,
        fill: '#fff',
        createdBy: 'u',
        createdAt: now,
        updatedAt: now,
      },
    ];
    const { result } = renderHook(() =>
      useExportAsImage({
        stageRef: stageRef as React.RefObject<Konva.Stage | null>,
        boardName: 'Test',
      })
    );
    result.current.exportFullBoard(objects, mockZoomToFitBounds, 'png');
    rafCallbacks[0]?.(0);
    (stageRef as { current: Konva.Stage | null }).current = null;
    rafCallbacks[1]?.(0);
    expect(mockToDataURL).not.toHaveBeenCalled();
  });
});
