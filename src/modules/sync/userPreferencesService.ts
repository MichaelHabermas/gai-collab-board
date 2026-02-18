import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { IUserPreferences } from '@/types';

const USERS_COLLECTION = 'users';
const MAX_RECENT_BOARDS = 10;

const DEFAULT_PREFERENCES: IUserPreferences = {
  recentBoardIds: [],
  favoriteBoardIds: [],
};

function userDoc(userId: string) {
  return doc(firestore, USERS_COLLECTION, userId);
}

/**
 * Reads user preferences from Firestore. Returns defaults if the document or preferences field is missing.
 */
export const getUserPreferences = async (userId: string): Promise<IUserPreferences> => {
  const ref = userDoc(userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { ...DEFAULT_PREFERENCES };
  }

  const data = snap.data();
  const prefs = data?.preferences;
  if (!prefs || typeof prefs !== 'object') {
    return { ...DEFAULT_PREFERENCES };
  }

  const recent = Array.isArray(prefs.recentBoardIds) ? prefs.recentBoardIds : [];
  const favorite = Array.isArray(prefs.favoriteBoardIds) ? prefs.favoriteBoardIds : [];
  return {
    recentBoardIds: Array.from(new Set(recent)),
    favoriteBoardIds: Array.from(new Set(favorite)),
  };
};

/**
 * Appends a board ID to recent list: move to front if already present, trim to MAX_RECENT_BOARDS.
 */
export const updateRecentBoardIds = async (userId: string, boardId: string): Promise<void> => {
  const prefs = await getUserPreferences(userId);
  const recent = [...prefs.recentBoardIds];
  const idx = recent.indexOf(boardId);
  if (idx !== -1) {
    recent.splice(idx, 1);
  }

  recent.unshift(boardId);
  const trimmed = recent.slice(0, MAX_RECENT_BOARDS);
  await setDoc(
    userDoc(userId),
    { preferences: { ...prefs, recentBoardIds: trimmed } },
    { merge: true }
  );
};

/**
 * Toggles boardId in favoriteBoardIds: add if absent, remove if present.
 */
export const toggleFavoriteBoardId = async (userId: string, boardId: string): Promise<void> => {
  const prefs = await getUserPreferences(userId);
  const favorites = [...prefs.favoriteBoardIds];
  const idx = favorites.indexOf(boardId);
  if (idx === -1) {
    favorites.push(boardId);
  } else {
    favorites.splice(idx, 1);
  }

  await setDoc(
    userDoc(userId),
    { preferences: { ...prefs, favoriteBoardIds: favorites } },
    { merge: true }
  );
};

/**
 * Removes a board ID from recentBoardIds and favoriteBoardIds (e.g. after board is deleted).
 */
export const removeBoardIdFromPreferences = async (
  userId: string,
  boardId: string
): Promise<void> => {
  const prefs = await getUserPreferences(userId);
  const recent = prefs.recentBoardIds.filter((id) => id !== boardId);
  const favorite = prefs.favoriteBoardIds.filter((id) => id !== boardId);
  await setDoc(
    userDoc(userId),
    { preferences: { ...prefs, recentBoardIds: recent, favoriteBoardIds: favorite } },
    { merge: true }
  );
};

/**
 * Subscribes to real-time user preferences updates.
 */
export const subscribeToUserPreferences = (
  userId: string,
  callback: (preferences: IUserPreferences) => void
): Unsubscribe => {
  const ref = userDoc(userId);
  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) {
      callback({ ...DEFAULT_PREFERENCES });
      return;
    }

    const data = snapshot.data();
    const prefs = data?.preferences;
    if (!prefs || typeof prefs !== 'object') {
      callback({ ...DEFAULT_PREFERENCES });
      return;
    }

    const recent = Array.isArray(prefs.recentBoardIds) ? prefs.recentBoardIds : [];
    const favorite = Array.isArray(prefs.favoriteBoardIds) ? prefs.favoriteBoardIds : [];
    callback({
      recentBoardIds: Array.from(new Set(recent)),
      favoriteBoardIds: Array.from(new Set(favorite)),
    });
  });
};
