/**
 * Coalescing write queue for Firestore updates.
 * Batches rapid property changes into single writes per object.
 * Structural operations (create, delete) bypass the queue entirely.
 *
 * DIP: uses IBoardRepository for persistence instead of direct objectService import.
 */

import type { IBoardRepository, IUpdateObjectParams } from '@/types';
import { useObjectsStore } from '@/stores/objectsStore';

const DEBOUNCE_MS = 500;

interface IPendingWrite {
  objectId: string;
  updates: IUpdateObjectParams;
}

const pendingWrites = new Map<string, IPendingWrite>();
let timer: ReturnType<typeof setTimeout> | null = null;
let activeBoardId: string | null = null;
let repo: IBoardRepository | null = null;

let totalFlushes = 0;
let totalCoalesced = 0;

/** Inject the repository for write operations. Call once at app startup. */
export function initWriteQueue(repository: IBoardRepository): void {
  repo = repository;
}

/** Set the active board for queued writes. Call when board changes. */
export function setWriteQueueBoard(boardId: string | null): void {
  if (activeBoardId && activeBoardId !== boardId && pendingWrites.size > 0) {
    flush();
  }

  activeBoardId = boardId;
}

/** Queue an object update. Coalesces with pending updates for the same object. */
export function queueWrite(objectId: string, changes: IUpdateObjectParams): void {
  const existing = pendingWrites.get(objectId);
  pendingWrites.set(objectId, {
    objectId,
    updates: existing ? { ...existing.updates, ...changes } : changes,
  });

  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(flush, DEBOUNCE_MS);
}

/**
 * Canonical high-frequency update path (Constitution Article X).
 * Atomically: (a) optimistic Zustand store update, (b) write queue enqueue.
 * All high-frequency property mutations MUST use this function.
 */
export function queueObjectUpdate(objectId: string, updates: IUpdateObjectParams): void {
  useObjectsStore.getState().updateObject(objectId, updates);
  queueWrite(objectId, updates);
}

/** Flush all pending writes immediately. Returns a promise that resolves when the batch completes. */
export async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  if (pendingWrites.size === 0 || !activeBoardId || !repo) {
    return;
  }

  const batch = Array.from(pendingWrites.values());
  totalCoalesced += batch.length - 1;
  totalFlushes++;
  pendingWrites.clear();

  try {
    await repo.updateObjectsBatch(activeBoardId, batch);

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(
        `[writeQueue] flushed ${batch.length} objects (${totalFlushes} flushes, ${totalCoalesced} coalesced total)`
      );
    }
  } catch (err) {
    for (const entry of batch) {
      if (!pendingWrites.has(entry.objectId)) {
        pendingWrites.set(entry.objectId, entry);
      }
    }
    if (!timer) {
      timer = setTimeout(flush, DEBOUNCE_MS * 2);
    }

    console.error('[writeQueue] Batch write failed, re-queued', err);
  }
}

/** Number of pending writes (for testing/debugging). */
export function pendingCount(): number {
  return pendingWrites.size;
}

/** Dev telemetry: snapshot of queue stats. */
export function getWriteQueueStats(): {
  pending: number;
  totalFlushes: number;
  totalCoalesced: number;
} {
  return { pending: pendingWrites.size, totalFlushes, totalCoalesced };
}

// Flush on page unload to prevent data loss
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (pendingWrites.size > 0) {
      flush();
    }
  });
}
