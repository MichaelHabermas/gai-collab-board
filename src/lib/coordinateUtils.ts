/**
 * Pure coordinate conversion utilities for screen <-> world transformations.
 * No Konva dependency — operates on IPosition and IViewportState only.
 * Constitution Article II: conversions happen at the boundary, not inside state mutations.
 */

import type { IPosition, IBounds, IViewportState } from '@/types';

/** Convert a screen-space point to world-space using the current viewport transform. */
export function screenToWorld(screen: IPosition, viewport: IViewportState): IPosition {
  return {
    x: (screen.x - viewport.position.x) / viewport.scale.x,
    y: (screen.y - viewport.position.y) / viewport.scale.y,
  };
}

/** Convert a world-space point to screen-space using the current viewport transform. */
export function worldToScreen(world: IPosition, viewport: IViewportState): IPosition {
  return {
    x: world.x * viewport.scale.x + viewport.position.x,
    y: world.y * viewport.scale.y + viewport.position.y,
  };
}

/** Convert a screen-space axis-aligned bounding box to world-space. */
export function screenToWorldRect(screen: IBounds, viewport: IViewportState): IBounds {
  const topLeft = screenToWorld({ x: screen.x1, y: screen.y1 }, viewport);
  const bottomRight = screenToWorld({ x: screen.x2, y: screen.y2 }, viewport);

  return {
    x1: Math.min(topLeft.x, bottomRight.x),
    y1: Math.min(topLeft.y, bottomRight.y),
    x2: Math.max(topLeft.x, bottomRight.x),
    y2: Math.max(topLeft.y, bottomRight.y),
  };
}

/** Convert a world-space axis-aligned bounding box to screen-space. */
export function worldToScreenRect(world: IBounds, viewport: IViewportState): IBounds {
  const topLeft = worldToScreen({ x: world.x1, y: world.y1 }, viewport);
  const bottomRight = worldToScreen({ x: world.x2, y: world.y2 }, viewport);

  return {
    x1: Math.min(topLeft.x, bottomRight.x),
    y1: Math.min(topLeft.y, bottomRight.y),
    x2: Math.max(topLeft.x, bottomRight.x),
    y2: Math.max(topLeft.y, bottomRight.y),
  };
}
