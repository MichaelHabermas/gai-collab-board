/**
 * Firestore-backed implementation of IBoardRepository.
 * Thin adapter over objectService — no logic duplication.
 * Constitution Article III: all CRUD goes through IBoardRepository.
 */

import type { IBoardRepository } from '@/types';
import {
  createObject,
  createObjectsBatch,
  updateObject,
  updateObjectsBatch,
  deleteObject,
  deleteObjectsBatch,
  subscribeToObjectsWithChanges,
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
  };
}
