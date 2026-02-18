import { createContext, useContext } from 'react';

export interface ISelectionContextValue {
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export const SelectionContext = createContext<ISelectionContextValue | null>(null);

export const useSelection = (): ISelectionContextValue => {
  const value = useContext(SelectionContext);
  if (value === null) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  return value;
};
