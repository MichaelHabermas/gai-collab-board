/**
 * Shape factory registry. Factories are registered by IK7, IK8, IK9.
 * See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 1.
 */

import type { ShapeType } from '@/types';
import type { IShapeFactoryEntry, ShapeFactory, ShapeUpdater } from './types';
import { createConnector, updateConnector } from './createConnector';
import { createTextElement, updateTextElement } from './createTextElement';

const stubCreate: ShapeFactory = () => {
  throw new Error('Factory not implemented');
};
const stubUpdate: ShapeUpdater = () => {
  throw new Error('Factory not implemented');
};
const stubEntry: IShapeFactoryEntry = { create: stubCreate, update: stubUpdate };

const FACTORY_REGISTRY = new Map<ShapeType, IShapeFactoryEntry>([
  ['rectangle', stubEntry],
  ['circle', stubEntry],
  ['line', stubEntry],
  ['connector', { create: createConnector, update: updateConnector }],
  ['text', { create: createTextElement, update: updateTextElement }],
  ['sticky', stubEntry],
  ['frame', stubEntry],
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
