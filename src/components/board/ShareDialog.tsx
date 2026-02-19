import { useState, ChangeEvent, ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getBoardShareLink } from '@/lib/shareLink';
import { IBoard, UserRole } from '@/types';
import {
  addBoardMember,
  removeBoardMember,
  updateMemberRole,
  deleteBoard,
  removeBoardIdFromPreferences,
} from '@/modules/sync';
import { Copy, Check, UserPlus, Trash2, Crown, Edit, Eye, Trash } from 'lucide-react';

interface ShareDialogProps {
  board: IBoard;
  currentUserId: string;
  onLeaveBoard?: (leftBoardId?: string) => void;
  children: ReactElement;
}

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_ICONS: Record<UserRole, ReactElement> = {
  owner: <Crown className='h-3 w-3' />,
  editor: <Edit className='h-3 w-3' />,
  viewer: <Eye className='h-3 w-3' />,
};

const ROLE_COLORS: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  editor: 'secondary',
  viewer: 'outline',
};

export const ShareDialog = ({
  board,
  currentUserId,
  onLeaveBoard,
  children,
}: ShareDialogProps): ReactElement => {
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('viewer');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [deleteInProgress, setDeleteInProgress] = useState<boolean>(false);
  const [leaveInProgress, setLeaveInProgress] = useState<boolean>(false);

  const isOwner = board.ownerId === currentUserId;
  const shareLink = getBoardShareLink(window.location.origin, board.id);

  const handleCopyLink = async (): Promise<void> => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddMember = async (): Promise<void> => {
    if (!newMemberEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // In a real app, you would look up the user by email
      // For now, we'll use a placeholder user ID
      const userId = `user_${newMemberEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await addBoardMember(board.id, userId, newMemberRole);
      setNewMemberEmail('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string): Promise<void> => {
    setIsLoading(true);
    try {
      await removeBoardMember(board.id, userId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      await updateMemberRole(board.id, userId, role);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBoard = async (): Promise<void> => {
    if (
      !confirm(
        'Are you sure you want to delete this board? All board content will be removed. This cannot be undone.'
      )
    ) {
      return;
    }

    setDeleteInProgress(true);
    setError('');
    try {
      await deleteBoard(board.id, currentUserId);
      onLeaveBoard?.(board.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleteInProgress(false);
    }
  };

  const handleLeaveBoard = async (): Promise<void> => {
    setLeaveInProgress(true);
    setError('');
    try {
      await removeBoardMember(board.id, currentUserId);
      await removeBoardIdFromPreferences(currentUserId, board.id);
      onLeaveBoard?.(board.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLeaveInProgress(false);
    }
  };

  const memberEntries = Object.entries(board.members);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='sm:max-w-md bg-slate-800 border-slate-700 text-white'>
        <DialogHeader>
          <DialogTitle>Share Board</DialogTitle>
          <DialogDescription className='text-slate-400'>
            Invite others to collaborate on &quot;{board.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Share Link */}
          <div className='space-y-2'>
            <Label className='text-slate-300'>Share Link</Label>
            <div className='flex gap-2'>
              <Input
                value={shareLink}
                readOnly
                className='bg-slate-700 border-slate-600 text-slate-200'
              />
              <Button
                type='button'
                variant='outline'
                size='icon'
                onClick={handleCopyLink}
                className='border-slate-600 hover:bg-slate-700'
              >
                {copied ? (
                  <Check className='h-4 w-4 text-green-500' />
                ) : (
                  <Copy className='h-4 w-4' />
                )}
              </Button>
            </div>
          </div>

          {/* Add Member */}
          {isOwner && (
            <div className='space-y-2'>
              <Label className='text-slate-300'>Add Member</Label>
              <div className='flex gap-2'>
                <Input
                  type='email'
                  placeholder='Enter email address'
                  value={newMemberEmail}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                    setNewMemberEmail(e.target.value)
                  }
                  className='bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500'
                  disabled={isLoading}
                />
                <Select
                  value={newMemberRole}
                  onValueChange={(value: string): void => setNewMemberRole(value as UserRole)}
                >
                  <SelectTrigger className='w-28 bg-slate-700 border-slate-600 text-slate-200'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className='bg-slate-700 border-slate-600'>
                    <SelectItem value='editor' className='text-slate-200'>
                      Editor
                    </SelectItem>
                    <SelectItem value='viewer' className='text-slate-200'>
                      Viewer
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button type='button' onClick={handleAddMember} disabled={isLoading} size='icon'>
                  <UserPlus className='h-4 w-4' />
                </Button>
              </div>
              {error && <p className='text-sm text-red-400'>{error}</p>}
            </div>
          )}

          {/* Members List */}
          <div className='space-y-2'>
            <Label className='text-slate-300'>Members ({memberEntries.length})</Label>
            <div className='space-y-2 max-h-48 overflow-y-auto'>
              {memberEntries.map(([userId, role]) => (
                <div
                  key={userId}
                  className='flex items-center justify-between p-2 rounded-md bg-slate-700/50'
                >
                  <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm'>
                      {userId.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className='text-sm text-slate-200'>{userId}</p>
                      <Badge variant={ROLE_COLORS[role]} className='text-xs gap-1'>
                        {ROLE_ICONS[role]}
                        {ROLE_LABELS[role]}
                      </Badge>
                    </div>
                  </div>
                  {isOwner && userId !== board.ownerId && (
                    <div className='flex items-center gap-2'>
                      <Select
                        value={role}
                        onValueChange={(value: string) =>
                          handleRoleChange(userId, value as UserRole)
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className='w-24 h-8 bg-slate-600 border-slate-500 text-slate-200 text-xs'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className='bg-slate-700 border-slate-600'>
                          <SelectItem value='editor' className='text-slate-200'>
                            Editor
                          </SelectItem>
                          <SelectItem value='viewer' className='text-slate-200'>
                            Viewer
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        onClick={() => handleRemoveMember(userId)}
                        disabled={isLoading}
                        className='h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leave board (non-owners) */}
          {!isOwner && onLeaveBoard && (
            <div className='pt-4 border-t border-slate-600'>
              <Button
                type='button'
                variant='outline'
                onClick={handleLeaveBoard}
                disabled={isLoading || leaveInProgress}
                className='w-full border-slate-600 hover:bg-slate-700'
              >
                Leave board
              </Button>
            </div>
          )}

          {/* Delete board (owners only) */}
          {isOwner && (
            <div className='pt-4 border-t border-slate-600'>
              <Button
                type='button'
                variant='destructive'
                onClick={handleDeleteBoard}
                disabled={isLoading || deleteInProgress}
                className='w-full'
              >
                <Trash className='h-4 w-4 mr-2' />
                Delete board
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
