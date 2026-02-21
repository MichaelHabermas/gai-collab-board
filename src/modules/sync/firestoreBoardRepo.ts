/**
 * Firestore-backed implementation of IBoardRepository.
 * Thin adapter over objectService — no logic duplication.
 * Constitution Article III: all CRUD goes through IBoardRepository.
 */

import { Timestamp } from 'firebase/firestore';
import type { IBoardRepository } from '@/types';
import {
  createObject,
  createObjectsBatch,
  updateObject,
  updateObjectsBatch,
  deleteObject,
  deleteObjectsBatch,
  subscribeToObjectsWithChanges,
  fetchObjectsBatch,
  fetchObjectsPaginated,
  subscribeToDeltaUpdates,
} from './objectService';

export function createFirestoreBoardRepo(): IBoardRepository {
  return {
    createObject,
    createObjectsBatch,
    updateObject,
    updateObjectsBatch,
    deleteObject,
    deleteObjectsBatch,
    subscribeToObjects: subscribeToObjectsWithChanges,
    fetchObjectsBatch,
    fetchObjectsPaginated,
    subscribeToDeltaUpdates: (boardId, afterTimestamp, callback) => {
      // Convert provider-agnostic IDeltaCursor to Firestore Timestamp
      const ts = new Timestamp(afterTimestamp.seconds, afterTimestamp.nanoseconds);

      return subscribeToDeltaUpdates(boardId, ts, callback);
    },
  };
}
