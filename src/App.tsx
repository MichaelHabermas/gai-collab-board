import { useState, useEffect, useRef, type ReactElement } from 'react';
import { useAuth } from '@/modules/auth';
import { AuthPage } from '@/components/auth/AuthPage';
import { Button } from '@/components/ui/button';
import { ShareDialog } from '@/components/board/ShareDialog';
import { LogOut, Loader2, Share2 } from 'lucide-react';
import { BoardCanvas } from '@/components/canvas/BoardCanvas';
import { useObjects } from '@/hooks/useObjects';
import {
  createBoard,
  subscribeToBoard,
  canUserEdit,
  addBoardMember,
} from '@/modules/sync/boardService';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { PresenceAvatars } from '@/components/presence/PresenceAvatars';
import { usePresence } from '@/hooks/usePresence';
import type { IBoard } from '@/types';

// Temporary board ID for development - will be replaced with board selection UI
const DEV_BOARD_ID = 'dev-board-001';

const BoardView = ({ boardId }: { boardId: string }): ReactElement => {
  const { user, signOut } = useAuth();
  const [board, setBoard] = useState<IBoard | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const joinedBoardIdsRef = useRef<Set<string>>(new Set());

  const {
    objects,
    loading: objectsLoading,
    createObject,
    updateObject,
    deleteObject,
  } = useObjects({
    boardId,
    user,
  });

  const { onlineUsers } = usePresence({
    boardId,
    user,
  });

  // Subscribe to board data
  useEffect(() => {
    if (!boardId) return;

    const unsubscribe = subscribeToBoard(boardId, (boardData) => {
      setBoard(boardData);
      setBoardLoading(false);
    });

    return () => unsubscribe();
  }, [boardId]);

  // Create board if it doesn't exist (development helper)
  useEffect(() => {
    const initBoard = async () => {
      if (!boardLoading && !board && user) {
        try {
          await createBoard({
            id: boardId, // Use the specified board ID
            name: 'Development Board',
            ownerId: user.uid,
          });
        } catch {
          // Board might already exist or creation failed
        }
      }
    };
    initBoard();
  }, [boardLoading, board, user, boardId]);

  // When opening a board the user is not a member of, add them as editor so they can view and edit
  useEffect(() => {
    if (!board || !user || user.uid in board.members || joinedBoardIdsRef.current.has(boardId)) {
      return;
    }
    joinedBoardIdsRef.current.add(boardId);
    addBoardMember(boardId, user.uid, 'editor').catch(() => {
      joinedBoardIdsRef.current.delete(boardId);
    });
  }, [board, user, boardId]);

  if (!user) return <div />;

  if (boardLoading || objectsLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-slate-900'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin text-primary mx-auto mb-4' />
          <p className='text-slate-400'>Loading board...</p>
        </div>
      </div>
    );
  }

  // Check if user can edit - default to true for authenticated users if board doesn't exist yet
  // This allows the first user to create objects while the board is being created
  const canEdit = board ? canUserEdit(board, user.uid) : true;

  return (
    <div className='h-screen flex flex-col bg-slate-900 overflow-hidden'>
      {/* Header */}
      <header className='shrink-0 border-b border-slate-700 bg-slate-800/90 backdrop-blur-sm z-10'>
        <div className='px-4 py-2 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <h1 className='text-lg font-bold text-white'>CollabBoard</h1>
            <span className='text-sm text-slate-400'>{board?.name || 'Untitled Board'}</span>
            <ConnectionStatus />
            {board && (
              <ShareDialog board={board} currentUserId={user.uid}>
                <Button
                  variant='outline'
                  size='sm'
                  className='border-slate-600 text-slate-300 hover:bg-slate-700'
                >
                  <Share2 className='h-4 w-4 mr-2' />
                  Share
                </Button>
              </ShareDialog>
            )}
          </div>
          <div className='flex items-center gap-4'>
            <PresenceAvatars
              users={onlineUsers}
              currentUid={user.uid}
              roles={board?.members ?? {}}
            />
            <span className='text-sm text-slate-400'>{user.email}</span>
            <Button
              variant='ghost'
              size='sm'
              onClick={signOut}
              className='text-slate-300 hover:text-white hover:bg-slate-700'
            >
              <LogOut className='h-4 w-4 mr-2' />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Canvas area */}
      <main className='flex-1 relative'>
        <BoardCanvas
          boardId={boardId}
          user={user}
          objects={objects}
          canEdit={canEdit}
          onObjectUpdate={updateObject}
          onObjectCreate={createObject}
          onObjectDelete={deleteObject}
        />
      </main>
    </div>
  );
};

export const App = (): ReactElement => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-slate-900'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin text-primary mx-auto mb-4' />
          <p className='text-slate-400'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <BoardView boardId={DEV_BOARD_ID} />;
};
