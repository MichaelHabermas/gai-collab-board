import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User } from 'firebase/auth';
import type { Cursors } from '@/types';
import {
  updateCursor,
  subscribeToCursors,
  removeCursor,
  setupCursorDisconnectHandler,
  getUserColor,
} from '@/modules/sync/realtimeService';

interface IUseCursorsParams {
  boardId: string | null;
  user: User | null;
  /** Ref that is true while the canvas is being panned/dragged. Cursor writes are heavily throttled during pan. */
  isPanningRef?: React.RefObject<boolean>;
}

interface IUseCursorsReturn {
  cursors: Cursors;
  handleMouseMove: (x: number, y: number) => void;
}

const DEBOUNCE_MS = 16; // ~60fps
const PAN_THROTTLE_MS = 200; // Heavily throttled during pan — still updates, just less often

/**
 * Hook for managing cursor synchronization on a board.
 * Handles subscribing to other users' cursors and broadcasting own cursor position.
 */
export const useCursors = ({ boardId, user, isPanningRef }: IUseCursorsParams): IUseCursorsReturn => {
  const [cursors, setCursors] = useState<Cursors>({});
  const lastUpdateRef = useRef<number>(0);
  const userColor = useMemo(() => (user?.uid ? getUserColor(user.uid) : ''), [user]);

  // Subscribe to cursor updates and setup disconnect handler
  useEffect(() => {
    if (!boardId || !user?.uid) {
      return;
    }

    // Setup disconnect handler so cursor is removed if user disconnects
    setupCursorDisconnectHandler(boardId, user.uid);

    // Subscribe to all cursors on the board
    // The subscription callback will replace the entire cursors state, so no need to reset synchronously
    const unsubscribe = subscribeToCursors(boardId, (cursorData) => {
      setCursors(cursorData);
    });

    // Cleanup: remove cursor and unsubscribe
    return () => {
      unsubscribe();
      removeCursor(boardId, user.uid);
    };
  }, [boardId, user?.uid]);

  // Debounced mouse move handler — heavily throttled during pan to reduce writes
  const handleMouseMove = useCallback(
    (x: number, y: number) => {
      if (!boardId || !user) return;

      const panning = isPanningRef?.current ?? false;
      const throttle = panning ? PAN_THROTTLE_MS : DEBOUNCE_MS;

      const now = Date.now();
      if (now - lastUpdateRef.current < throttle) {
        return;
      }

      lastUpdateRef.current = now;

      const displayName = user.displayName || user.email?.split('@')[0] || 'Anonymous';

      updateCursor(boardId, user.uid, x, y, displayName, userColor);
    },
    [boardId, user, userColor, isPanningRef]
  );

  return {
    cursors,
    handleMouseMove,
  };
};
