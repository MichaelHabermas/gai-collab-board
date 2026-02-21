import { useEffect, type MutableRefObject } from 'react';
import { addBoardMember, isGuestBoard } from '@/modules/sync/boardService';
import type { IBoard } from '@/types';
import type { User } from 'firebase/auth';

interface IUseBoardAutoJoinParams {
  board: IBoard | null;
  user: User | null;
  boardId: string;
  joinedBoardIdsRef: MutableRefObject<Set<string>>;
  skipAutoJoinBoardIdRef?: MutableRefObject<string | null>;
}

export function useBoardAutoJoin({
  board,
  user,
  boardId,
  joinedBoardIdsRef,
  skipAutoJoinBoardIdRef,
}: IUseBoardAutoJoinParams): void {
  useEffect(() => {
    if (isGuestBoard(boardId)) {
      return;
    }

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
  }, [board, user, boardId, joinedBoardIdsRef, skipAutoJoinBoardIdRef]);
}
