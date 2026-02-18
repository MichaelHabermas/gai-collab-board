import type { IBoard } from '@/types';
import type { IUserPreferences } from '@/types';

/**
 * Resolves the "active" board id for a user: the board they own that they were on last,
 * or the last board they visited (any role), or the first board they own, or null.
 */
export function getActiveBoardId(
  boards: IBoard[],
  preferences: IUserPreferences,
  userId: string
): string | null {
  const boardsById = new Map(boards.map((b) => [b.id, b]));

  for (const id of preferences.recentBoardIds) {
    const board = boardsById.get(id);
    if (board && board.ownerId === userId) {
      return id;
    }
  }

  for (const id of preferences.recentBoardIds) {
    if (boardsById.has(id)) {
      return id;
    }
  }

  const firstOwned = boards.find((b) => b.ownerId === userId);
  return firstOwned ? firstOwned.id : null;
}
