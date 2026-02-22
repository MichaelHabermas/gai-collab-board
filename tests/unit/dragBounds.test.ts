import { describe, it, expect } from 'vitest';
import { createDragBoundFunc } from '@/canvas/drag/dragBounds';

describe('dragBounds', () => {
  it('passes through position when snap to grid is disabled', () => {
    const config = { snapToGridEnabled: () => false };
    const boundFunc = createDragBoundFunc('obj1', config);
    const pos = { x: 15, y: 25 };
    expect(boundFunc(pos)).toEqual(pos);
  });

  it('snaps position to grid when snap to grid is enabled', () => {
    const config = { snapToGridEnabled: () => true };
    const boundFunc = createDragBoundFunc('obj1', config);
    const pos = { x: 15, y: 25 };
    // GRID_SIZE = 20, so 15 -> 20, 25 -> 20 (if round)
    // Actually snapPositionToGrid uses Math.round(val / grid) * grid
    // 15 / 20 = 0.75 -> 1 * 20 = 20
    // 25 / 20 = 1.25 -> 1 * 20 = 20
    expect(boundFunc(pos)).toEqual({ x: 20, y: 20 });
  });
});
