import { generateId } from '@/lib/utils';

const STORAGE_KEY = 'collabboard_guest_id';

export interface IAnonymousGuest {
  id: string;
  displayName: string;
}

/**
 * Returns a stable anonymous id and display name for the current tab/session.
 * Uses sessionStorage when available; otherwise returns a new id each call (e.g. SSR/tests).
 */
export function getOrCreateAnonymousId(): IAnonymousGuest {
  if (typeof sessionStorage === 'undefined') {
    return { id: generateId(), displayName: 'Guest' };
  }

  let id = sessionStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = generateId();
    sessionStorage.setItem(STORAGE_KEY, id);
  }

  return { id, displayName: 'Guest' };
}
