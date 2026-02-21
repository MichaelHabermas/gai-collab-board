import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBoardStateManager,
  AI_STATE_VERSION,
  type IBoardStateProvider,
  type IBoardStateManager,
} from '@/lib/boardStateManager';
import type { IBoardObject } from '@/types';
import { Timestamp } from 'firebase/firestore';

const now = Timestamp.now();

function makeObject(overrides: Partial<IBoardObject> & { id: string; type: IBoardObject['type'] }): IBoardObject {
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    fill: '#fef08a',
    createdBy: 'user-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const STICKY_1 = makeObject({ id: 's1', type: 'sticky', text: 'Hello', x: 10, y: 20 });
const RECT_1 = makeObject({ id: 'r1', type: 'rectangle', fill: '#93c5fd', x: 200, y: 300 });
const CONNECTOR_1 = makeObject({
  id: 'c1',
  type: 'connector',
  fromObjectId: 's1',
  toObjectId: 'r1',
  fromAnchor: 'right',
  toAnchor: 'left',
  points: [0, 0, 190, 280],
});
const TEXT_1 = makeObject({ id: 't1', type: 'text', text: 'Title', fontSize: 24 });

const ALL_OBJECTS: Record<string, IBoardObject> = {
  s1: STICKY_1,
  r1: RECT_1,
  c1: CONNECTOR_1,
  t1: TEXT_1,
};

const DEFAULT_VIEWPORT = { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 } };

function createMockProvider(
  objects: Record<string, IBoardObject> = ALL_OBJECTS,
  viewport = DEFAULT_VIEWPORT,
): IBoardStateProvider {
  return {
    getObjects: () => objects,
    getViewport: () => viewport,
  };
}

describe('createBoardStateManager', () => {
  let manager: IBoardStateManager;

  beforeEach(() => {
    manager = createBoardStateManager(createMockProvider());
  });

  describe('getState', () => {
    it('returns elements and viewport', () => {
      const state = manager.getState();

      expect(state.elements).toBe(ALL_OBJECTS);
      expect(state.viewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('reflects updated viewport from provider', () => {
      const customViewport = { position: { x: 50, y: -20 }, scale: { x: 2, y: 2 } };
      const mgr = createBoardStateManager(createMockProvider(ALL_OBJECTS, customViewport));

      expect(mgr.getState().viewport).toEqual(customViewport);
    });
  });

  describe('getElementsJSON', () => {
    it('returns valid JSON string', () => {
      const json = manager.getElementsJSON();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(4);
    });

    it('strips createdBy, createdAt, updatedAt from output', () => {
      const json = manager.getElementsJSON();
      const parsed = JSON.parse(json);

      for (const element of parsed) {
        expect(element).not.toHaveProperty('createdBy');
        expect(element).not.toHaveProperty('createdAt');
        expect(element).not.toHaveProperty('updatedAt');
      }
    });

    it('preserves core fields', () => {
      const json = manager.getElementsJSON();
      const parsed = JSON.parse(json);
      const sticky = parsed.find((e: { id: string }) => e.id === 's1');

      expect(sticky).toBeDefined();
      expect(sticky.type).toBe('sticky');
      expect(sticky.x).toBe(10);
      expect(sticky.y).toBe(20);
      expect(sticky.text).toBe('Hello');
      expect(sticky.fill).toBe('#fef08a');
      expect(sticky.width).toBe(100);
      expect(sticky.height).toBe(100);
      expect(sticky.rotation).toBe(0);
    });

    it('includes connector endpoints in detailed output', () => {
      const json = manager.getElementsJSON();
      const parsed = JSON.parse(json);
      const conn = parsed.find((e: { id: string }) => e.id === 'c1');

      expect(conn.fromObjectId).toBe('s1');
      expect(conn.toObjectId).toBe('r1');
      expect(conn.fromAnchor).toBe('right');
      expect(conn.toAnchor).toBe('left');
      expect(conn.points).toEqual([0, 0, 190, 280]);
    });

    it('returns empty array JSON for empty board', () => {
      const mgr = createBoardStateManager(createMockProvider({}));
      const json = mgr.getElementsJSON();

      expect(json).toBe('[]');
    });
  });

  describe('getElementsForAI', () => {
    it('returns summary (no details) when includeDetails is false', () => {
      const elements = manager.getElementsForAI(false);
      const sticky = elements.find((e) => e.id === 's1');

      expect(sticky).toBeDefined();
      expect(sticky?.type).toBe('sticky');
      expect(sticky?.text).toBe('Hello');
      expect(sticky?.stroke).toBeUndefined();
      expect(sticky?.fontSize).toBeUndefined();
    });

    it('returns full details when includeDetails is true', () => {
      const elements = manager.getElementsForAI(true);
      const text = elements.find((e) => e.id === 't1');

      expect(text).toBeDefined();
      expect(text?.fontSize).toBe(24);
    });

    it('never includes createdBy/createdAt/updatedAt', () => {
      const elements = manager.getElementsForAI(true);

      for (const el of elements) {
        expect(el).not.toHaveProperty('createdBy');
        expect(el).not.toHaveProperty('createdAt');
        expect(el).not.toHaveProperty('updatedAt');
      }
    });
  });

  describe('getElementById', () => {
    it('returns object by ID', () => {
      const obj = manager.getElementById('s1');

      expect(obj).toBe(STICKY_1);
    });

    it('returns undefined for unknown ID', () => {
      expect(manager.getElementById('nonexistent')).toBeUndefined();
    });
  });

  describe('getElementsByType', () => {
    it('filters by type', () => {
      const stickies = manager.getElementsByType('sticky');

      expect(stickies).toHaveLength(1);
      expect(stickies[0]?.id).toBe('s1');
    });

    it('returns multiple matches', () => {
      const objects: Record<string, IBoardObject> = {
        ...ALL_OBJECTS,
        r2: makeObject({ id: 'r2', type: 'rectangle', fill: '#f00', x: 400, y: 500 }),
      };
      const mgr = createBoardStateManager(createMockProvider(objects));

      expect(mgr.getElementsByType('rectangle')).toHaveLength(2);
    });

    it('returns empty array for unmatched type', () => {
      expect(manager.getElementsByType('frame')).toHaveLength(0);
    });
  });

  describe('getVersionedStateForAI', () => {
    it('includes AI_STATE_VERSION', () => {
      const versioned = manager.getVersionedStateForAI(false);

      expect(versioned.version).toBe(AI_STATE_VERSION);
      expect(versioned.version).toBe(1);
    });

    it('includes element count', () => {
      const versioned = manager.getVersionedStateForAI(false);

      expect(versioned.elementCount).toBe(4);
    });

    it('includes elements matching getElementsForAI', () => {
      const versioned = manager.getVersionedStateForAI(true);
      const elements = manager.getElementsForAI(true);

      expect(versioned.elements).toEqual(elements);
    });

    it('returns 0 elements for empty board', () => {
      const mgr = createBoardStateManager(createMockProvider({}));
      const versioned = mgr.getVersionedStateForAI(false);

      expect(versioned.elementCount).toBe(0);
      expect(versioned.elements).toEqual([]);
    });

    it('strips internal metadata from elements', () => {
      const versioned = manager.getVersionedStateForAI(true);

      for (const el of versioned.elements) {
        expect(el).not.toHaveProperty('createdBy');
        expect(el).not.toHaveProperty('createdAt');
        expect(el).not.toHaveProperty('updatedAt');
      }
    });
  });
});
