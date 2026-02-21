/**
 * Module-level singleton for the active IBoardRepository.
 * Avoids prop-drilling the repo through the component tree.
 * Initialize once at app startup via initRepository().
 */

import type { IBoardRepository, IRealtimeSyncRepository } from '@/types';

let boardRepo: IBoardRepository | null = null;
let realtimeRepo: IRealtimeSyncRepository | null = null;

export function initRepository(board: IBoardRepository, realtime?: IRealtimeSyncRepository): void {
  boardRepo = board;
  if (realtime) {
    realtimeRepo = realtime;
  }
}

export function getBoardRepository(): IBoardRepository {
  if (!boardRepo) {
    throw new Error('Board repository not initialized. Call initRepository() at app startup.');
  }

  return boardRepo;
}

export function getRealtimeSyncRepository(): IRealtimeSyncRepository | null {
  return realtimeRepo;
}
