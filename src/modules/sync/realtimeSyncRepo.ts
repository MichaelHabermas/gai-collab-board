/**
 * RTDB-backed implementation of IRealtimeSyncRepository.
 * Broadcasts ephemeral drag positions with throttled writes (50ms min interval).
 * Constitution: RTDB is for ephemeral high-frequency data only, not canonical state.
 */

import { ref, set, onValue, remove } from 'firebase/database';
import { getRealtimeDb } from '@/lib/firebase';
import type { IRealtimeSyncRepository, IDragUpdate, IPosition } from '@/types';

const THROTTLE_MS = 50;

function createThrottle(minInterval: number): (fn: () => void) => void {
  let lastCall = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;

  return (fn) => {
    const now = Date.now();
    const elapsed = now - lastCall;
    if (elapsed >= minInterval) {
      lastCall = now;
      fn();
    } else if (!pending) {
      pending = setTimeout(() => {
        lastCall = Date.now();
        pending = null;
        fn();
      }, minInterval - elapsed);
    }
  };
}

export function createRealtimeSyncRepo(): IRealtimeSyncRepository {
  const throttle = createThrottle(THROTTLE_MS);

  return {
    publishDragUpdate(boardId: string, objectId: string, position: IPosition): void {
      throttle(() => {
        const dragRef = ref(getRealtimeDb(), `boards/${boardId}/drags/${objectId}`);
        set(dragRef, {
          objectId,
          x: position.x,
          y: position.y,
          timestamp: Date.now(),
        });
      });
    },

    subscribeToDragUpdates(
      boardId: string,
      callback: (updates: IDragUpdate[]) => void
    ): () => void {
      const dragsRef = ref(getRealtimeDb(), `boards/${boardId}/drags`);
      const unsubscribe = onValue(dragsRef, (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);

          return;
        }

        const updates: IDragUpdate[] = Object.values(val)
          .filter(
            (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null
          )
          .map((record) => ({
            objectId: String(record['objectId'] ?? ''),
            position: {
              x: Number(record['x'] ?? 0),
              y: Number(record['y'] ?? 0),
            },
            timestamp: Number(record['timestamp'] ?? 0),
          }));
        callback(updates);
      });

      return () => {
        unsubscribe();
        remove(dragsRef);
      };
    },
  };
}
