import { useState, type ReactElement, type ReactNode } from 'react';
import { SelectionContext } from './selectionContext';

interface ISelectionProviderProps {
  children: ReactNode;
}

export const SelectionProvider = ({ children }: ISelectionProviderProps): ReactElement => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  return (
    <SelectionContext.Provider value={{ selectedIds, setSelectedIds }}>
      {children}
    </SelectionContext.Provider>
  );
};
