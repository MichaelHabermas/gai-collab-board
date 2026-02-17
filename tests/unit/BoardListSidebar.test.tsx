import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { BoardListSidebar } from '@/components/board/BoardListSidebar';
import type { IBoard } from '@/types';

const mockSubscribeToUserBoards = vi.fn();
const mockDeleteBoard = vi.fn();

vi.mock('@/modules/sync/boardService', () => ({
  subscribeToUserBoards: (userId: string, callback: (boards: IBoard[]) => void) => {
    mockSubscribeToUserBoards(userId, callback);
    return vi.fn();
  },
  deleteBoard: (boardId: string, userId?: string | null) => mockDeleteBoard(boardId, userId),
}));

describe('BoardListSidebar', () => {
  const mockUser = {
    uid: 'user-1',
    email: 'user1@test.com',
    displayName: 'User One',
    photoURL: null,
  } as unknown as import('firebase/auth').User;

  const createMockBoard = (id: string, name: string, ownerId: string): IBoard => ({
    id,
    name,
    ownerId,
    members: { [ownerId]: 'owner' },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const triggerSubscription = (boards: IBoard[]) => {
    const call = mockSubscribeToUserBoards.mock.calls[0];
    if (call && typeof call[1] === 'function') {
      act(() => {
        (call[1] as (boards: IBoard[]) => void)(boards);
      });
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteBoard.mockResolvedValue(undefined);
  });

  it('should show loading until subscription fires', () => {
    const onSelectBoard = vi.fn();
    const onCreateNewBoard = vi.fn();

    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={onSelectBoard}
        onCreateNewBoard={onCreateNewBoard}
      />
    );

    expect(screen.getByTestId('board-list-loading')).toBeInTheDocument();
  });

  it('should create new board and add it to list when New board is clicked', async () => {
    const initialBoards = [
      createMockBoard('board-1', 'First Board', mockUser.uid),
    ];
    const newBoard = createMockBoard('board-2', 'Untitled Board', mockUser.uid);
    const onSelectBoard = vi.fn();
    const onCreateNewBoard = vi.fn().mockResolvedValue(newBoard);

    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={onSelectBoard}
        onCreateNewBoard={onCreateNewBoard}
      />
    );

    triggerSubscription(initialBoards);

    await waitFor(() => {
      expect(screen.getByTestId('board-list-sidebar')).toBeInTheDocument();
    });

    const newBoardButton = screen.getByTestId('board-list-new-board');
    fireEvent.click(newBoardButton);

    await waitFor(() => {
      expect(onCreateNewBoard).toHaveBeenCalledTimes(1);
    });
    expect(onSelectBoard).toHaveBeenCalledWith('board-2');
    expect(screen.getByTestId('board-list-item-board-2')).toBeInTheDocument();
    expect(screen.getByText('Untitled Board')).toBeInTheDocument();
  });

  it('should delete board and switch to other when delete is clicked and confirm', async () => {
    const initialBoards = [
      createMockBoard('board-1', 'First Board', mockUser.uid),
      createMockBoard('board-2', 'Second Board', mockUser.uid),
    ];
    const onSelectBoard = vi.fn();
    const onCreateNewBoard = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={onSelectBoard}
        onCreateNewBoard={onCreateNewBoard}
      />
    );

    triggerSubscription(initialBoards);

    await waitFor(() => {
      expect(screen.getByTestId('board-list-delete-board-1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId('board-list-delete-board-1');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteBoard).toHaveBeenCalledWith('board-1', 'user-1');
    });
    expect(onSelectBoard).toHaveBeenCalledWith('board-2');
    confirmSpy.mockRestore();
  });

  it('should delete last board and create new then select it', async () => {
    const initialBoards = [
      createMockBoard('board-1', 'Only Board', mockUser.uid),
    ];
    const newBoard = createMockBoard('board-new', 'Untitled Board', mockUser.uid);
    const onSelectBoard = vi.fn();
    const onCreateNewBoard = vi.fn().mockResolvedValue(newBoard);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={onSelectBoard}
        onCreateNewBoard={onCreateNewBoard}
      />
    );

    triggerSubscription(initialBoards);

    await waitFor(() => {
      expect(screen.getByTestId('board-list-delete-board-1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId('board-list-delete-board-1');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteBoard).toHaveBeenCalledWith('board-1', 'user-1');
    });
    await waitFor(() => {
      expect(onCreateNewBoard).toHaveBeenCalledTimes(1);
    });
    expect(onSelectBoard).toHaveBeenCalledWith('board-new');
    confirmSpy.mockRestore();
  });
});
