import { useState, useEffect, memo, type ReactElement } from 'react';
import { LayoutDashboard, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subscribeToUserBoards } from '@/modules/sync/boardService';
import type { IBoard } from '@/types';
import type { User } from 'firebase/auth';

interface IBoardListSidebarProps {
  user: User;
  currentBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onCreateNewBoard: () => Promise<string>;
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
        const newId = await onCreateNewBoard();
        onSelectBoard(newId);
      } finally {
        setCreating(false);
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
        <ul className='flex flex-col gap-1 overflow-auto min-h-0'>
          {boards.map((board) => {
            const isCurrent = board.id === currentBoardId;
            return (
              <li key={board.id}>
                <button
                  type='button'
                  onClick={() => onSelectBoard(board.id)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors
                    ${isCurrent ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50'}
                  `}
                  data-testid={`board-list-item-${board.id}`}
                >
                  <LayoutDashboard className='h-4 w-4 shrink-0' />
                  <span className='truncate'>{board.name || 'Untitled Board'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
);

BoardListSidebar.displayName = 'BoardListSidebar';
