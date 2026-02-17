import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!boardId) {
      setBoard(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToBoard(boardId, (boardData) => {
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
