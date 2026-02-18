import { useState, useEffect, useRef } from 'react';
import { IBoard, UserRole } from '@/types';
import { subscribeToBoard, getUserRole, canUserEdit, canUserManage } from '@/modules/sync';
import { useAuth } from './useAuth';

interface IUseCanEditReturn {
  role: UserRole | null;
  canEdit: boolean;
  canManage: boolean;
  isOwner: boolean;
  isMember: boolean;
  loading: boolean;
}

export const useCanEdit = (boardId: string | null): IUseCanEditReturn => {
  const { user } = useAuth();

  const [board, setBoard] = useState<IBoard | null>(null);
  const [loading, setLoading] = useState<boolean>(!!boardId);
  const isFirstCallbackRef = useRef<boolean>(true);

  useEffect(() => {
    if (!boardId) {
      return;
    }

    // Mark that we're waiting for first callback to reset state
    isFirstCallbackRef.current = true;

    const unsubscribe = subscribeToBoard(boardId, (boardData) => {
      // Reset loading state on first callback after subscription
      if (isFirstCallbackRef.current) {
        isFirstCallbackRef.current = false;
      }

      setBoard(boardData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [boardId]);

  if (!user || !board) {
    return {
      role: null,
      canEdit: false,
      canManage: false,
      isOwner: false,
      isMember: false,
      loading,
    };
  }

  const role = getUserRole(board, user.uid);
  const isMember = role !== null;
  const isOwner = board.ownerId === user.uid;

  return {
    role,
    canEdit: canUserEdit(board, user.uid),
    canManage: canUserManage(board, user.uid),
    isOwner,
    isMember,
    loading,
  };
};
