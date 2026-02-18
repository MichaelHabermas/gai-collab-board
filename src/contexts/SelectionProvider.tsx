import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { SelectionContext } from './selectionContext';

interface ISelectionProviderProps {
  children: ReactNode;
}

export const SelectionProvider = ({ children }: ISelectionProviderProps): ReactElement => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectionContextValue = useMemo(
    () => ({
      selectedIds,
      setSelectedIds,
    }),
    [selectedIds]
  );

  return (
    <SelectionContext.Provider value={selectionContextValue}>{children}</SelectionContext.Provider>
  );
};
