import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';

function BoardIdDisplay(): ReactElement {
  const { boardId } = useParams<{ boardId: string }>();
  return <div data-testid='route-board-id'>{boardId ?? 'no-id'}</div>;
}

function RoutingHarness({ initialEntry }: { initialEntry: string }): ReactElement {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path='/board/:boardId' element={<BoardIdDisplay />} />
        <Route path='/' element={<div data-testid='route-default'>default</div>} />
        <Route path='*' element={<div data-testid='route-catch'>catch</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Share link / deep-link routing', () => {
  it('resolves /board/:boardId to the correct board id', () => {
    render(<RoutingHarness initialEntry='/board/some-board-123' />);

    const el = screen.getByTestId('route-board-id');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('some-board-123');
  });

  it('uses board id from URL not default when path is /board/xyz', () => {
    render(<RoutingHarness initialEntry='/board/xyz' />);

    expect(screen.getByTestId('route-board-id')).toHaveTextContent('xyz');
  });

  it('matches /board/ route and passes param', () => {
    render(<RoutingHarness initialEntry='/board/my-shared-board-id' />);

    expect(screen.getByTestId('route-board-id')).toHaveTextContent('my-shared-board-id');
  });
});
