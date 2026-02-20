import { create } from 'zustand';
import type { IViewportActionsValue, ExportImageFormat } from '@/types';

interface IViewportActionsStore {
  zoomToFitAll: (() => void) | null;
  zoomToSelection: ((objectIds: string[]) => void) | null;
  setZoomLevel: ((percent: number) => void) | null;
  exportViewport: ((format?: ExportImageFormat) => void) | null;
  exportFullBoard: ((format?: ExportImageFormat) => void) | null;
  setActions: (actions: IViewportActionsValue | null) => void;
}

export const useViewportActionsStore = create<IViewportActionsStore>()((set) => ({
  zoomToFitAll: null,
  zoomToSelection: null,
  setZoomLevel: null,
  exportViewport: null,
  exportFullBoard: null,
  setActions: (actions) => {
    set({
      zoomToFitAll: actions?.zoomToFitAll ?? null,
      zoomToSelection: actions?.zoomToSelection ?? null,
      setZoomLevel: actions?.setZoomLevel ?? null,
      exportViewport: actions?.exportViewport ?? null,
      exportFullBoard: actions?.exportFullBoard ?? null,
    });
  },
}));
