import { useState, useEffect, memo, type ReactElement } from 'react';
import { LayoutDashboard, Plus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subscribeToUserBoards, deleteBoard } from '@/modules/sync/boardService';
import type { IBoard } from '@/types';
import type { User } from 'firebase/auth';

interface IBoardListSidebarProps {
  user: User;
  currentBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onCreateNewBoard: () => Promise<IBoard>;
}

export const BoardListSidebar = memo(
  ({
    user,
    currentBoardId,
    onSelectBoard,
    onCreateNewBoard,
  }: IBoardListSidebarProps): ReactElement => {
    const [boards, setBoards] = useState<IBoard[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string>('');

    useEffect(() => {
      const unsubscribe = subscribeToUserBoards(user.uid, (userBoards) => {
        setBoards(userBoards);
        setLoading(false);
      });
      return () => unsubscribe();
    }, [user.uid]);

    const handleCreateNew = async () => {
      setCreating(true);
      try {
        const newBoard = await onCreateNewBoard();
        setBoards((prev) => [...prev, newBoard]);
        onSelectBoard(newBoard.id);
      } finally {
        setCreating(false);
      }
    };

    const handleDeleteBoard = async (boardId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (
        !window.confirm(
          'Are you sure you want to delete this board? All board content will be removed. This cannot be undone.'
        )
      ) {
        return;
      }
      setDeleteError('');
      setDeletingBoardId(boardId);
      try {
        await deleteBoard(boardId, user.uid);
        const wasCurrent = boardId === currentBoardId;
        const others = boards.filter((b) => b.id !== boardId);
        setBoards(others);
        if (wasCurrent) {
          const firstOther = others[0];
          if (firstOther) {
            onSelectBoard(firstOther.id);
          } else {
            const newBoard = await onCreateNewBoard();
            setBoards((prev) => [...prev, newBoard]);
            onSelectBoard(newBoard.id);
          }
        }
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete board');
      } finally {
        setDeletingBoardId(null);
      }
    };

    if (loading) {
      return (
        <div
          className='flex items-center justify-center py-8 text-slate-400'
          data-testid='board-list-loading'
        >
          <Loader2 className='h-6 w-6 animate-spin' />
        </div>
      );
    }

    return (
      <div className='flex flex-col gap-2' data-testid='board-list-sidebar'>
        <Button
          variant='outline'
          size='sm'
          className='w-full justify-start gap-2 border-slate-600 text-slate-200 hover:bg-slate-700'
          onClick={handleCreateNew}
          disabled={creating}
          data-testid='board-list-new-board'
        >
          <Plus className='h-4 w-4' />
          {creating ? 'Creating…' : 'New board'}
        </Button>
        {deleteError && (
          <p className='text-sm text-red-400' role='alert'>
            {deleteError}
          </p>
        )}
        <ul className='flex flex-col gap-1 overflow-auto min-h-0'>
          {boards.map((board) => {
            const isCurrent = board.id === currentBoardId;
            const isOwner = board.ownerId === user.uid;
            const isDeleting = deletingBoardId === board.id;
            return (
              <li key={board.id}>
                <div
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors group
                    ${isCurrent ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50'}
                  `}
                >
                  <button
                    type='button'
                    onClick={() => onSelectBoard(board.id)}
                    className='flex items-center gap-2 flex-1 min-w-0 text-left'
                    data-testid={`board-list-item-${board.id}`}
                  >
                    <LayoutDashboard className='h-4 w-4 shrink-0' />
                    <span className='truncate'>{board.name || 'Untitled Board'}</span>
                  </button>
                  {isOwner && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 shrink-0 text-slate-400 hover:text-red-400 hover:bg-red-900/20'
                      onClick={(e) => handleDeleteBoard(board.id, e)}
                      disabled={isDeleting}
                      title='Delete board'
                      data-testid={`board-list-delete-${board.id}`}
                    >
                      {isDeleting ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Trash2 className='h-4 w-4' />
                      )}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
);

BoardListSidebar.displayName = 'BoardListSidebar';
