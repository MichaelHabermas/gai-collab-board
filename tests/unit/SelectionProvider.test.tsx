import { memo, useState, type ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setSelectionStoreState, useSelectionStore } from '@/stores/selectionStore';

let renderCount = 0;

const SelectionConsumer = memo((): ReactElement => {
  renderCount += 1;
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const setSelectedIds = useSelectionStore((state) => state.setSelectedIds);

  return (
    <div>
      <span data-testid='selected-count'>{selectedIds.size}</span>
      <button
        type='button'
        data-testid='select-item'
        onClick={() => setSelectedIds(['obj-1'])}
      >
        Select
      </button>
    </div>
  );
});

SelectionConsumer.displayName = 'SelectionConsumer';

const HostComponent = (): ReactElement => {
  const [counter, setCounter] = useState<number>(0);

  return (
    <div>
      <button
        type='button'
        data-testid='rerender-host'
        onClick={() => setCounter((prev) => prev + 1)}
      >
        Host rerender {counter}
      </button>
      <SelectionConsumer />
    </div>
  );
};

describe('selectionStore', () => {
  it('keeps consumers stable on unrelated parent rerenders', () => {
    setSelectionStoreState([]);
    renderCount = 0;
    render(<HostComponent />);

    expect(renderCount).toBe(1);

    fireEvent.click(screen.getByTestId('rerender-host'));
    expect(renderCount).toBe(1);

    fireEvent.click(screen.getByTestId('select-item'));
    expect(renderCount).toBe(2);
    expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
  });
});
