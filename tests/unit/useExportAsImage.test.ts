import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { renderHook } from '@testing-library/react';
import type Konva from 'konva';
import { useExportAsImage } from '@/hooks/useExportAsImage';
import type { IBoardObject } from '@/types';

describe('useExportAsImage', () => {
  const mockToDataURL = vi.fn().mockReturnValue('data:image/png;base64,abc');

  beforeEach(() => {
    vi.clearAllMocks();
    mockToDataURL.mockReturnValue('data:image/png;base64,abc');
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
});
