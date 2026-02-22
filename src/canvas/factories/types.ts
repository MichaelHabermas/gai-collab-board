/**
 * Shape factory types for imperative Konva node creation.
 * See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 1.
 */

import type Konva from 'konva';
import type { IBoardObject } from '@/types';

/** The node tree created for a single board object. */
export interface IShapeNodes {
  /** Root node added to the layer (Group for compound shapes, Shape for simple ones). */
  root: Konva.Group | Konva.Shape;
  /** Named sub-nodes for targeted attr patches. E.g., { bg: Rect, text: Text }. */
  parts: Record<string, Konva.Shape>;
  /** Whether this shape benefits from bitmap caching. */
  cacheable: boolean;
}

/** Creates the initial Konva node tree from object data. */
export type ShapeFactory = (obj: IBoardObject) => IShapeNodes;

/**
 * Patches an existing node tree from new vs. previous object data.
 * MUST return true if a visual property changed (triggers cache invalidation).
 * MUST return false if only position/selection state changed (no cache invalidation).
 */
export type ShapeUpdater = (nodes: IShapeNodes, obj: IBoardObject, prev: IBoardObject) => boolean;

/** Registry entry binding create + update for a shape type. */
export interface IShapeFactoryEntry {
  create: ShapeFactory;
  update: ShapeUpdater;
}
