import { createContext, useContext } from 'react';

export type ExportImageFormat = 'png' | 'jpeg';

export interface IViewportActionsValue {
  zoomToFitAll: () => void;
  zoomToSelection: (objectIds: string[]) => void;
  setZoomLevel: (percent: number) => void;
  exportViewport?: (format?: ExportImageFormat) => void;
  exportFullBoard?: (format?: ExportImageFormat) => void;
}

export const ViewportActionsContext = createContext<IViewportActionsValue | null>(null);

export const useViewportActions = (): IViewportActionsValue | null => {
  return useContext(ViewportActionsContext);
};
