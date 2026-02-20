/**
 * Grid-based spatial hash index for fast viewport culling and containment queries.
 *
 * Each cell is CELL_SIZE x CELL_SIZE pixels. Objects are inserted into every cell
 * they overlap. Queries return candidate IDs from cells that intersect the query bounds.
 *
 * Complexity: insert/remove O(cells-per-object), query O(cells-in-viewport).
 * Trades memory for speed — practical with CELL_SIZE=500 on a 5000x5000 canvas (~100 cells).
 */

import type { IBounds } from '@/types';

const CELL_SIZE = 500;

/** Convert a world coordinate to a cell key component. */
const toCell = (v: number): number => Math.floor(v / CELL_SIZE);

/** Encode cell (cx, cy) into a single string key. */
const cellKey = (cx: number, cy: number): string => `${cx},${cy}`;

export class SpatialIndex {
  /** cell key → Set of object IDs overlapping that cell */
  private cells = new Map<string, Set<string>>();
  /** object ID → Set of cell keys it occupies (for fast removal) */
  private objectCells = new Map<string, Set<string>>();

  /** Insert or update an object in the index. */
  insert(id: string, bounds: IBounds): void {
    // Remove old entries if object already exists
    this.remove(id);

    const minCx = toCell(bounds.x1);
    const maxCx = toCell(bounds.x2);
    const minCy = toCell(bounds.y1);
    const maxCy = toCell(bounds.y2);

    const keys = new Set<string>();

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = cellKey(cx, cy);
        keys.add(key);

        let cell = this.cells.get(key);
        if (!cell) {
          cell = new Set<string>();
          this.cells.set(key, cell);
        }

        cell.add(id);
      }
    }

    this.objectCells.set(id, keys);
  }

  /** Remove an object from the index. No-op if not present. */
  remove(id: string): void {
    const keys = this.objectCells.get(id);
    if (!keys) return;

    for (const key of keys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(id);
        if (cell.size === 0) this.cells.delete(key);
      }
    }

    this.objectCells.delete(id);
  }

  /** Update an object's bounds (re-insert). */
  update(id: string, bounds: IBounds): void {
    this.insert(id, bounds);
  }

  /** Query all object IDs whose bounding cells overlap the given bounds. */
  query(bounds: IBounds): Set<string> {
    const minCx = toCell(bounds.x1);
    const maxCx = toCell(bounds.x2);
    const minCy = toCell(bounds.y1);
    const maxCy = toCell(bounds.y2);

    const result = new Set<string>();

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(cellKey(cx, cy));
        if (cell) {
          for (const id of cell) {
            result.add(id);
          }
        }
      }
    }

    return result;
  }

  /** Clear all entries. */
  clear(): void {
    this.cells.clear();
    this.objectCells.clear();
  }

  /** Number of tracked objects. */
  get size(): number {
    return this.objectCells.size;
  }
}
