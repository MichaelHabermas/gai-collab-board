/**
 * Unit tests for KonvaNodeManager — O(changed) diff, create/update/destroy, connector dedup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IBoardObject } from '@/types';
import type { ILayerManagerReturn } from '@/canvas/LayerManager';

declare global {
  // eslint-disable-next-line no-var
  var __konvaNodeManagerStoreCb: ((s: { objects: Record<string, IBoardObject> }, p: { objects: Record<string, IBoardObject> }) => void) | null;
}

vi.mock('@/stores/objectsStore', () => ({
  useObjectsStore: {
    subscribe(cb: (s: { objects: Record<string, IBoardObject> }, p: { objects: Record<string, IBoardObject> }) => void) {
      globalThis.__konvaNodeManagerStoreCb = cb;
      return () => {
        globalThis.__konvaNodeManagerStoreCb = null;
      };
    },
    getState: () => ({
      connectorsByEndpoint: new Map<string, Set<string>>(),
      frameChildrenIndex: new Map<string, Set<string>>(),
    }),
  },
}));

import { KonvaNodeManager } from '@/canvas/KonvaNodeManager';

function makeRect(id: string, x: number, y: number): IBoardObject {
  return {
    id,
    type: 'rectangle',
    x,
    y,
    width: 100,
    height: 50,
    rotation: 0,
    fill: '#fff',
    createdBy: 'test',
    createdAt: { toMillis: () => 0 } as IBoardObject['createdAt'],
    updatedAt: { toMillis: () => 0 } as IBoardObject['updatedAt'],
  };
}

function makeFakeNode() {
  return {
    add: vi.fn(),
    remove: vi.fn(),
    destroy: vi.fn(),
    moveTo: vi.fn(),
    cache: vi.fn(),
    clearCache: vi.fn(),
  };
}

function makeFakeLayerManager(): ILayerManagerReturn {
  const layers = {
    static: { add: vi.fn(), batchDraw: vi.fn(), destroy: vi.fn() },
    active: { add: vi.fn(), batchDraw: vi.fn(), destroy: vi.fn() },
    overlay: { batchDraw: vi.fn(), destroy: vi.fn() },
    selection: { batchDraw: vi.fn(), destroy: vi.fn() },
  };
  const scheduleBatchDraw = vi.fn();
  const destroy = vi.fn();
  return {
    layers: layers as unknown as ILayerManagerReturn['layers'],
    scheduleBatchDraw,
    destroy,
  };
}

function makeMockGetFactory() {
  return vi.fn((_type: string) => ({
    create: vi.fn((_obj: IBoardObject) => ({
      root: makeFakeNode(),
      parts: {},
      cacheable: false,
    })),
    update: vi.fn(() => false),
  }));
}

describe('KonvaNodeManager', () => {
  let manager: KonvaNodeManager;
  let layerManager: ILayerManagerReturn;

  beforeEach(() => {
    globalThis.__konvaNodeManagerStoreCb = null;
    layerManager = makeFakeLayerManager();
    const getFactoryFn = makeMockGetFactory();
    manager = new KonvaNodeManager({
      layerManager,
      getFactoryFn: getFactoryFn as never,
    });
  });

  it('creates node when object is added to store', () => {
    manager.start();
    const cb = globalThis.__konvaNodeManagerStoreCb;
    expect(cb).toBeDefined();

    const obj = makeRect('a', 10, 20);
    cb!({ objects: { a: obj } }, { objects: {} });

    const node = manager.getNode('a');
    expect(node).toBeDefined();
    expect(node?.type).toBe('rectangle');
    expect(node?.currentLayer).toBe('static');
    expect(layerManager.layers.static.add).toHaveBeenCalled();
  });

  it('updates node when object reference changes', () => {
    manager.start();
    const cb = globalThis.__konvaNodeManagerStoreCb!;
    const obj1 = makeRect('a', 10, 20);
    cb({ objects: { a: obj1 } }, { objects: {} });
    const nodeBefore = manager.getNode('a')?.nodes.root;

    const obj2 = makeRect('a', 30, 40);
    cb({ objects: { a: obj2 } }, { objects: { a: obj1 } });

    const nodeAfter = manager.getNode('a');
    expect(nodeAfter?.lastObj.x).toBe(30);
    expect(nodeAfter?.lastObj.y).toBe(40);
    expect(nodeAfter?.nodes.root).toBe(nodeBefore);
  });

  it('destroys node when object is removed from store', () => {
    manager.start();
    const cb = globalThis.__konvaNodeManagerStoreCb!;
    const obj = makeRect('a', 10, 20);
    cb({ objects: { a: obj } }, { objects: {} });
    expect(manager.getNode('a')).toBeDefined();

    cb({ objects: {} }, { objects: { a: obj } });
    expect(manager.getNode('a')).toBeUndefined();
  });

  it('moveToLayer moves node between static and active', () => {
    manager.start();
    globalThis.__konvaNodeManagerStoreCb!({ objects: { a: makeRect('a', 0, 0) } }, { objects: {} });
    const managed = manager.getNode('a');
    expect(managed?.currentLayer).toBe('static');

    manager.moveToLayer('a', 'active');
    expect(manager.getNode('a')?.currentLayer).toBe('active');

    manager.moveToLayer('a', 'static');
    expect(manager.getNode('a')?.currentLayer).toBe('static');
  });

  it('getAllManagedIds returns all managed ids', () => {
    manager.start();
    globalThis.__konvaNodeManagerStoreCb!(
      { objects: { a: makeRect('a', 0, 0), b: makeRect('b', 10, 10) } },
      { objects: {} }
    );
    const ids = manager.getAllManagedIds();
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids.length).toBe(2);
  });

  it('destroy unsubscribes and clears managed', () => {
    manager.start();
    globalThis.__konvaNodeManagerStoreCb!({ objects: { a: makeRect('a', 0, 0) } }, { objects: {} });
    manager.destroy();
    expect(manager.getAllManagedIds().length).toBe(0);
  });
});
