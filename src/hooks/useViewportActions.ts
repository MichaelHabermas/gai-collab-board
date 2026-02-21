import { useCallback, useMemo, useEffect, type MutableRefObject } from 'react';
import { getSelectionBoundsFromRecord, getBoardBoundsFromRecord } from '@/lib/canvasBounds';
import { useViewportActionsStore } from '@/stores/viewportActionsStore';
import type { IBoardObject, IBounds, ExportImageFormat, IViewportActionsValue } from '@/types';

interface IUseViewportActionsParams {
  objectsRecord: Record<string, IBoardObject>;
  selectedIds: ReadonlySet<string>;
  zoomToFitBounds: (bounds: IBounds) => void;
  resetViewport: () => void;
  zoomTo: (scale: number) => void;
  exportViewport: (format: ExportImageFormat) => void;
  exportFullBoard: (
    objects: IBoardObject[],
    zoomToFitBounds: (b: IBounds) => void,
    format: ExportImageFormat
  ) => void;
  objectsRecordRef: MutableRefObject<Record<string, IBoardObject>>;
}

interface IUseViewportActionsReturn {
  handleZoomToSelection: () => void;
  handleZoomToFitAll: () => void;
  handleZoomPreset: (scale: number) => void;
  handleSetZoomLevel: (percent: number) => void;
  handleZoomToObjectIds: (objectIds: string[]) => void;
  handleExportViewport: (format?: ExportImageFormat) => void;
  handleExportFullBoard: (format?: ExportImageFormat) => void;
}

export function useViewportActions({
  objectsRecord,
  selectedIds,
  zoomToFitBounds,
  resetViewport,
  zoomTo,
  exportViewport,
  exportFullBoard,
  objectsRecordRef,
}: IUseViewportActionsParams): IUseViewportActionsReturn {
  const handleZoomToSelection = useCallback(() => {
    const bounds = getSelectionBoundsFromRecord(objectsRecord, selectedIds);
    if (bounds) {
      zoomToFitBounds(bounds);
    }
  }, [objectsRecord, selectedIds, zoomToFitBounds]);

  const handleZoomToFitAll = useCallback(() => {
    const bounds = getBoardBoundsFromRecord(objectsRecord);
    if (bounds) {
      zoomToFitBounds(bounds);
    } else {
      resetViewport();
    }
  }, [objectsRecord, zoomToFitBounds, resetViewport]);

  const handleZoomPreset = useCallback(
    (scale: number) => {
      zoomTo(scale);
    },
    [zoomTo]
  );

  const handleSetZoomLevel = useCallback(
    (percent: number) => {
      handleZoomPreset(percent / 100);
    },
    [handleZoomPreset]
  );

  const handleZoomToObjectIds = useCallback(
    (objectIds: string[]) => {
      const bounds = getSelectionBoundsFromRecord(objectsRecord, objectIds);
      if (bounds) {
        zoomToFitBounds(bounds);
      }
    },
    [objectsRecord, zoomToFitBounds]
  );

  const handleExportViewport = useCallback(
    (format?: ExportImageFormat) => {
      exportViewport(format ?? 'png');
    },
    [exportViewport]
  );

  const handleExportFullBoard = useCallback(
    (format?: ExportImageFormat) => {
      const record = objectsRecordRef.current ?? {};
      exportFullBoard(Object.values(record), zoomToFitBounds, format ?? 'png');
    },
    [exportFullBoard, objectsRecordRef, zoomToFitBounds]
  );

  // Wire actions into the global viewport actions store for external consumers
  const viewportActions = useMemo<IViewportActionsValue>(
    () => ({
      zoomToFitAll: handleZoomToFitAll,
      zoomToSelection: handleZoomToObjectIds,
      setZoomLevel: handleSetZoomLevel,
      exportViewport: handleExportViewport,
      exportFullBoard: handleExportFullBoard,
    }),
    [
      handleZoomToFitAll,
      handleZoomToObjectIds,
      handleSetZoomLevel,
      handleExportViewport,
      handleExportFullBoard,
    ]
  );

  const setViewportStoreActions = useViewportActionsStore((s) => s.setActions);

  useEffect(() => {
    setViewportStoreActions(viewportActions);

    return () => {
      setViewportStoreActions(null);
    };
  }, [setViewportStoreActions, viewportActions]);

  return {
    handleZoomToSelection,
    handleZoomToFitAll,
    handleZoomPreset,
    handleSetZoomLevel,
    handleZoomToObjectIds,
    handleExportViewport,
    handleExportFullBoard,
  };
}
