import { useState, useEffect } from 'react';
import { subscribeToBoard } from '@/modules/sync/boardService';
import type { IBoard } from '@/types';

export function useBoardSubscription(boardId: string): {
  board: IBoard | null;
  setBoard: (board: IBoard | null) => void;
  boardLoading: boolean;
  setBoardLoading: (loading: boolean) => void;
} {
  const [board, setBoard] = useState<IBoard | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);

  useEffect(() => {
    if (!boardId) return;

    const unsubscribe = subscribeToBoard(boardId, (boardData) => {
      setBoard(boardData);
      setBoardLoading(false);
    });

    return () => unsubscribe();
  }, [boardId]);

  return { board, setBoard, boardLoading, setBoardLoading };
}
