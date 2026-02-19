import { useState, useEffect, useRef, useCallback, type ReactElement } from 'react';
import { useParams, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth';
import { AuthPage } from '@/components/auth/AuthPage';
import { WelcomePage } from '@/components/auth/WelcomePage';
import { Button } from '@/components/ui/button';
import { ShareDialog } from '@/components/board/ShareDialog';
import { BoardListSidebar } from '@/components/board/BoardListSidebar';
import { RightSidebar } from '@/components/board/RightSidebar';
import { LogOut, Loader2, Share2, Sun, Moon, Pencil, PanelLeft } from 'lucide-react';
import { BoardCanvas } from '@/components/canvas/BoardCanvas';
import { useObjects } from '@/hooks/useObjects';
import { useAI } from '@/hooks/useAI';
import {
  createBoard,
  subscribeToBoard,
  subscribeToUserBoards,
  canUserEdit,
  canUserManage,
  addBoardMember,
  updateBoardName,
} from '@/modules/sync/boardService';
import { updateRecentBoardIds, getUserPreferences } from '@/modules/sync/userPreferencesService';
import { getActiveBoardId } from '@/lib/activeBoard';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { PresenceAvatars } from '@/components/presence/PresenceAvatars';
import { usePresence } from '@/hooks/usePresence';
import { AIChatPanel } from '@/components/ai/AIChatPanel';
import { TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/hooks/useTheme';
import { useBoardSettings } from '@/hooks/useBoardSettings';
import { ViewportActionsContext } from '@/contexts/ViewportActionsContext';
import { SelectionProvider } from '@/contexts/SelectionProvider';
import { PropertyInspector } from '@/components/canvas/PropertyInspector';
import type { IBoard, IUserPreferences, IViewportActionsValue } from '@/types';

interface IBoardViewProps {
  boardId: string;
  onSelectBoard: (boardId: string) => void;
  onCreateNewBoard: (name?: string) => Promise<IBoard>;
  onLeaveBoard: (leftBoardId?: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onViewportActionsReady: (actions: IViewportActionsValue | null) => void;
  skipAutoJoinBoardIdRef?: React.MutableRefObject<string | null>;
}

const BoardView = ({
  boardId,
  onSelectBoard,
  onCreateNewBoard,
  onLeaveBoard,
  theme,
  onToggleTheme,
  onViewportActionsReady,
  skipAutoJoinBoardIdRef,
}: IBoardViewProps): ReactElement => {
  const { user, signOut } = useAuth();
  const [board, setBoard] = useState<IBoard | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [headerRenameOpen, setHeaderRenameOpen] = useState(false);
  const [headerRenameName, setHeaderRenameName] = useState<string>('');
  const joinedBoardIdsRef = useRef<Set<string>>(new Set());

  const {
    objects,
    loading: objectsLoading,
    createObject,
    updateObject,
    updateObjects,
    deleteObject,
    deleteObjects,
  } = useObjects({ boardId, user });

  const { onlineUsers } = usePresence({ boardId, user });
  const ai = useAI({ boardId, user, objects });
  const { sidebarTab, setSidebarTab, sidebarCollapsed, setSidebarCollapsed } =
    useBoardSettings(boardId);

  // Subscribe to board data
  useEffect(() => {
    if (!boardId) return;

    const unsubscribe = subscribeToBoard(boardId, (boardData) => {
      setBoard(boardData);
      setBoardLoading(false);
    });

    return () => unsubscribe();
  }, [boardId]);

  // When opening a board the user is not a member of, add them as viewer
  useEffect(() => {
    if (skipAutoJoinBoardIdRef?.current === boardId) {
      skipAutoJoinBoardIdRef.current = null;
      return;
    }
    if (!board || !user || user.uid in board.members || joinedBoardIdsRef.current.has(boardId)) {
      return;
    }

    joinedBoardIdsRef.current.add(boardId);
    addBoardMember(boardId, user.uid, 'viewer').catch(() => {
      joinedBoardIdsRef.current.delete(boardId);
    });
  }, [board, user, boardId, skipAutoJoinBoardIdRef]);

  if (!user) return <div />;

  if (boardLoading || objectsLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin text-primary mx-auto mb-4' />
          <p className='text-muted-foreground'>Loading board...</p>
        </div>
      </div>
    );
  }

  // Check if user can edit - default to true for authenticated users if board doesn't exist yet
  // This allows the first user to create objects while the board is being created
  const canEdit = board ? canUserEdit(board, user.uid) : true;

  return (
    <div className='h-screen flex flex-col bg-background overflow-hidden'>
      {/* Header */}
      <header className='shrink-0 border-b border-border bg-card/90 backdrop-blur-sm z-10'>
        <div className='px-4 py-2 flex items-center justify-between gap-6'>
          <div className='flex items-center gap-4'>
            <h1 className='text-lg font-bold text-foreground'>CollabBoard</h1>
            {board && canUserManage(board, user.uid) ? (
              <div className='flex items-center gap-1'>
                <span className='text-sm text-muted-foreground'>
                  {board.name || 'Untitled Board'}
                </span>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-accent'
                  onClick={() => {
                    setHeaderRenameName(board.name || 'Untitled Board');
                    setHeaderRenameOpen(true);
                  }}
                  title='Rename board'
                  data-testid='header-rename-board'
                >
                  <Pencil className='h-3.5 w-3.5' aria-hidden />
                </Button>
              </div>
            ) : (
              <span className='text-sm text-muted-foreground'>
                {board?.name || 'Untitled Board'}
              </span>
            )}
            <Dialog open={headerRenameOpen} onOpenChange={setHeaderRenameOpen}>
              <DialogContent className='bg-card border-border' aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle className='text-card-foreground'>Rename board</DialogTitle>
                  <DialogDescription className='sr-only'>
                    Enter a new name for the board.
                  </DialogDescription>
                </DialogHeader>
                <div className='grid gap-2 py-2'>
                  <Label htmlFor='header-rename-name' className='text-foreground'>
                    Board name
                  </Label>
                  <Input
                    id='header-rename-name'
                    value={headerRenameName}
                    onChange={(e) => setHeaderRenameName(e.target.value)}
                    className='bg-muted border-border text-foreground'
                    data-testid='header-rename-name-input'
                    placeholder='Untitled Board'
                  />
                </div>
                <DialogFooter>
                  <Button variant='outline' size='sm' onClick={() => setHeaderRenameOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size='sm'
                    onClick={async () => {
                      const name = headerRenameName.trim() || 'Untitled Board';
                      await updateBoardName(boardId, name, user.uid);
                      setHeaderRenameOpen(false);
                    }}
                    data-testid='header-rename-submit'
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <ConnectionStatus />
            {board && (
              <ShareDialog board={board} currentUserId={user.uid} onLeaveBoard={onLeaveBoard}>
                <Button
                  variant='outline'
                  size='sm'
                  className='border-border text-foreground hover:bg-accent'
                >
                  <Share2 className='h-4 w-4 mr-2' />
                  Share
                </Button>
              </ShareDialog>
            )}
            {board && !canUserManage(board, user.uid) && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='border-border text-foreground hover:bg-accent'
                onClick={() => onLeaveBoard(boardId)}
                title='Leave board'
                data-testid='header-leave-board'
              >
                <PanelLeft className='h-4 w-4 mr-2' aria-hidden />
                Leave board
              </Button>
            )}
          </div>
          <div className='flex items-center gap-5'>
            <PresenceAvatars
              users={onlineUsers}
              currentUid={user.uid}
              roles={board?.members ?? {}}
            />
            <Button
              variant='ghost'
              size='sm'
              onClick={onToggleTheme}
              className='text-foreground hover:bg-accent'
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              data-testid='theme-toggle'
            >
              {theme === 'dark' ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
            </Button>
            <span className='text-sm text-muted-foreground'>{user.email}</span>
            <Button
              variant='ghost'
              size='sm'
              onClick={signOut}
              className='text-foreground hover:bg-accent'
            >
              <LogOut className='h-4 w-4 mr-2' />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Canvas area and sidebar */}
      <main className='flex-1 flex relative min-w-0 min-h-0 overflow-hidden'>
        <SelectionProvider>
          <div className='flex-1 relative min-w-0'>
            <BoardCanvas
              boardId={boardId}
              boardName={board?.name ?? 'Board'}
              user={user}
              objects={objects}
              canEdit={canEdit}
              onObjectUpdate={updateObject}
              onObjectsUpdate={updateObjects}
              onObjectCreate={createObject}
              onObjectDelete={deleteObject}
              onObjectsDeleteBatch={deleteObjects}
              onViewportActionsReady={onViewportActionsReady}
            />
          </div>
          <RightSidebar
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            sidebarTab={sidebarTab}
            setSidebarTab={setSidebarTab}
            boardsOnly={!canEdit}
            expandedContent={
              canEdit ? (
                <>
                  <TabsContent value='boards' className='flex-1 min-h-0 mt-2 overflow-auto'>
                    <BoardListSidebar
                      user={user}
                      currentBoardId={boardId}
                      onSelectBoard={onSelectBoard}
                      onCreateNewBoard={onCreateNewBoard}
                      onLeaveBoard={onLeaveBoard}
                    />
                  </TabsContent>
                  <TabsContent
                    value='properties'
                    className='flex flex-1 min-h-0 flex-col mt-2 overflow-auto'
                    data-testid='properties-tab-content'
                  >
                    <PropertyInspector objects={objects} onObjectUpdate={updateObject} />
                  </TabsContent>
                  <TabsContent
                    value='ai'
                    className='flex-1 min-h-0 mt-2 overflow-hidden flex flex-col'
                  >
                    <AIChatPanel
                      messages={ai.messages}
                      loading={ai.loading}
                      error={ai.error}
                      onSend={ai.processCommand}
                      onClearError={ai.clearError}
                      onClearMessages={ai.clearMessages}
                    />
                  </TabsContent>
                </>
              ) : (
                <TabsContent value='boards' className='flex-1 min-h-0 mt-2 overflow-auto'>
                  <BoardListSidebar
                    user={user}
                    currentBoardId={boardId}
                    onSelectBoard={onSelectBoard}
                    onCreateNewBoard={onCreateNewBoard}
                    onLeaveBoard={onLeaveBoard}
                  />
                </TabsContent>
              )
            }
          />
        </SelectionProvider>
      </main>
    </div>
  );
};

const ResolveActiveBoardRoute = (): ReactElement => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<IUserPreferences | null>(null);
  const [boards, setBoards] = useState<IBoard[] | null>(null);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    getUserPreferences(user.uid).then(setPreferences);
    const unsubscribe = subscribeToUserBoards(user.uid, (boardList) => {
      setBoards(boardList);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!preferences || !boards || !user || navigatedRef.current) {
      return;
    }

    const activeId = getActiveBoardId(boards, preferences, user.uid);
    navigatedRef.current = true;

    if (activeId) {
      navigate(`/board/${activeId}`, { replace: true });
      return;
    }

    if (boards.length === 0) {
      createBoard({ name: 'Untitled Board', ownerId: user.uid })
        .then((board) => {
          navigate(`/board/${board.id}`, { replace: true });
        })
        .catch(() => {
          navigatedRef.current = false;
        });
      return;
    }

    const firstBoard = boards[0];
    if (firstBoard) {
      navigate(`/board/${firstBoard.id}`, { replace: true });
    }
  }, [preferences, boards, user, navigate]);

  return (
    <div className='min-h-screen flex items-center justify-center bg-background'>
      <div className='text-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary mx-auto mb-4' />
        <p className='text-muted-foreground'>Loading...</p>
      </div>
    </div>
  );
};

const BoardViewRoute = (): ReactElement => {
  const { boardId: paramBoardId } = useParams<{ boardId: string }>();
  const boardId = paramBoardId ?? '';
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [viewportActions, setViewportActions] = useState<IViewportActionsValue | null>(null);
  const lastLeftBoardIdRef = useRef<string | null>(null);

  // Update recent boards when user opens a board (navigates to it)
  useEffect(() => {
    if (!user || !boardId) {
      return;
    }

    updateRecentBoardIds(user.uid, boardId).catch(() => {
      // Non-blocking; preferences update failure should not break the app
    });
  }, [user, boardId]);

  const handleSelectBoard = useCallback(
    (id: string) => {
      navigate(`/board/${id}`, { replace: false });
    },
    [navigate]
  );

  const handleCreateNewBoard = useCallback(
    async (name?: string): Promise<IBoard> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const boardName = (name?.trim() ?? '') || 'Untitled Board';
      const board = await createBoard({ name: boardName, ownerId: user.uid });

      navigate(`/board/${board.id}`, { replace: false });
      return board;
    },
    [user, navigate]
  );

  const handleLeaveBoard = useCallback(
    (leftBoardId?: string) => {
      lastLeftBoardIdRef.current = leftBoardId ?? null;
      navigate('/', { replace: false });
    },
    [navigate]
  );

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin text-primary mx-auto mb-4' />
          <p className='text-muted-foreground'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div />;
  }

  if (!paramBoardId) {
    return <Navigate to='/' replace />;
  }

  return (
    <ViewportActionsContext.Provider value={viewportActions}>
      <BoardView
        boardId={boardId}
        onSelectBoard={handleSelectBoard}
        onCreateNewBoard={handleCreateNewBoard}
        onLeaveBoard={handleLeaveBoard}
        theme={theme}
        onToggleTheme={toggleTheme}
        onViewportActionsReady={setViewportActions}
        skipAutoJoinBoardIdRef={lastLeftBoardIdRef}
      />
    </ViewportActionsContext.Provider>
  );
};

const LoggedOutBoardRedirect = (): ReactElement => {
  const { boardId } = useParams<{ boardId: string }>();
  return <Navigate to={`/login?returnUrl=/board/${boardId ?? ''}`} replace />;
};

export const App = (): ReactElement => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin text-primary mx-auto mb-4' />
          <p className='text-muted-foreground'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path='/' element={<WelcomePage />} />
        <Route path='/login' element={<AuthPage />} />
        <Route path='/board/:boardId' element={<LoggedOutBoardRedirect />} />
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path='/board/:boardId' element={<BoardViewRoute />} />
      <Route path='/login' element={<Navigate to='/' replace />} />
      <Route path='/' element={<ResolveActiveBoardRoute />} />
      <Route path='*' element={<ResolveActiveBoardRoute />} />
    </Routes>
  );
};
