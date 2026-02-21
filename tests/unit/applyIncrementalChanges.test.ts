import { describe, expect, it } from 'vitest';
import type { IBoardObject, IObjectChange } from '@/types';
import { applyIncrementalChanges, isObjectDataUnchanged } from '@/hooks/useObjects';

const createTimestamp = (millis: number) =>
  ({
    toMillis: () => millis,
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1_000_000,
  }) as IBoardObject['updatedAt'];

const createBoardObject = (overrides: Partial<IBoardObject> = {}): IBoardObject => ({
  id: overrides.id ?? 'obj-1',
  type: overrides.type ?? 'sticky',
  x: overrides.x ?? 100,
  y: overrides.y ?? 100,
  width: overrides.width ?? 200,
  height: overrides.height ?? 200,
  rotation: overrides.rotation ?? 0,
  fill: overrides.fill ?? '#fef08a',
  text: overrides.text ?? 'hello',
  stroke: overrides.stroke,
  strokeWidth: overrides.strokeWidth,
  opacity: overrides.opacity,
  fontSize: overrides.fontSize,
  parentFrameId: overrides.parentFrameId,
  points: overrides.points,
  createdBy: overrides.createdBy ?? 'user-1',
  createdAt: overrides.createdAt ?? createTimestamp(1000),
  updatedAt: overrides.updatedAt ?? createTimestamp(1000),
});

const buildObjectsById = (objects: IBoardObject[]): Map<string, IBoardObject> =>
  new Map(objects.map((o) => [o.id, o]));

describe('isObjectDataUnchanged', () => {
  it('returns true for identical visual fields', () => {
    const a = createBoardObject();
    const b = createBoardObject({ updatedAt: createTimestamp(9999) });

    expect(isObjectDataUnchanged(a, b)).toBe(true);
  });

  it('returns false when a visual field differs', () => {
    const a = createBoardObject();
    const b = createBoardObject({ x: 999 });

    expect(isObjectDataUnchanged(a, b)).toBe(false);
  });

  it('returns false when points arrays differ', () => {
    const a = createBoardObject({ points: [0, 0, 100, 100] });
    const b = createBoardObject({ points: [0, 0, 200, 200] });

    expect(isObjectDataUnchanged(a, b)).toBe(false);
  });

  it('returns true when points arrays are equal by value', () => {
    const a = createBoardObject({ points: [0, 0, 100, 100] });
    const b = createBoardObject({ points: [0, 0, 100, 100] });

    expect(isObjectDataUnchanged(a, b)).toBe(true);
  });
});

describe('applyIncrementalChanges', () => {
  it('returns same map reference and didChange=false for empty changes', () => {
    const objects = [createBoardObject({ id: 'a' }), createBoardObject({ id: 'b' })];
    const objectsById = buildObjectsById(objects);

    const result = applyIncrementalChanges(objectsById, [], isObjectDataUnchanged);

    expect(result.didChange).toBe(false);
    expect(result.nextById).toBe(objectsById);
  });

  it('modifies an existing object', () => {
    const original = createBoardObject({ id: 'a', x: 10 });
    const modified = createBoardObject({ id: 'a', x: 999 });
    const objectsById = buildObjectsById([original]);
    const changes: IObjectChange[] = [{ type: 'modified', object: modified }];

    const result = applyIncrementalChanges(objectsById, changes, isObjectDataUnchanged);

    expect(result.didChange).toBe(true);
    expect(result.nextById).not.toBe(objectsById);
    expect(result.nextById.get('a')?.x).toBe(999);
  });

  it('adds a new object', () => {
    const existing = createBoardObject({ id: 'a' });
    const added = createBoardObject({ id: 'b', fill: '#ff0000' });
    const objectsById = buildObjectsById([existing]);
    const changes: IObjectChange[] = [{ type: 'added', object: added }];

    const result = applyIncrementalChanges(objectsById, changes, isObjectDataUnchanged);

    expect(result.didChange).toBe(true);
    expect(result.nextById.size).toBe(2);
    expect(result.nextById.get('b')?.fill).toBe('#ff0000');
  });

  it('removes an existing object', () => {
    const a = createBoardObject({ id: 'a' });
    const b = createBoardObject({ id: 'b' });
    const objectsById = buildObjectsById([a, b]);
    const changes: IObjectChange[] = [{ type: 'removed', object: a }];

    const result = applyIncrementalChanges(objectsById, changes, isObjectDataUnchanged);

    expect(result.didChange).toBe(true);
    expect(result.nextById.size).toBe(1);
    expect(result.nextById.has('a')).toBe(false);
    expect(result.nextById.has('b')).toBe(true);
  });

  it('handles mixed batch (add + modify + remove)', () => {
    const a = createBoardObject({ id: 'a', x: 10 });
    const b = createBoardObject({ id: 'b', x: 20 });
    const c = createBoardObject({ id: 'c', x: 30 });
    const objectsById = buildObjectsById([a, b, c]);

    const changes: IObjectChange[] = [
      { type: 'removed', object: a },
      { type: 'modified', object: createBoardObject({ id: 'b', x: 999 }) },
      { type: 'added', object: createBoardObject({ id: 'd', x: 40 }) },
    ];

    const result = applyIncrementalChanges(objectsById, changes, isObjectDataUnchanged);

    expect(result.didChange).toBe(true);
    expect(result.nextById.size).toBe(3);
    expect(result.nextById.has('a')).toBe(false);
    expect(result.nextById.get('b')?.x).toBe(999);
    expect(result.nextById.get('c')?.x).toBe(30);
    expect(result.nextById.get('d')?.x).toBe(40);
  });

  it('returns didChange=false when visual fields are unchanged', () => {
    const a = createBoardObject({ id: 'a', x: 10 });
    const objectsById = buildObjectsById([a]);
    // Same visual data, different timestamp
    const unchanged = createBoardObject({ id: 'a', x: 10, updatedAt: createTimestamp(9999) });
    const changes: IObjectChange[] = [{ type: 'modified', object: unchanged }];

    const result = applyIncrementalChanges(objectsById, changes, isObjectDataUnchanged);

    expect(result.didChange).toBe(false);
    expect(result.nextById).toBe(objectsById);
  });

  it('preserves Map insertion order after modifications', () => {
    const a = createBoardObject({ id: 'a' });
    const b = createBoardObject({ id: 'b' });
    const c = createBoardObject({ id: 'c' });
    const objectsById = buildObjectsById([a, b, c]);

    const modifiedB = createBoardObject({ id: 'b', x: 999 });
    const changes: IObjectChange[] = [{ type: 'modified', object: modifiedB }];

    const result = applyIncrementalChanges(objectsById, changes, isObjectDataUnchanged);

    const keys = Array.from(result.nextById.keys());
    expect(keys).toEqual(['a', 'b', 'c']);
  });

  it('handles multiple modifications to the same object (last wins)', () => {
    const a = createBoardObject({ id: 'a', x: 10 });
    const objectsById = buildObjectsById([a]);

    const changes: IObjectChange[] = [
      { type: 'modified', object: createBoardObject({ id: 'a', x: 50 }) },
      { type: 'modified', object: createBoardObject({ id: 'a', x: 999 }) },
    ];

    const result = applyIncrementalChanges(objectsById, changes, isObjectDataUnchanged);

    expect(result.didChange).toBe(true);
    expect(result.nextById.get('a')?.x).toBe(999);
  });

  it('ignores removal of non-existent object', () => {
    const a = createBoardObject({ id: 'a' });
    const objectsById = buildObjectsById([a]);
    const ghost = createBoardObject({ id: 'ghost' });
    const changes: IObjectChange[] = [{ type: 'removed', object: ghost }];

    const result = applyIncrementalChanges(objectsById, changes, isObjectDataUnchanged);

    expect(result.didChange).toBe(false);
    expect(result.nextById).toBe(objectsById);
  });

  it('adds an object that already exists as a no-op when data unchanged', () => {
    const a = createBoardObject({ id: 'a', x: 10 });
    const objectsById = buildObjectsById([a]);
    const duplicate = createBoardObject({ id: 'a', x: 10 });
    const changes: IObjectChange[] = [{ type: 'added', object: duplicate }];

    const result = applyIncrementalChanges(objectsById, changes, isObjectDataUnchanged);

    expect(result.didChange).toBe(false);
    expect(result.nextById).toBe(objectsById);
  });

  it('benchmark: 1000 objects, 5 modifications < 1ms average', () => {
    const objects: IBoardObject[] = [];
    for (let i = 0; i < 1000; i++) {
      objects.push(createBoardObject({ id: `obj-${i}`, x: i }));
    }
    const objectsById = buildObjectsById(objects);

    const changes: IObjectChange[] = [];
    for (let i = 0; i < 5; i++) {
      changes.push({
        type: 'modified',
        object: createBoardObject({ id: `obj-${i * 200}`, x: 99999 }),
      });
    }

    // Warm up
    for (let i = 0; i < 10; i++) {
      applyIncrementalChanges(objectsById, changes, isObjectDataUnchanged);
    }

    const start = performance.now();
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      applyIncrementalChanges(objectsById, changes, isObjectDataUnchanged);
    }
    const avgMs = (performance.now() - start) / iterations;

    expect(avgMs).toBeLessThan(1);
  });
});
