/**
 * Collaboration types: cursors and presence.
 * Moved from realtimeService and useCursors to break cycles and centralize shared types.
 * Replace in: realtimeService, useCursors, CursorLayer, PresenceAvatars, usePresence.
 */

/** Per-user cursor data broadcast on the board. */
export interface ICursorData {
  uid: string;
  x: number;
  y: number;
  displayName: string;
  color: string;
  lastUpdated: number;
}

/** Map of user id to cursor data. Used by useCursors and subscribeToCursors. */
export type Cursors = Record<string, ICursorData>;

/** Per-user presence (online, display name, color). */
export interface IPresenceData {
  uid: string;
  displayName: string;
  photoURL: string | null;
  color: string;
  online: boolean;
  lastSeen: number;
}
