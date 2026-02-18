import { describe, it, expect } from 'vitest';
import { BOARD_CANVAS_CONTAINER_CLASS } from '@/components/canvas/BoardCanvas';

describe('BoardCanvas background', () => {
  it('uses theme-aware background so dark/light mode is visible on the canvas', () => {
    expect(BOARD_CANVAS_CONTAINER_CLASS).toContain('bg-background');
  });
});
