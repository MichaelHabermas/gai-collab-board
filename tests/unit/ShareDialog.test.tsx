import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { ShareDialog } from '@/components/board/ShareDialog';
import type { IBoard } from '@/types';

const mockDeleteBoard = vi.fn();
const mockRemoveBoardMember = vi.fn();
const mockRemoveBoardIdFromPreferences = vi.fn();
const mockAddBoardMember = vi.fn();
const mockUpdateMemberRole = vi.fn();

vi.mock('@/modules/sync', () => ({
  deleteBoard: (boardId: string, userId: string) => mockDeleteBoard(boardId, userId),
  removeBoardMember: (boardId: string, userId: string) =>
    mockRemoveBoardMember(boardId, userId),
  removeBoardIdFromPreferences: (userId: string, boardId: string) =>
    mockRemoveBoardIdFromPreferences(userId, boardId),
  addBoardMember: (boardId: string, userId: string, role: string) =>
    mockAddBoardMember(boardId, userId, role),
  updateMemberRole: (boardId: string, userId: string, role: string) =>
    mockUpdateMemberRole(boardId, userId, role),
}));

vi.mock('@/lib/shareLink', () => ({
  getBoardShareLink: (boardId: string) => `https://app.example.com/board/${boardId}`,
}));

vi.mock('@/lib/firebase', () => ({ firestore: {}, realtimeDb: {} }));

const now = Timestamp.now();

function makeBoard(
  id: string,
  ownerId: string,
  extraMembers: Record<string, import('@/types').UserRole> = {}
): IBoard {
  return {
    id,
    name: 'Test Board',
    ownerId,
    members: { [ownerId]: 'owner', ...extraMembers },
    createdAt: now,
    updatedAt: now,
  };
}

function renderDialog(
  board: IBoard,
  currentUserId: string,
  onLeaveBoard?: (leftBoardId?: string) => void
) {
  const trigger = <button data-testid='open-dialog'>Open</button>;
  return render(
    <ShareDialog board={board} currentUserId={currentUserId} onLeaveBoard={onLeaveBoard}>
      {trigger}
    </ShareDialog>
  );
}

describe('ShareDialog – owner vs non-owner actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteBoard.mockResolvedValue(undefined);
    mockRemoveBoardMember.mockResolvedValue(undefined);
    mockRemoveBoardIdFromPreferences.mockResolvedValue(undefined);
  });

  it('owner sees Delete board button; non-owner does not', async () => {
    const ownerBoard = makeBoard('board-1', 'owner-uid');

    renderDialog(ownerBoard, 'owner-uid');
    fireEvent.click(screen.getByTestId('open-dialog'));

    await waitFor(() => {
      expect(screen.getByTestId('share-dialog-delete-board')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('share-dialog-leave-board')).not.toBeInTheDocument();
  });

  it('non-owner sees Leave board button; owner does not see Leave', async () => {
    const board = makeBoard('board-1', 'owner-uid', { 'editor-uid': 'editor' });

    renderDialog(board, 'editor-uid', vi.fn());
    fireEvent.click(screen.getByTestId('open-dialog'));

    await waitFor(() => {
      expect(screen.getByTestId('share-dialog-leave-board')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('share-dialog-delete-board')).not.toBeInTheDocument();
  });
});

describe('ShareDialog – owner Delete board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteBoard.mockResolvedValue(undefined);
  });

  it('owner Delete board calls deleteBoard and fires onLeaveBoard with boardId', async () => {
    const board = makeBoard('board-1', 'owner-uid');
    const onLeaveBoard = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderDialog(board, 'owner-uid', onLeaveBoard);
    fireEvent.click(screen.getByTestId('open-dialog'));

    await waitFor(() =>
      expect(screen.getByTestId('share-dialog-delete-board')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('share-dialog-delete-board'));

    await waitFor(() => {
      expect(mockDeleteBoard).toHaveBeenCalledWith('board-1', 'owner-uid');
    });
    expect(onLeaveBoard).toHaveBeenCalledWith('board-1');
    confirmSpy.mockRestore();
  });

  it('owner Delete board aborted when confirm is cancelled', async () => {
    const board = makeBoard('board-1', 'owner-uid');
    const onLeaveBoard = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderDialog(board, 'owner-uid', onLeaveBoard);
    fireEvent.click(screen.getByTestId('open-dialog'));

    await waitFor(() =>
      expect(screen.getByTestId('share-dialog-delete-board')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('share-dialog-delete-board'));

    await waitFor(() => {
      expect(mockDeleteBoard).not.toHaveBeenCalled();
    });
    expect(onLeaveBoard).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

describe('ShareDialog – non-owner Leave board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRemoveBoardMember.mockResolvedValue(undefined);
    mockRemoveBoardIdFromPreferences.mockResolvedValue(undefined);
  });

  it('Leave board calls removeBoardMember and removeBoardIdFromPreferences then onLeaveBoard', async () => {
    const board = makeBoard('board-1', 'owner-uid', { 'editor-uid': 'editor' });
    const onLeaveBoard = vi.fn();

    renderDialog(board, 'editor-uid', onLeaveBoard);
    fireEvent.click(screen.getByTestId('open-dialog'));

    await waitFor(() =>
      expect(screen.getByTestId('share-dialog-leave-board')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('share-dialog-leave-board'));

    await waitFor(() => {
      expect(mockRemoveBoardMember).toHaveBeenCalledWith('board-1', 'editor-uid');
    });
    expect(mockRemoveBoardIdFromPreferences).toHaveBeenCalledWith('editor-uid', 'board-1');
    expect(onLeaveBoard).toHaveBeenCalledWith('board-1');
  });

  it('viewer Leave board also calls removeBoardMember and fires onLeaveBoard', async () => {
    const board = makeBoard('board-1', 'owner-uid', { 'viewer-uid': 'viewer' });
    const onLeaveBoard = vi.fn();

    renderDialog(board, 'viewer-uid', onLeaveBoard);
    fireEvent.click(screen.getByTestId('open-dialog'));

    await waitFor(() =>
      expect(screen.getByTestId('share-dialog-leave-board')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('share-dialog-leave-board'));

    await waitFor(() => {
      expect(mockRemoveBoardMember).toHaveBeenCalledWith('board-1', 'viewer-uid');
    });
    expect(mockRemoveBoardIdFromPreferences).toHaveBeenCalledWith('viewer-uid', 'board-1');
    expect(onLeaveBoard).toHaveBeenCalledWith('board-1');
  });
});
