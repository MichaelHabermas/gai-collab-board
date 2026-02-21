import { useState, useEffect } from 'react';
import { subscribeToBoard } from '@/modules/sync/boardService';
import type { IBoard } from '@/types';

export function useBoardSubscription(boardId: string): {
  board: IBoard | null;
  setBoard: (board: IBoard | null) => void;
  boardLoading: boolean;
  setBoardLoading: (loading: boolean) => void;
  boardError: Error | null;
} {
  const [board, setBoard] = useState<IBoard | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState<Error | null>(null);

  useEffect(() => {
    if (!boardId) return;

    const unsubscribe = subscribeToBoard(
      boardId,
      (boardData) => {
        setBoard(boardData);
        setBoardLoading(false);
        setBoardError(null);
      },
      (error) => {
        console.error('Board subscription error:', error);
        setBoardError(error);
        setBoardLoading(false);
      }
    );

    return () => unsubscribe();
  }, [boardId]);

  return { board, setBoard, boardLoading, setBoardLoading, boardError };
}
