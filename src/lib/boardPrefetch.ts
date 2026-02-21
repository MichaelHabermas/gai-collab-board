import type { IBoardObject } from '@/types';
import { getBoardRepository } from '@/lib/repositoryProvider';

/** Prefetch timeout — cancel subscription after this if the user doesn't navigate. */
const PREFETCH_TTL_MS = 10_000;

interface IPrefetchEntry {
  boardId: string;
  objects: IBoardObject[] | null;
  unsubscribe: () => void;
  timer: ReturnType<typeof setTimeout>;
}

const cache = new Map<string, IPrefetchEntry>();

/**
 * Start prefetching board objects on hover. Subscribes to Firestore,
 * caches the first snapshot, and auto-cancels after 10 seconds.
 */
export function prefetchBoard(boardId: string): void {
  if (cache.has(boardId)) return;

  const entry: IPrefetchEntry = {
    boardId,
    objects: null,
    unsubscribe: () => {},
    timer: setTimeout(() => cancelPrefetch(boardId), PREFETCH_TTL_MS),
  };

  const repo = getBoardRepository();
  entry.unsubscribe = repo.subscribeToObjects(boardId, (update) => {
    // Cache initial snapshot only — we don't need incremental updates for prefetch.
    if (update.isInitialSnapshot) {
      entry.objects = update.objects;
      // Unsubscribe immediately — we only needed the first snapshot.
      entry.unsubscribe();
    }
  });

  cache.set(boardId, entry);
}

/** Cancel an in-flight prefetch and clean up. */
export function cancelPrefetch(boardId: string): void {
  const entry = cache.get(boardId);
  if (!entry) return;

  clearTimeout(entry.timer);
  entry.unsubscribe();
  cache.delete(boardId);
}

/**
 * Consume prefetched objects if available. Returns the cached array
 * and removes the entry from cache. Returns null if nothing was prefetched.
 */
export function consumePrefetchedObjects(boardId: string): IBoardObject[] | null {
  const entry = cache.get(boardId);
  if (!entry?.objects) return null;

  const { objects } = entry;
  clearTimeout(entry.timer);
  cache.delete(boardId);

  return objects;
}
