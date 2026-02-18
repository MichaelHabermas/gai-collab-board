import { useState, useEffect, memo, useMemo, useCallback, type ReactElement } from 'react';
import { LayoutDashboard, Plus, Loader2, Trash2, Star, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  subscribeToUserBoards,
  deleteBoard,
  updateBoardName,
  canUserEdit,
} from '@/modules/sync/boardService';
import {
  subscribeToUserPreferences,
  toggleFavoriteBoardId,
  removeBoardIdFromPreferences,
} from '@/modules/sync/userPreferencesService';
import { cn } from '@/lib/utils';
import { useBoardSettings } from '@/hooks/useBoardSettings';
import type { IBoard } from '@/types';
import type { IUserPreferences } from '@/types';
import type { User } from 'firebase/auth';

/** Board list item for display (full board or id+name only for recent/favorites) */
interface IBoardListItem {
  id: string;
  name: string;
  board: IBoard | null;
}

interface IBoardListSidebarProps {
  user: User;
  currentBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onCreateNewBoard: (name?: string) => Promise<IBoard>;
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
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createBoardName, setCreateBoardName] = useState<string>('Untitled Board');
    const [renameBoardId, setRenameBoardId] = useState<string | null>(null);
    const [renameBoardName, setRenameBoardName] = useState<string>('');
    const [renameError, setRenameError] = useState<string>('');
    const [preferences, setPreferences] = useState<IUserPreferences>({
      recentBoardIds: [],
      favoriteBoardIds: [],
    });
    const { boardListFilter, setBoardListFilter } = useBoardSettings(currentBoardId);

    useEffect(() => {
      const unsubscribe = subscribeToUserBoards(user.uid, (userBoards) => {
        setBoards(userBoards);
        setLoading(false);
      });
      return () => unsubscribe();
    }, [user.uid]);

    useEffect(() => {
      const unsubscribe = subscribeToUserPreferences(user.uid, (prefs) => {
        setPreferences(prefs);
      });
      return () => unsubscribe();
    }, [user.uid]);

    const handleToggleFavorite = (boardId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      toggleFavoriteBoardId(user.uid, boardId).catch(() => {
        // Non-blocking; UI will reflect on next subscription update
      });
    };

    const handleOpenCreateDialog = useCallback(() => {
      setCreateBoardName('Untitled Board');
      setCreateDialogOpen(true);
    }, []);

    const handleCreateNew = useCallback(async () => {
      setCreating(true);
      try {
        const name = createBoardName.trim() || 'Untitled Board';
        const newBoard = await onCreateNewBoard(name);
        setCreateDialogOpen(false);
        onSelectBoard(newBoard.id);
      } finally {
        setCreating(false);
      }
    }, [createBoardName, onCreateNewBoard, onSelectBoard]);

    const handleOpenRename = useCallback(
      (item: IBoardListItem) => {
        if (item.board && canUserEdit(item.board, user.uid)) {
          setRenameBoardId(item.id);
          setRenameBoardName(item.name);
          setRenameError('');
        }
      },
      [user.uid]
    );

    const handleRenameSave = useCallback(async () => {
      if (renameBoardId === null) {
        return;
      }
      const name = renameBoardName.trim() || 'Untitled Board';
      setRenameError('');
      try {
        await updateBoardName(renameBoardId, name);
        setRenameBoardId(null);
      } catch (err) {
        setRenameError(err instanceof Error ? err.message : 'Failed to rename board');
      }
    }, [renameBoardId, renameBoardName]);

    const handleRenameDialogClose = useCallback((open: boolean) => {
      if (!open) {
        setRenameBoardId(null);
        setRenameError('');
      }
    }, []);

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
        await removeBoardIdFromPreferences(user.uid, boardId);
        const wasCurrent = boardId === currentBoardId;
        if (wasCurrent) {
          const others = boards.filter((b) => b.id !== boardId);
          const firstOther = others[0];
          if (firstOther) {
            onSelectBoard(firstOther.id);
          } else {
            const newBoard = await onCreateNewBoard();
            onSelectBoard(newBoard.id);
          }
        }
        // List updates from subscribeToUserBoards when Firestore snapshot excludes the deleted board
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete board');
      } finally {
        setDeletingBoardId(null);
      }
    };

    const boardsById = useMemo(() => {
      const map = new Map<string, IBoard>();
      for (const b of boards) {
        map.set(b.id, b);
      }
      return map;
    }, [boards]);

    const allBoardItems: IBoardListItem[] = useMemo(() => {
      return Array.from(boardsById.values()).map((b) => ({
        id: b.id,
        name: b.name || 'Untitled Board',
        board: b,
      }));
    }, [boardsById]);

    const recentBoardItems: IBoardListItem[] = useMemo(() => {
      return preferences.recentBoardIds.map((id) => {
        const b = boardsById.get(id);
        return {
          id,
          name: b?.name || 'Untitled Board',
          board: b ?? null,
        };
      });
    }, [preferences.recentBoardIds, boardsById]);

    const favoriteBoardItems: IBoardListItem[] = useMemo(() => {
      const uniqueFavoriteIds = Array.from(new Set(preferences.favoriteBoardIds));
      const idsInBoardList = uniqueFavoriteIds.filter((id) => boardsById.has(id));
      return idsInBoardList.map((id) => {
        const b = boardsById.get(id);
        return {
          id,
          name: b?.name || 'Untitled Board',
          board: b ?? null,
        };
      });
    }, [preferences.favoriteBoardIds, boardsById]);

    const renderBoardRow = (item: IBoardListItem) => {
      const isCurrent = item.id === currentBoardId;
      const isOwner = item.board ? item.board.ownerId === user.uid : false;
      const canEditBoard = item.board ? canUserEdit(item.board, user.uid) : false;
      const isDeleting = deletingBoardId === item.id;
      const isFavorite = preferences.favoriteBoardIds.includes(item.id);
      return (
        <li key={item.id}>
          <div
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors group',
              isCurrent ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'
            )}
          >
            <button
              type='button'
              onClick={() => onSelectBoard(item.id)}
              className='flex items-center gap-2 flex-1 min-w-0 text-left'
              data-testid={`board-list-item-${item.id}`}
            >
              <LayoutDashboard className='h-4 w-4 shrink-0' />
              <span className='truncate'>{item.name}</span>
            </button>
            {canEditBoard && (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent'
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenRename(item);
                }}
                title='Rename board'
                data-testid={`board-list-rename-${item.id}`}
              >
                <Pencil className='h-4 w-4' aria-hidden />
              </Button>
            )}
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className={cn(
                'h-8 w-8 shrink-0',
                isFavorite ? 'text-primary hover:text-primary/90' : 'text-muted-foreground hover:text-primary'
              )}
              onClick={(e) => handleToggleFavorite(item.id, e)}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              data-testid={`board-list-favorite-${item.id}`}
            >
              <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} aria-hidden />
            </Button>
            {isOwner && (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                onClick={(e) => handleDeleteBoard(item.id, e)}
                disabled={isDeleting}
                title='Delete board'
                data-testid={`board-list-delete-${item.id}`}
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
    };

    if (loading) {
      return (
        <div
          className='flex items-center justify-center py-8 text-muted-foreground'
          data-testid='board-list-loading'
        >
          <Loader2 className='h-6 w-6 animate-spin' />
        </div>
      );
    }

    return (
      <div
        className='flex flex-col gap-2 min-h-0 flex-1 flex overflow-hidden'
        data-testid='board-list-sidebar'
      >
        <Button
          variant='outline'
          size='sm'
          className='w-full justify-start gap-2 border-border text-foreground hover:bg-accent shrink-0'
          onClick={handleOpenCreateDialog}
          disabled={creating}
          data-testid='board-list-new-board'
        >
          <Plus className='h-4 w-4' />
          New board
        </Button>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className='bg-card border-border' aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className='text-card-foreground'>New board</DialogTitle>
              <DialogDescription className='sr-only'>
                Enter a name for the new board.
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-2 py-2'>
              <Label htmlFor='board-list-create-name' className='text-foreground'>
                Board name
              </Label>
              <Input
                id='board-list-create-name'
                value={createBoardName}
                onChange={(e) => setCreateBoardName(e.target.value)}
                className='bg-muted border-border text-foreground'
                data-testid='board-list-create-name-input'
                placeholder='Untitled Board'
              />
            </div>
            <DialogFooter>
              <Button variant='outline' size='sm' onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                size='sm'
                onClick={handleCreateNew}
                disabled={creating}
                data-testid='board-list-create-submit'
              >
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={renameBoardId !== null} onOpenChange={handleRenameDialogClose}>
          <DialogContent className='bg-card border-border' aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className='text-card-foreground'>Rename board</DialogTitle>
              <DialogDescription className='sr-only'>
                Enter a new name for the board.
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-2 py-2'>
              <Label htmlFor='board-list-rename-name' className='text-foreground'>
                Board name
              </Label>
              <Input
                id='board-list-rename-name'
                value={renameBoardName}
                onChange={(e) => setRenameBoardName(e.target.value)}
                className='bg-muted border-border text-foreground'
                data-testid='board-list-rename-name-input'
                placeholder='Untitled Board'
              />
              {renameError && (
                <p className='text-sm text-red-400' role='alert'>
                  {renameError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant='outline' size='sm' onClick={() => handleRenameDialogClose(false)}>
                Cancel
              </Button>
              <Button size='sm' onClick={handleRenameSave} data-testid='board-list-rename-submit'>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {deleteError && (
          <p className='text-sm text-red-400 shrink-0' role='alert'>
            {deleteError}
          </p>
        )}
        <Tabs value={boardListFilter} onValueChange={setBoardListFilter} className='flex-1 flex flex-col min-h-0 overflow-hidden'>
          <TabsList className='w-full grid grid-cols-3 shrink-0 bg-muted'>
            <TabsTrigger
              value='all'
              className='data-[state=active]:bg-accent data-[state=active]:text-accent-foreground'
              data-testid='board-list-tab-all'
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value='recent'
              className='data-[state=active]:bg-accent data-[state=active]:text-accent-foreground'
              data-testid='board-list-tab-recent'
            >
              Recent
            </TabsTrigger>
            <TabsTrigger
              value='favorites'
              className='data-[state=active]:bg-accent data-[state=active]:text-accent-foreground'
              data-testid='board-list-tab-favorites'
            >
              Favorites
            </TabsTrigger>
          </TabsList>
          <TabsContent value='all' className='flex-1 min-h-0 mt-2 overflow-auto'>
            <ul className='flex flex-col gap-1'>{allBoardItems.map(renderBoardRow)}</ul>
          </TabsContent>
          <TabsContent value='recent' className='flex-1 min-h-0 mt-2 overflow-auto' forceMount>
            <ul className='flex flex-col gap-1'>
              {recentBoardItems.length === 0 ? (
                <p className='text-sm text-muted-foreground py-4' data-testid='board-list-recent-empty'>
                  No recently opened boards
                </p>
              ) : (
                recentBoardItems.map(renderBoardRow)
              )}
            </ul>
          </TabsContent>
          <TabsContent
            value='favorites'
            className='flex-1 min-h-0 mt-2 overflow-auto'
            forceMount
            data-testid='board-list-favorites-content'
          >
            <ul className='flex flex-col gap-1'>
              {favoriteBoardItems.length === 0 ? (
                <p className='text-sm text-muted-foreground py-4' data-testid='board-list-favorites-empty'>
                  No favorite boards
                </p>
              ) : (
                favoriteBoardItems.map(renderBoardRow)
              )}
            </ul>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
);

BoardListSidebar.displayName = 'BoardListSidebar';
