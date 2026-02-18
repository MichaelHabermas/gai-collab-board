import { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  IPresenceData,
  updatePresence,
  subscribeToPresence,
  removePresence,
  setupPresenceDisconnectHandler,
  getUserColor,
} from '@/modules/sync/realtimeService';

interface IUsePresenceParams {
  boardId: string | null;
  user: User | null;
}

interface IUsePresenceReturn {
  onlineUsers: IPresenceData[];
  currentUserColor: string;
}

/**
 * Hook for managing user presence on a board.
 * Tracks which users are currently online and assigns consistent colors.
 */
export const usePresence = ({ boardId, user }: IUsePresenceParams): IUsePresenceReturn => {
  const [presenceMap, setPresenceMap] = useState<Record<string, IPresenceData>>({});

  // Generate consistent color for user
  const userId = user?.uid;
  const currentUserColor = useMemo(() => {
    return userId ? getUserColor(userId) : '#6b7280';
  }, [userId]);

  // Subscribe to presence updates and set up disconnect cleanup once per board/user
  useEffect(() => {
    if (!boardId || !user?.uid) {
      return;
    }

    // Setup disconnect handler so presence is removed if user disconnects
    setupPresenceDisconnectHandler(boardId, user.uid);

    // Subscribe to all presence on the board
    // The subscription callback will replace the entire presence state,
    // so no need to reset synchronously
    const unsubscribe = subscribeToPresence(boardId, (presenceData) => {
      setPresenceMap(presenceData);
    });

    // Cleanup: remove presence and unsubscribe
    return () => {
      unsubscribe();
      removePresence(boardId, user.uid);
    };
  }, [boardId, user?.uid]);

  // Update own presence when mutable user profile details change
  useEffect(() => {
    if (!boardId || !user?.uid) {
      return;
    }

    const displayName = user.displayName || user.email?.split('@')[0] || 'Anonymous';
    const {photoURL} = user;
    Promise.resolve(
      updatePresence(boardId, user.uid, displayName, photoURL, currentUserColor)
    ).catch(() => {
      // Presence updates are best-effort; subscription remains active for retries on next change.
    });
  }, [boardId, user?.uid, user?.displayName, user?.email, user?.photoURL, currentUserColor]);

  // Convert presence map to sorted array of online users
  const onlineUsers = useMemo(() => {
    return Object.values(presenceMap)
      .filter((presence) => presence.online)
      .sort((a, b) => a.lastSeen - b.lastSeen);
  }, [presenceMap]);

  return {
    onlineUsers,
    currentUserColor,
  };
};
