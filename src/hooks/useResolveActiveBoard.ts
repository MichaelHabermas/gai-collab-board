import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBoard } from '@/modules/sync/boardService';
import { getUserPreferences } from '@/modules/sync/userPreferencesService';
import { subscribeToUserBoards } from '@/modules/sync/boardService';
import { getActiveBoardId } from '@/lib/activeBoard';
import type { IBoard, IUserPreferences } from '@/types';
import type { User } from 'firebase/auth';

export function useResolveActiveBoard(user: User | null): void {
  const navigate = useNavigate();
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
}
