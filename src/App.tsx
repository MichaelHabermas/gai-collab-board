import { useState, useEffect, useRef, useCallback, type ReactElement } from 'react';
import { useAuth } from '@/modules/auth';
import { AuthPage } from '@/components/auth/AuthPage';
import { Button } from '@/components/ui/button';
import { ShareDialog } from '@/components/board/ShareDialog';
import { BoardListSidebar } from '@/components/board/BoardListSidebar';
import { LogOut, Loader2, Share2, Sun, Moon } from 'lucide-react';
import { BoardCanvas } from '@/components/canvas/BoardCanvas';
import { useObjects } from '@/hooks/useObjects';
import { useAI } from '@/hooks/useAI';
import {
  createBoard,
  subscribeToBoard,
  canUserEdit,
  addBoardMember,
} from '@/modules/sync/boardService';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { PresenceAvatars } from '@/components/presence/PresenceAvatars';
import { usePresence } from '@/hooks/usePresence';
import { AIChatPanel } from '@/components/ai/AIChatPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/hooks/useTheme';
import type { IBoard } from '@/types';

const DEFAULT_BOARD_ID = 'dev-board-001';

interface IBoardViewProps {
  boardId: string;
  onSelectBoard: (boardId: string) => void;
  onCreateNewBoard: () => Promise<IBoard>;
  defaultBoardId: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const BoardView = ({
  boardId,
  onSelectBoard,
  onCreateNewBoard,
  defaultBoardId,
  theme,
  onToggleTheme,
}: IBoardViewProps): ReactElement => {
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
  } = useObjects({ boardId, user });

  const { onlineUsers } = usePresence({
    boardId,
    user,
  });

  const ai = useAI({
    boardId,
    user,
    objects,
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

  // Create board if it doesn't exist (only for the default dev board; do not overwrite newly created boards)
  useEffect(() => {
    const initBoard = async () => {
      if (boardId === defaultBoardId && !boardLoading && !board && user) {
        try {
          await createBoard({
            id: boardId,
            name: 'Development Board',
            ownerId: user.uid,
          });
        } catch {
          // Board might already exist or creation failed
        }
      }
    };
    initBoard();
  }, [boardId, defaultBoardId, boardLoading, board, user]);

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
            <Button
              variant='ghost'
              size='sm'
              onClick={onToggleTheme}
              className='text-slate-300 hover:text-white hover:bg-slate-700'
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              data-testid='theme-toggle'
            >
              {theme === 'dark' ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
            </Button>
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

      {/* Canvas area and AI panel */}
      <main className='flex-1 flex relative min-w-0 min-h-0 overflow-hidden'>
        <div className='flex-1 relative min-w-0'>
          <BoardCanvas
            boardId={boardId}
            user={user}
            objects={objects}
            canEdit={canEdit}
            onObjectUpdate={updateObject}
            onObjectCreate={createObject}
            onObjectDelete={deleteObject}
          />
        </div>
        {canEdit && (
          <aside
            className='shrink-0 w-80 border-l border-slate-700 bg-slate-800/50 p-2 flex flex-col min-h-0 overflow-hidden'
            data-testid='sidebar'
          >
            <Tabs defaultValue='boards' className='flex flex-col min-h-0 flex-1 overflow-hidden'>
              <TabsList className='w-full grid grid-cols-2 bg-slate-700/50'>
                <TabsTrigger value='boards' className='data-[state=active]:bg-slate-700'>
                  Boards
                </TabsTrigger>
                <TabsTrigger value='ai' className='data-[state=active]:bg-slate-700'>
                  AI
                </TabsTrigger>
              </TabsList>
              <TabsContent value='boards' className='flex-1 min-h-0 mt-2 overflow-auto'>
                <BoardListSidebar
                  user={user}
                  currentBoardId={boardId}
                  onSelectBoard={onSelectBoard}
                  onCreateNewBoard={onCreateNewBoard}
                />
              </TabsContent>
              <TabsContent value='ai' className='flex-1 min-h-0 mt-2 overflow-hidden flex flex-col'>
                <AIChatPanel
                  messages={ai.messages}
                  loading={ai.loading}
                  error={ai.error}
                  onSend={ai.processCommand}
                  onClearError={ai.clearError}
                  onClearMessages={ai.clearMessages}
                />
              </TabsContent>
            </Tabs>
          </aside>
        )}
      </main>
    </div>
  );
};

export const App = (): ReactElement => {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentBoardId, setCurrentBoardId] = useState<string>(DEFAULT_BOARD_ID);

  const handleCreateNewBoard = useCallback(async (): Promise<IBoard> => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    const board = await createBoard({
      name: 'Untitled Board',
      ownerId: user.uid,
    });
    setCurrentBoardId(board.id);
    return board;
  }, [user]);

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

  return (
    <BoardView
      boardId={currentBoardId}
      onSelectBoard={setCurrentBoardId}
      onCreateNewBoard={handleCreateNewBoard}
      defaultBoardId={DEFAULT_BOARD_ID}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
};
