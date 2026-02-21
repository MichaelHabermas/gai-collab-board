import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { BoardListSidebar } from '@/components/board/BoardListSidebar';
import type { IBoard } from '@/types';

const mockSubscribeToUserBoards = vi.fn();
const mockDeleteBoard = vi.fn();
const mockRemoveBoardMember = vi.fn();
const mockSubscribeToUserPreferences = vi.fn();
const mockToggleFavoriteBoardId = vi.fn();
const mockRemoveBoardIdFromPreferences = vi.fn();

const mockUpdateBoardName = vi.fn();

vi.mock('@/modules/sync/boardService', () => ({
  subscribeToUserBoards: (userId: string, callback: (boards: IBoard[]) => void) => {
    mockSubscribeToUserBoards(userId, callback);
    return vi.fn();
  },
  deleteBoard: (boardId: string, userId?: string | null) => mockDeleteBoard(boardId, userId),
  removeBoardMember: (boardId: string, userId: string) => mockRemoveBoardMember(boardId, userId),
  updateBoardName: (boardId: string, name: string, userId: string) =>
    mockUpdateBoardName(boardId, name, userId),
  canUserEdit: (board: { ownerId: string; members: Record<string, string> }, userId: string) =>
    board.ownerId === userId || board.members[userId] === 'editor' || board.members[userId] === 'owner',
  canUserManage: (board: { ownerId: string }, userId: string) => board.ownerId === userId,
  isGuestBoard: (boardId: string) => boardId === 'guest',
}));

vi.mock('@/modules/sync/userPreferencesService', () => ({
  subscribeToUserPreferences: (userId: string, callback: (prefs: { recentBoardIds: string[]; favoriteBoardIds: string[] }) => void) => {
    mockSubscribeToUserPreferences(userId, callback);
    return vi.fn();
  },
  toggleFavoriteBoardId: (userId: string, boardId: string) => mockToggleFavoriteBoardId(userId, boardId),
  removeBoardIdFromPreferences: (userId: string, boardId: string) => mockRemoveBoardIdFromPreferences(userId, boardId),
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

  /** Board where current user (mockUser.uid) is a non-owner member (e.g. editor). */
  const createMockBoardWhereUserIsMember = (
    id: string,
    name: string,
    ownerId: string,
    memberRole: 'editor' | 'viewer'
  ): IBoard => ({
    id,
    name,
    ownerId,
    members: { [ownerId]: 'owner', [mockUser.uid]: memberRole },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const triggerBoardSubscription = (boards: IBoard[]) => {
    const call = mockSubscribeToUserBoards.mock.calls[0];
    if (call && typeof call[1] === 'function') {
      act(() => {
        (call[1] as (boards: IBoard[]) => void)(boards);
      });
    }
  };

  const triggerPreferencesSubscription = (prefs: { recentBoardIds?: string[]; favoriteBoardIds?: string[] } = {}) => {
    const call = mockSubscribeToUserPreferences.mock.calls[0];
    if (call && typeof call[1] === 'function') {
      act(() => {
        (call[1] as (p: { recentBoardIds: string[]; favoriteBoardIds: string[] }) => void)({
          recentBoardIds: prefs.recentBoardIds ?? [],
          favoriteBoardIds: prefs.favoriteBoardIds ?? [],
        });
      });
    }
  };

  const triggerSubscriptions = (boards: IBoard[], prefs?: { recentBoardIds?: string[]; favoriteBoardIds?: string[] }) => {
    triggerBoardSubscription(boards);
    triggerPreferencesSubscription(prefs);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteBoard.mockResolvedValue(undefined);
    mockRemoveBoardMember.mockResolvedValue(undefined);
    mockToggleFavoriteBoardId.mockResolvedValue(undefined);
    mockRemoveBoardIdFromPreferences.mockResolvedValue(undefined);
    mockUpdateBoardName.mockResolvedValue(undefined);
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

  it('should create new board and add it to list when Create is submitted in dialog', async () => {
    const initialBoards = [
      createMockBoard('board-1', 'First Board', mockUser.uid),
    ];
    const newBoard = createMockBoard('board-2', 'My Board', mockUser.uid);
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

    triggerSubscriptions(initialBoards);

    await waitFor(() => {
      expect(screen.getByTestId('board-list-sidebar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('board-list-new-board'));
    await waitFor(() => {
      expect(screen.getByTestId('board-list-create-name-input')).toBeInTheDocument();
    });
    const nameInput = screen.getByTestId('board-list-create-name-input');
    fireEvent.change(nameInput, { target: { value: 'My Board' } });
    fireEvent.click(screen.getByTestId('board-list-create-submit'));

    await waitFor(() => {
      expect(onCreateNewBoard).toHaveBeenCalledWith('My Board');
    });
    expect(onSelectBoard).toHaveBeenCalledWith('board-2');
    triggerBoardSubscription([...initialBoards, newBoard]);
    await waitFor(() => {
      expect(screen.getByTestId('board-list-item-board-2')).toBeInTheDocument();
    });
    expect(screen.getByText('My Board')).toBeInTheDocument();
  });

  it('should not show duplicate board entries when new board is created and subscription later returns list including it', async () => {
    const board1 = createMockBoard('board-1', 'First Board', mockUser.uid);
    const initialBoards = [board1];
    const newBoard = createMockBoard('board-2', 'My New Board', mockUser.uid);
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

    triggerSubscriptions(initialBoards);
    await waitFor(() => {
      expect(screen.getByTestId('board-list-sidebar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('board-list-new-board'));
    await waitFor(() => {
      expect(screen.getByTestId('board-list-create-name-input')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('board-list-create-name-input'), {
      target: { value: 'My New Board' },
    });
    fireEvent.click(screen.getByTestId('board-list-create-submit'));

    await waitFor(() => {
      expect(onCreateNewBoard).toHaveBeenCalledTimes(1);
    });
    // Single subscription update with the new board (no optimistic append)
    triggerBoardSubscription([board1, newBoard]);

    await waitFor(() => {
      const allItems = screen.getAllByTestId(/^board-list-item-/);
      const ids = allItems.map((el) => el.getAttribute('data-testid')?.replace('board-list-item-', '') ?? '');
      expect(ids).toHaveLength(2);
      expect(ids.sort()).toEqual(['board-1', 'board-2']);
    });
  });

  it('Favorites tab shows only boards that are in favoriteBoardIds', async () => {
    const initialBoards = [
      createMockBoard('board-1', 'First Board', mockUser.uid),
      createMockBoard('board-2', 'Second Board', mockUser.uid),
    ];
    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={vi.fn()}
        onCreateNewBoard={vi.fn()}
      />
    );
    triggerSubscriptions(initialBoards, {
      recentBoardIds: [],
      favoriteBoardIds: ['board-1'],
    });

    await waitFor(() => {
      expect(screen.getByTestId('board-list-favorites-content')).toBeInTheDocument();
    });
    const favoritesContent = screen.getByTestId('board-list-favorites-content');
    expect(favoritesContent.querySelector('[data-testid="board-list-item-board-1"]')).toBeInTheDocument();
    expect(favoritesContent.querySelector('[data-testid="board-list-item-board-2"]')).not.toBeInTheDocument();
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

    triggerSubscriptions(initialBoards);

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

  it('should show All, Recent, and Favorites tabs', async () => {
    const initialBoards = [
      createMockBoard('board-1', 'First Board', mockUser.uid),
      createMockBoard('board-2', 'Second Board', mockUser.uid),
    ];
    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={vi.fn()}
        onCreateNewBoard={vi.fn()}
      />
    );
    triggerSubscriptions(initialBoards);

    await waitFor(() => {
      expect(screen.getByTestId('board-list-tab-all')).toBeInTheDocument();
      expect(screen.getByTestId('board-list-tab-recent')).toBeInTheDocument();
      expect(screen.getByTestId('board-list-tab-favorites')).toBeInTheDocument();
    });
    expect(screen.getByTestId('board-list-item-board-1')).toBeInTheDocument();
    expect(screen.getByTestId('board-list-item-board-2')).toBeInTheDocument();
  });

  it('should call toggleFavoriteBoardId when star is clicked', async () => {
    const initialBoards = [
      createMockBoard('board-1', 'First Board', mockUser.uid),
    ];
    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={vi.fn()}
        onCreateNewBoard={vi.fn()}
      />
    );
    triggerSubscriptions(initialBoards);

    await waitFor(() => {
      expect(screen.getByTestId('board-list-favorite-board-1')).toBeInTheDocument();
    });

    const starButton = screen.getByTestId('board-list-favorite-board-1');
    fireEvent.click(starButton);

    await waitFor(() => {
      expect(mockToggleFavoriteBoardId).toHaveBeenCalledWith('user-1', 'board-1');
    });
  });

  it('should show empty message on Recent tab when no recent boards', async () => {
    const initialBoards = [
      createMockBoard('board-1', 'First Board', mockUser.uid),
    ];
    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={vi.fn()}
        onCreateNewBoard={vi.fn()}
      />
    );
    triggerSubscriptions(initialBoards, { recentBoardIds: [], favoriteBoardIds: [] });

    await waitFor(() => {
      expect(screen.getByTestId('board-list-recent-empty')).toBeInTheDocument();
    });
    expect(screen.getByText('No recently opened boards')).toBeInTheDocument();
  });

  it('should show empty message on Favorites tab when no favorites', async () => {
    const initialBoards = [
      createMockBoard('board-1', 'First Board', mockUser.uid),
    ];
    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={vi.fn()}
        onCreateNewBoard={vi.fn()}
      />
    );
    triggerSubscriptions(initialBoards, { recentBoardIds: [], favoriteBoardIds: [] });

    await waitFor(() => {
      expect(screen.getByTestId('board-list-favorites-empty')).toBeInTheDocument();
    });
    expect(screen.getByText('No favorite boards')).toBeInTheDocument();
  });

  it('calls updateBoardName when rename is triggered', async () => {
    const initialBoards = [
      createMockBoard('board-1', 'First Board', mockUser.uid),
    ];
    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={vi.fn()}
        onCreateNewBoard={vi.fn()}
      />
    );
    triggerSubscriptions(initialBoards);

    await waitFor(() => {
      expect(screen.getByTestId('board-list-rename-board-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('board-list-rename-board-1'));

    await waitFor(() => {
      expect(screen.getByTestId('board-list-rename-name-input')).toBeInTheDocument();
    });
    const nameInput = screen.getByTestId('board-list-rename-name-input');
    fireEvent.change(nameInput, { target: { value: 'Renamed Board' } });
    fireEvent.click(screen.getByTestId('board-list-rename-submit'));

    await waitFor(() => {
      expect(mockUpdateBoardName).toHaveBeenCalledWith('board-1', 'Renamed Board', mockUser.uid);
    });
  });

  it('does not show rename button for editor', async () => {
    const ownerId = 'other-owner';
    const boards = [
      createMockBoardWhereUserIsMember('board-editor', 'Shared Board', ownerId, 'editor'),
    ];
    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={vi.fn()}
        onCreateNewBoard={vi.fn()}
      />
    );
    triggerSubscriptions(boards);

    await waitFor(() => {
      expect(screen.getByTestId('board-list-item-board-editor')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('board-list-rename-board-editor')).not.toBeInTheDocument();
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

    triggerSubscriptions(initialBoards);

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

  it('after delete, list is driven by subscription only and deleted board is gone', async () => {
    const board1 = createMockBoard('board-1', 'First', mockUser.uid);
    const board2 = createMockBoard('board-2', 'Second', mockUser.uid);
    const initialBoards = [board1, board2];
    const onSelectBoard = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={onSelectBoard}
        onCreateNewBoard={vi.fn()}
      />
    );

    triggerSubscriptions(initialBoards);
    await waitFor(() => {
      expect(screen.getByTestId('board-list-delete-board-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('board-list-delete-board-1'));

    await waitFor(() => {
      expect(mockDeleteBoard).toHaveBeenCalledWith('board-1', 'user-1');
    });
    // Simulate subscription delivering list without deleted board (no optimistic setBoards)
    triggerBoardSubscription([board2]);

    await waitFor(() => {
      expect(screen.queryByTestId('board-list-item-board-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('board-list-item-board-2')).toBeInTheDocument();
    });
    const allItems = screen.getAllByTestId(/^board-list-item-/);
    expect(allItems).toHaveLength(1);
    confirmSpy.mockRestore();
  });

  it('when favoriteBoardIds has one id and boards include it, Favorites tab shows that board and not empty message', async () => {
    const initialBoards = [
      createMockBoard('board-1', 'First Board', mockUser.uid),
    ];
    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={vi.fn()}
        onCreateNewBoard={vi.fn()}
      />
    );
    triggerSubscriptions(initialBoards, {
      recentBoardIds: [],
      favoriteBoardIds: ['board-1'],
    });

    await waitFor(() => {
      expect(screen.getByTestId('board-list-favorites-content')).toBeInTheDocument();
    });
    const favoritesContent = screen.getByTestId('board-list-favorites-content');
    expect(favoritesContent.querySelector('[data-testid="board-list-item-board-1"]')).toBeInTheDocument();
    expect(favoritesContent.querySelector('[data-testid="board-list-favorites-empty"]')).not.toBeInTheDocument();
    expect(favoritesContent).not.toHaveTextContent('No favorite boards');
  });

  it('when favoriteBoardIds contains id not in board list, Favorites tab shows no row for it and shows empty state', async () => {
    const initialBoards = [
      createMockBoard('board-1', 'First Board', mockUser.uid),
    ];
    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={vi.fn()}
        onCreateNewBoard={vi.fn()}
      />
    );
    triggerSubscriptions(initialBoards, {
      recentBoardIds: [],
      favoriteBoardIds: ['deleted-board-id'],
    });

    await waitFor(() => {
      expect(screen.getByTestId('board-list-favorites-content')).toBeInTheDocument();
    });
    const favoritesContent = screen.getByTestId('board-list-favorites-content');
    expect(favoritesContent.querySelector('[data-testid="board-list-item-deleted-board-id"]')).not.toBeInTheDocument();
    expect(favoritesContent.querySelector('[data-testid="board-list-favorites-empty"]')).toBeInTheDocument();
  });

  it('All tab shows exactly one row per board id with no duplicate ids', async () => {
    const board1 = createMockBoard('board-1', 'First', mockUser.uid);
    const board2 = createMockBoard('board-2', 'Second', mockUser.uid);
    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={vi.fn()}
        onCreateNewBoard={vi.fn()}
      />
    );
    triggerSubscriptions([board1, board2]);

    await waitFor(() => {
      const items = screen.getAllByTestId(/^board-list-item-/);
      const ids = items.map((el) => el.getAttribute('data-testid')?.replace('board-list-item-', '') ?? '');
      expect(ids).toHaveLength(2);
      expect(new Set(ids).size).toBe(2);
      expect(ids.sort()).toEqual(['board-1', 'board-2']);
    });
  });

  it('owner board row shows Delete button and no Leave button; non-owner board row shows Leave and no Delete', async () => {
    const ownedBoard = createMockBoard('board-1', 'My Board', mockUser.uid);
    const sharedBoard = createMockBoardWhereUserIsMember('board-2', 'Shared Board', 'other-owner', 'editor');
    const initialBoards = [ownedBoard, sharedBoard];

    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-1'
        onSelectBoard={vi.fn()}
        onCreateNewBoard={vi.fn()}
      />
    );
    triggerSubscriptions(initialBoards);

    await waitFor(() => {
      expect(screen.getByTestId('board-list-sidebar')).toBeInTheDocument();
    });

    expect(screen.getByTestId('board-list-delete-board-1')).toBeInTheDocument();
    expect(screen.queryByTestId('board-list-leave-board-1')).not.toBeInTheDocument();

    expect(screen.getByTestId('board-list-leave-board-2')).toBeInTheDocument();
    expect(screen.queryByTestId('board-list-delete-board-2')).not.toBeInTheDocument();
  });

  it('non-owner Leave last board calls removeBoardMember and removeBoardIdFromPreferences then creates new board and selects it', async () => {
    const sharedBoard = createMockBoardWhereUserIsMember('board-2', 'Shared Board', 'other-owner', 'editor');
    const newBoard = createMockBoard('board-new', 'Untitled Board', mockUser.uid);
    const onSelectBoard = vi.fn();
    const onCreateNewBoard = vi.fn().mockResolvedValue(newBoard);
    const onLeaveBoard = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-2'
        onSelectBoard={onSelectBoard}
        onCreateNewBoard={onCreateNewBoard}
        onLeaveBoard={onLeaveBoard}
      />
    );
    triggerSubscriptions([sharedBoard]);

    await waitFor(() => {
      expect(screen.getByTestId('board-list-leave-board-2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('board-list-leave-board-2'));

    await waitFor(() => {
      expect(mockRemoveBoardMember).toHaveBeenCalledWith('board-2', 'user-1');
    });
    expect(mockRemoveBoardIdFromPreferences).toHaveBeenCalledWith('user-1', 'board-2');
    await waitFor(() => {
      expect(onCreateNewBoard).toHaveBeenCalledTimes(1);
    });
    expect(onSelectBoard).toHaveBeenCalledWith('board-new');
    expect(onLeaveBoard).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('non-owner Leave current board when other boards exist selects first other board', async () => {
    const sharedBoard = createMockBoardWhereUserIsMember('board-2', 'Shared Board', 'other-owner', 'editor');
    const ownedBoard = createMockBoard('board-1', 'My Board', mockUser.uid);
    const initialBoards = [ownedBoard, sharedBoard];
    const onSelectBoard = vi.fn();
    const onCreateNewBoard = vi.fn();
    const onLeaveBoard = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <BoardListSidebar
        user={mockUser}
        currentBoardId='board-2'
        onSelectBoard={onSelectBoard}
        onCreateNewBoard={onCreateNewBoard}
        onLeaveBoard={onLeaveBoard}
      />
    );
    triggerSubscriptions(initialBoards);

    await waitFor(() => {
      expect(screen.getByTestId('board-list-leave-board-2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('board-list-leave-board-2'));

    await waitFor(() => {
      expect(mockRemoveBoardMember).toHaveBeenCalledWith('board-2', 'user-1');
    });
    expect(mockRemoveBoardIdFromPreferences).toHaveBeenCalledWith('user-1', 'board-2');
    expect(onSelectBoard).toHaveBeenCalledWith('board-1');
    expect(onCreateNewBoard).not.toHaveBeenCalled();
    expect(onLeaveBoard).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
