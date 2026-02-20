import { useCallback, useMemo, useEffect, type RefObject } from 'react';
import { getSelectionBounds, getBoardBounds } from '@/lib/canvasBounds';
import { useViewportActionsStore } from '@/stores/viewportActionsStore';
import type { IBoardObject, IBounds, ExportImageFormat, IViewportActionsValue } from '@/types';

interface IUseViewportActionsParams {
  objects: IBoardObject[];
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
  objectsRef: RefObject<IBoardObject[]>;
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
  objects,
  selectedIds,
  zoomToFitBounds,
  resetViewport,
  zoomTo,
  exportViewport,
  exportFullBoard,
  objectsRef,
}: IUseViewportActionsParams): IUseViewportActionsReturn {
  const handleZoomToSelection = useCallback(() => {
    const bounds = getSelectionBounds(objects, selectedIds);
    if (bounds) {
      zoomToFitBounds(bounds);
    }
  }, [objects, selectedIds, zoomToFitBounds]);

  const handleZoomToFitAll = useCallback(() => {
    const bounds = getBoardBounds(objects);
    if (bounds) {
      zoomToFitBounds(bounds);
    } else {
      resetViewport();
    }
  }, [objects, zoomToFitBounds, resetViewport]);

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
      const bounds = getSelectionBounds(objects, objectIds);
      if (bounds) {
        zoomToFitBounds(bounds);
      }
    },
    [objects, zoomToFitBounds]
  );

  const handleExportViewport = useCallback(
    (format?: ExportImageFormat) => {
      exportViewport(format ?? 'png');
    },
    [exportViewport]
  );

  const handleExportFullBoard = useCallback(
    (format?: ExportImageFormat) => {
      exportFullBoard(objectsRef.current, zoomToFitBounds, format ?? 'png');
    },
    [exportFullBoard, objectsRef, zoomToFitBounds]
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
