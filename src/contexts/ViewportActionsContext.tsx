import { createContext, useContext } from 'react';
import type { IViewportActionsValue } from '@/types';

export const ViewportActionsContext = createContext<IViewportActionsValue | null>(null);

export const useViewportActions = (): IViewportActionsValue | null => {
  return useContext(ViewportActionsContext);
};
