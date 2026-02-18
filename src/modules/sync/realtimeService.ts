import { ref, set, onValue, onDisconnect, remove, Unsubscribe } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';
import type { Cursors, ICursorData, IPresenceData } from '@/types';

export type { ICursorData, IPresenceData };

// ============================================================================
// Cursor Types and Functions
// ============================================================================

/**
 * Updates the cursor position for a user in the Realtime Database.
 * Should be called with debouncing (16ms for 60fps).
 */
export const updateCursor = async (
  boardId: string,
  uid: string,
  x: number,
  y: number,
  displayName: string,
  color: string
): Promise<void> => {
  const cursorRef = ref(realtimeDb, `boards/${boardId}/cursors/${uid}`);
  await set(cursorRef, {
    uid,
    x,
    y,
    displayName,
    color,
    lastUpdated: Date.now(),
  });
};

/**
 * Subscribes to cursor updates for all users on a board.
 * Returns an unsubscribe function.
 */
export const subscribeToCursors = (
  boardId: string,
  callback: (cursors: Cursors) => void
): Unsubscribe => {
  const cursorsRef = ref(realtimeDb, `boards/${boardId}/cursors`);
  return onValue(cursorsRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
};

/**
 * Removes a user's cursor from the board.
 */
export const removeCursor = async (boardId: string, uid: string): Promise<void> => {
  const cursorRef = ref(realtimeDb, `boards/${boardId}/cursors/${uid}`);
  await remove(cursorRef);
};

/**
 * Sets up automatic cursor removal when user disconnects.
 * Should be called once when joining a board.
 */
export const setupCursorDisconnectHandler = (boardId: string, uid: string): void => {
  const cursorRef = ref(realtimeDb, `boards/${boardId}/cursors/${uid}`);
  onDisconnect(cursorRef).remove();
};

// ============================================================================
// Presence Types and Functions
// ============================================================================

/**
 * Updates the presence status for a user on a board.
 */
export const updatePresence = async (
  boardId: string,
  uid: string,
  displayName: string,
  photoURL: string | null,
  color: string
): Promise<void> => {
  const presenceRef = ref(realtimeDb, `boards/${boardId}/presence/${uid}`);
  await set(presenceRef, {
    uid,
    displayName,
    photoURL,
    color,
    online: true,
    lastSeen: Date.now(),
  });
};

/**
 * Subscribes to presence updates for all users on a board.
 * Returns an unsubscribe function.
 */
export const subscribeToPresence = (
  boardId: string,
  callback: (presence: Record<string, IPresenceData>) => void
): Unsubscribe => {
  const presenceRef = ref(realtimeDb, `boards/${boardId}/presence`);
  return onValue(presenceRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
};

/**
 * Removes a user's presence from the board.
 */
export const removePresence = async (boardId: string, uid: string): Promise<void> => {
  const presenceRef = ref(realtimeDb, `boards/${boardId}/presence/${uid}`);
  await remove(presenceRef);
};

/**
 * Sets up automatic presence removal when user disconnects.
 * Should be called once when joining a board.
 */
export const setupPresenceDisconnectHandler = (boardId: string, uid: string): void => {
  const presenceRef = ref(realtimeDb, `boards/${boardId}/presence/${uid}`);
  onDisconnect(presenceRef).remove();
};

// ============================================================================
// Connection Status
// ============================================================================

/**
 * Subscribes to connection status changes.
 * Returns an unsubscribe function.
 */
export const subscribeToConnectionStatus = (
  callback: (isConnected: boolean) => void
): Unsubscribe => {
  const connectedRef = ref(realtimeDb, '.info/connected');
  return onValue(connectedRef, (snapshot) => {
    callback(snapshot.val() === true);
  });
};

// ============================================================================
// User Color Assignment
// ============================================================================

const USER_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
] as const;

/**
 * Generates a consistent color for a user based on their UID.
 * The same UID will always return the same color.
 */
export const getUserColor = (uid: string): string => {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    const char = uid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index] ?? USER_COLORS[0];
};
