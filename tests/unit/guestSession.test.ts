import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getOrCreateAnonymousId } from '@/lib/guestSession';

const STORAGE_KEY = 'collabboard_guest_id';

describe('guestSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('getOrCreateAnonymousId', () => {
    it('returns id and displayName "Guest" when sessionStorage is empty', () => {
      const result = getOrCreateAnonymousId();
      expect(result).toEqual({ id: expect.any(String), displayName: 'Guest' });
      expect(result.id).toHaveLength(21);
      expect(result.id).toMatch(/^[0-9a-z]+$/);
    });

    it('persists id in sessionStorage and returns same id on subsequent calls', () => {
      const first = getOrCreateAnonymousId();
      const second = getOrCreateAnonymousId();
      expect(second.id).toBe(first.id);
      expect(second.displayName).toBe('Guest');
      expect(sessionStorage.getItem(STORAGE_KEY)).toBe(first.id);
    });

    it('returns existing id from sessionStorage when key is already set', () => {
      const storedId = 'abc123xyz';
      sessionStorage.setItem(STORAGE_KEY, storedId);
      const result = getOrCreateAnonymousId();
      expect(result.id).toBe(storedId);
      expect(result.displayName).toBe('Guest');
    });

    it('returns new id and displayName "Guest" when sessionStorage is undefined', () => {
      const originalSessionStorage = globalThis.sessionStorage;
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      const result = getOrCreateAnonymousId();
      expect(result.displayName).toBe('Guest');
      expect(result.id).toHaveLength(21);
      expect(result.id).toMatch(/^[0-9a-z]+$/);
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: originalSessionStorage,
        configurable: true,
        writable: true,
      });
    });
  });
});
