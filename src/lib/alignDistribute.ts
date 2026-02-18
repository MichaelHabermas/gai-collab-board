/**
 * Pure layout helpers for align and distribute.
 * Used by both the align toolbar (UI) and the AI tool executor.
 */

import type { AlignOption, DistributeDirection, ILayoutRect, IPositionUpdate } from '@/types';

export type { AlignOption, DistributeDirection, ILayoutRect, IPositionUpdate };

/**
 * Computes position updates to align objects by the given option.
 * Does not mutate; returns updates to apply (x and/or y per object).
 */
export function computeAlignUpdates(
  objects: ILayoutRect[],
  alignment: AlignOption
): IPositionUpdate[] {
  if (objects.length === 0) {
    return [];
  }

  if (alignment === 'left') {
    const targetX = Math.min(...objects.map((o) => o.x));
    return objects.map((obj) => ({ id: obj.id, x: targetX }));
  }
  if (alignment === 'right') {
    const targetRight = Math.max(...objects.map((o) => o.x + o.width));
    return objects.map((obj) => ({ id: obj.id, x: targetRight - obj.width }));
  }
  if (alignment === 'center') {
    const minX = Math.min(...objects.map((o) => o.x));
    const maxRight = Math.max(...objects.map((o) => o.x + o.width));
    const centerX = (minX + maxRight) / 2;
    return objects.map((obj) => ({ id: obj.id, x: centerX - obj.width / 2 }));
  }
  if (alignment === 'top') {
    const targetY = Math.min(...objects.map((o) => o.y));
    return objects.map((obj) => ({ id: obj.id, y: targetY }));
  }
  if (alignment === 'bottom') {
    const targetBottom = Math.max(...objects.map((o) => o.y + o.height));
    return objects.map((obj) => ({ id: obj.id, y: targetBottom - obj.height }));
  }
  if (alignment === 'middle') {
    const minY = Math.min(...objects.map((o) => o.y));
    const maxBottom = Math.max(...objects.map((o) => o.y + o.height));
    const centerY = (minY + maxBottom) / 2;
    return objects.map((obj) => ({ id: obj.id, y: centerY - obj.height / 2 }));
  }

  return [];
}

/**
 * Computes position updates to distribute objects evenly along the given axis.
 * Requires at least 3 objects. Sorts by x (horizontal) or y (vertical).
 */
export function computeDistributeUpdates(
  objects: ILayoutRect[],
  direction: DistributeDirection
): IPositionUpdate[] {
  if (objects.length < 3) {
    return [];
  }

  const sorted = [...objects].sort((a, b) => (direction === 'horizontal' ? a.x - b.x : a.y - b.y));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return [];
  }

  if (direction === 'horizontal') {
    const totalWidth = last.x + last.width - first.x;
    const objectsWidth = sorted.reduce((s, o) => s + o.width, 0);
    const spacing = (totalWidth - objectsWidth) / (sorted.length - 1);
    let currentX = first.x;
    return sorted.map((obj) => {
      const update: IPositionUpdate = { id: obj.id, x: currentX };
      currentX += obj.width + spacing;
      return update;
    });
  }

  const totalHeight = last.y + last.height - first.y;
  const objectsHeight = sorted.reduce((s, o) => s + o.height, 0);
  const spacing = (totalHeight - objectsHeight) / (sorted.length - 1);
  let currentY = first.y;
  return sorted.map((obj) => {
    const update: IPositionUpdate = { id: obj.id, y: currentY };
    currentY += obj.height + spacing;
    return update;
  });
}
