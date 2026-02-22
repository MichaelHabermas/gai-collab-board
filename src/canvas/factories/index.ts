/**
 * Shape factory registry. Factories are registered by IK7, IK8, IK9.
 * See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 1.
 */

import type { ShapeType } from '@/types';
import type { IShapeFactoryEntry } from './types';
import { createRectangle, updateRectangle } from './createRectangle';
import { createCircle, updateCircle } from './createCircle';
import { createLine, updateLine } from './createLine';
import { createConnector, updateConnector } from './createConnector';
import { createTextElement, updateTextElement } from './createTextElement';
import { createStickyNote, updateStickyNote } from './createStickyNote';
import { createFrame, updateFrame } from './createFrame';

const FACTORY_REGISTRY = new Map<ShapeType, IShapeFactoryEntry>([
  ['rectangle', { create: createRectangle, update: updateRectangle }],
  ['circle', { create: createCircle, update: updateCircle }],
  ['line', { create: createLine, update: updateLine }],
  ['connector', { create: createConnector, update: updateConnector }],
  ['text', { create: createTextElement, update: updateTextElement }],
  ['sticky', { create: createStickyNote, update: updateStickyNote }],
  ['frame', { create: createFrame, update: updateFrame }],
]);

export function getFactory(type: ShapeType): IShapeFactoryEntry {
  const entry = FACTORY_REGISTRY.get(type);
  if (!entry) {
    throw new Error(`No factory registered for shape type: ${type}`);
  }

  return entry;
}

export { FACTORY_REGISTRY };
export type { IShapeNodes, ShapeFactory, ShapeUpdater, IShapeFactoryEntry } from './types';
