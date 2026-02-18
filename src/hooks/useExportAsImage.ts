import { useCallback } from 'react';
import type Konva from 'konva';
import { getBoardBounds } from '@/lib/canvasBounds';
import type { IBoardObject } from '@/types';

export type ExportScope = 'viewport' | 'full';
export type ExportFormat = 'png' | 'jpeg';

function downloadDataURL(dataURL: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  link.click();
}

function makeFilename(boardName: string, scope: ExportScope, format: ExportFormat): string {
  const safe = boardName.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50) || 'board';
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${safe}_${scope}_${ts}.${format === 'jpeg' ? 'jpg' : 'png'}`;
}

export interface IUseExportAsImageParams {
  stageRef: React.RefObject<Konva.Stage | null>;
  boardName: string;
}

export interface IUseExportAsImageReturn {
  exportViewport: (format?: ExportFormat) => void;
  exportFullBoard: (
    objects: IBoardObject[],
    zoomToFitBounds: (
      bounds: { x1: number; y1: number; x2: number; y2: number },
      padding?: number
    ) => void,
    format?: ExportFormat
  ) => void;
}

/**
 * Hook to export the canvas as image (current viewport or full board).
 * Uses Konva stage.toDataURL(). Full board uses zoomToFitBounds then exports and restores.
 */
export function useExportAsImage({
  stageRef,
  boardName,
}: IUseExportAsImageParams): IUseExportAsImageReturn {
  const exportViewport = useCallback(
    (format: ExportFormat = 'png') => {
      const stage = stageRef.current;
      if (stage == null) {
        return;
      }
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataURL = stage.toDataURL({
        mimeType,
        quality: format === 'jpeg' ? 0.92 : 1,
        pixelRatio: 2,
      });
      const filename = makeFilename(boardName, 'viewport', format);
      downloadDataURL(dataURL, filename);
    },
    [stageRef, boardName]
  );

  const exportFullBoard = useCallback(
    (
      objects: IBoardObject[],
      zoomToFitBounds: (
        bounds: { x1: number; y1: number; x2: number; y2: number },
        padding?: number
      ) => void,
      format: ExportFormat = 'png'
    ) => {
      const stage = stageRef.current;
      const bounds = getBoardBounds(objects);
      if (stage == null || bounds == null) {
        return;
      }
      zoomToFitBounds(bounds, 40);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const stageNow = stageRef.current;
          if (stageNow == null) {
            return;
          }
          const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const dataURL = stageNow.toDataURL({
            mimeType,
            quality: format === 'jpeg' ? 0.92 : 1,
            pixelRatio: 2,
          });
          const filename = makeFilename(boardName, 'full', format);
          downloadDataURL(dataURL, filename);
        });
      });
    },
    [stageRef, boardName]
  );

  return { exportViewport, exportFullBoard };
}
