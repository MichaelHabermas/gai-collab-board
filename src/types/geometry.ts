/**
 * Geometry types: single source for point, dimensions, size, bounds, and transform.
 * Eliminates duplicated inline { x, y } and { width, height } across lib and components.
 * Replace in: BoardCanvas, CanvasShapeRenderer, StickyNote, Frame, alignmentGuides,
 * snapToGrid, canvasBounds, canvasOverlayPosition, AlignToolbar, connectorAnchors.
 */

/** 2D point or position. Canonical type for { x, y } everywhere. */
export interface IPosition {
  x: number;
  y: number;
}

/** Width and height. Canonical type for size dimensions. */
export interface IDimensions {
  width: number;
  height: number;
}

/** Position plus dimensions (e.g. rect top-left and size). */
export interface ISize extends IPosition, IDimensions {}

/**
 * Axis-aligned bounding box (min/max corners).
 * Used by canvasBounds, alignmentGuides, useCanvasViewport, getSelectionBounds.
 */
export interface IBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Position, dimensions, and rotation. Base for shape transform state. */
export interface ITransform extends ISize {
  rotation: number;
}

/** Transform plus scale (e.g. Konva node after resize). */
export interface IScaleTransform extends ITransform {
  scaleX: number;
  scaleY: number;
}
