/**
 * Unit tests for src/canvas/factories types and registry.
 */

import { describe, expect, it } from 'vitest';
import { getFactory, FACTORY_REGISTRY } from '@/canvas/factories';
import type { ShapeType } from '@/types';

describe('canvas/factories', () => {
  const SHAPE_TYPES: ShapeType[] = [
    'rectangle',
    'circle',
    'line',
    'connector',
    'text',
    'sticky',
    'frame',
  ];

  it('getFactory returns entry for each shape type', () => {
    for (const type of SHAPE_TYPES) {
      const entry = getFactory(type);
      expect(entry).toBeDefined();
      expect(entry.create).toBeTypeOf('function');
      expect(entry.update).toBeTypeOf('function');
    }
  });

  it('getFactory throws for unknown shape type', () => {
    expect(() => getFactory('unknown' as ShapeType)).toThrow(
      /No factory registered for shape type/
    );
  });

  it('stub create throws when called', () => {
    const entry = getFactory('rectangle');
    expect(() => entry.create({} as never)).toThrow('Factory not implemented');
  });

  it('stub update throws when called', () => {
    const entry = getFactory('rectangle');
    expect(() => entry.update({} as never, {} as never, {} as never)).toThrow(
      'Factory not implemented'
    );
  });

  it('FACTORY_REGISTRY has all 7 shape types', () => {
    expect(FACTORY_REGISTRY.size).toBe(7);
    for (const type of SHAPE_TYPES) {
      expect(FACTORY_REGISTRY.has(type)).toBe(true);
    }
  });
});
