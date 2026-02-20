import { useEffect } from 'react';
import { updateRecentBoardIds } from '@/modules/sync/userPreferencesService';
import type { User } from 'firebase/auth';

export function useRecentBoardUpdate(user: User | null, boardId: string): void {
  useEffect(() => {
    if (!user || !boardId) {
      return;
    }

    updateRecentBoardIds(user.uid, boardId).catch(() => {
      // Non-blocking; preferences update failure should not break the app
    });
  }, [user, boardId]);
}
