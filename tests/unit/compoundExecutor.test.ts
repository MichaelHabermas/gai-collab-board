import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  createCompoundExecutor,
  COMPOUND_TOOL_NAMES,
  type ICompoundExecutorContext,
} from '@/modules/ai/compoundExecutor';
import type { IBoardObject } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely extract the Nth positional arg from the first call to a mock. */
function firstCallArg<T>(mock: ReturnType<typeof vi.fn>, argIndex: number): T {
  const call = mock.mock.calls[0];
  if (!call) throw new Error('Mock was never called');

  return call[argIndex] as T;
}

/** Type-safe array index access that narrows out undefined. */
function nth<T>(arr: T[], index: number): T {
  const val = arr[index];
  if (!val) throw new Error(`Index ${String(index)} out of bounds`);

  return val;
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return val != null && typeof val === 'object' && !Array.isArray(val);
}

function expectSuccess(result: unknown): void {
  expect(isRecord(result) && result.success).toBe(true);
}

function expectFailure(result: unknown): void {
  expect(isRecord(result) && result.success).toBe(false);
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/connectorAnchors', () => ({
  getAnchorPosition: (
    obj: { x: number; y: number; width: number; height: number },
    anchor: string,
  ) => {
    switch (anchor) {
      case 'right':
        return { x: obj.x + obj.width, y: obj.y + obj.height / 2 };
      case 'left':
        return { x: obj.x, y: obj.y + obj.height / 2 };
      case 'bottom':
        return { x: obj.x + obj.width / 2, y: obj.y + obj.height };
      case 'top':
        return { x: obj.x + obj.width / 2, y: obj.y };
      default:
        return { x: obj.x, y: obj.y };
    }
  },
}));

const mockCreateObject = vi.fn();
const mockCreateObjectsBatch = vi.fn();
const mockUpdateObject = vi.fn();
const mockUpdateObjectsBatch = vi.fn();

const now = Timestamp.now();
const BOARD_ID = 'board-1';
const USER_ID = 'user-1';

function makeObj(overrides: Partial<IBoardObject> & { id: string }): IBoardObject {
  return {
    type: 'sticky',
    x: 0,
    y: 0,
    width: 200,
    height: 120,
    rotation: 0,
    fill: '#fef08a',
    createdBy: USER_ID,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createCtx(objects: IBoardObject[] = []): ICompoundExecutorContext {
  return {
    boardId: BOARD_ID,
    createdBy: USER_ID,
    getObjects: () => objects,
    createObject: mockCreateObject,
    createObjectsBatch: mockCreateObjectsBatch,
    updateObject: mockUpdateObject,
    updateObjectsBatch: mockUpdateObjectsBatch,
  };
}

describe('compoundExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObject.mockResolvedValue(makeObj({ id: 'new-1' }));
    mockCreateObjectsBatch.mockImplementation((_: string, objs: unknown[]) =>
      Promise.resolve(objs.map((__, i) => makeObj({ id: `batch-${String(i)}` }))),
    );
    mockUpdateObject.mockResolvedValue(undefined);
    mockUpdateObjectsBatch.mockResolvedValue(undefined);
  });

  it('returns null for unknown tools', async () => {
    const { execute } = createCompoundExecutor(createCtx());
    const result = await execute({ name: 'unknownTool', arguments: {} });

    expect(result).toBeNull();
  });

  it('COMPOUND_TOOL_NAMES contains all 12 tools', () => {
    expect(COMPOUND_TOOL_NAMES.size).toBe(12);
  });

  // -------------------------------------------------------------------------
  // batchCreate
  // -------------------------------------------------------------------------

  describe('batchCreate', () => {
    it('creates multiple objects', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'batchCreate',
        arguments: {
          objects: [
            { type: 'sticky', x: 0, y: 0, text: 'A' },
            { type: 'rectangle', x: 100, y: 100 },
          ],
        },
      });

      expect(mockCreateObjectsBatch).toHaveBeenCalledTimes(1);
      const params = firstCallArg<Array<Record<string, unknown>>>(mockCreateObjectsBatch, 1);

      expect(params).toHaveLength(2);
      expect(nth(params, 0).type).toBe('sticky');
      expect(nth(params, 1).type).toBe('rectangle');
      expectSuccess(result);
    });

    it('rejects empty objects array', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({ name: 'batchCreate', arguments: { objects: [] } });

      expectFailure(result);
    });

    it('caps at 50 objects', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const objects = Array.from({ length: 60 }, (_, i) => ({
        type: 'sticky', x: i * 10, y: 0,
      }));
      await execute({ name: 'batchCreate', arguments: { objects } });

      expect(firstCallArg<unknown[]>(mockCreateObjectsBatch, 1)).toHaveLength(50);
    });
  });

  // -------------------------------------------------------------------------
  // batchUpdate
  // -------------------------------------------------------------------------

  describe('batchUpdate', () => {
    it('applies multiple updates', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'batchUpdate',
        arguments: {
          updates: [
            { objectId: 'a', changes: { x: 10, y: 20 } },
            { objectId: 'b', changes: { fill: 'red' } },
          ],
        },
      });

      expect(mockUpdateObjectsBatch).toHaveBeenCalledTimes(1);
      const mapped = firstCallArg<Array<{ objectId: string; updates: Record<string, unknown> }>>(mockUpdateObjectsBatch, 1);

      expect(mapped).toHaveLength(2);
      expect(nth(mapped, 0).objectId).toBe('a');
      expect(nth(mapped, 0).updates.x).toBe(10);
      expectSuccess(result);
    });

    it('rejects empty updates', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({ name: 'batchUpdate', arguments: { updates: [] } });

      expectFailure(result);
    });
  });

  // -------------------------------------------------------------------------
  // groupIntoFrame
  // -------------------------------------------------------------------------

  describe('groupIntoFrame', () => {
    it('creates frame around objects and updates parentFrameId', async () => {
      const objects = [
        makeObj({ id: 'obj-1', x: 100, y: 100, width: 200, height: 120 }),
        makeObj({ id: 'obj-2', x: 400, y: 200, width: 200, height: 120 }),
      ];
      mockCreateObject.mockResolvedValue(makeObj({ id: 'frame-1', type: 'frame' }));

      const { execute } = createCompoundExecutor(createCtx(objects));
      const result = await execute({
        name: 'groupIntoFrame',
        arguments: { objectIds: ['obj-1', 'obj-2'], title: 'My Group' },
      });

      expect(mockCreateObject).toHaveBeenCalledTimes(1);
      const frameParams = firstCallArg<Record<string, unknown>>(mockCreateObject, 1);

      expect(frameParams.type).toBe('frame');
      expect(mockUpdateObjectsBatch).toHaveBeenCalledTimes(1);
      expect(isRecord(result) && result.frameId).toBe('frame-1');
    });

    it('returns error when no matching objects found', async () => {
      const { execute } = createCompoundExecutor(createCtx([]));
      const result = await execute({
        name: 'groupIntoFrame',
        arguments: { objectIds: ['nonexistent'], title: 'X' },
      });

      expectFailure(result);
    });
  });

  // -------------------------------------------------------------------------
  // connectSequence
  // -------------------------------------------------------------------------

  describe('connectSequence', () => {
    it('creates connectors between sequential objects', async () => {
      const objects = [
        makeObj({ id: 'a', x: 0, y: 0, width: 100, height: 50 }),
        makeObj({ id: 'b', x: 200, y: 0, width: 100, height: 50 }),
        makeObj({ id: 'c', x: 400, y: 0, width: 100, height: 50 }),
      ];

      const { execute } = createCompoundExecutor(createCtx(objects));
      await execute({
        name: 'connectSequence',
        arguments: { objectIds: ['a', 'b', 'c'], style: 'arrow' },
      });

      expect(mockCreateObjectsBatch).toHaveBeenCalledTimes(1);
      const connectors = firstCallArg<Array<Record<string, unknown>>>(mockCreateObjectsBatch, 1);

      expect(connectors).toHaveLength(2);
      expect(nth(connectors, 0).type).toBe('connector');
      expect(nth(connectors, 0).fromObjectId).toBe('a');
      expect(nth(connectors, 0).toObjectId).toBe('b');
      expect(nth(connectors, 0).arrowheads).toBe('end');
    });

    it('uses dashed strokeStyle when style is dashed', async () => {
      const objects = [
        makeObj({ id: 'a', x: 0, y: 0, width: 100, height: 50 }),
        makeObj({ id: 'b', x: 200, y: 0, width: 100, height: 50 }),
      ];

      const { execute } = createCompoundExecutor(createCtx(objects));
      await execute({
        name: 'connectSequence',
        arguments: { objectIds: ['a', 'b'], style: 'dashed' },
      });

      const connectors = firstCallArg<Array<Record<string, unknown>>>(mockCreateObjectsBatch, 1);

      expect(nth(connectors, 0).strokeStyle).toBe('dashed');
    });

    it('rejects fewer than 2 objectIds', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'connectSequence',
        arguments: { objectIds: ['a'] },
      });

      expectFailure(result);
    });
  });

  // -------------------------------------------------------------------------
  // setArrowheads / setStrokeStyle / setRotation
  // -------------------------------------------------------------------------

  describe('setArrowheads', () => {
    it('updates arrowheads on a connector', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'setArrowheads',
        arguments: { objectId: 'conn-1', arrowheads: 'both' },
      });

      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'conn-1', { arrowheads: 'both' });
      expectSuccess(result);
    });

    it('rejects invalid arrowhead mode', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'setArrowheads',
        arguments: { objectId: 'conn-1', arrowheads: 'invalid' },
      });

      expectFailure(result);
    });
  });

  describe('setStrokeStyle', () => {
    it('updates strokeStyle', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      await execute({
        name: 'setStrokeStyle',
        arguments: { objectId: 'obj-1', strokeStyle: 'dotted' },
      });

      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'obj-1', { strokeStyle: 'dotted' });
    });
  });

  describe('setRotation', () => {
    it('normalizes rotation to 0-360', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      await execute({
        name: 'setRotation',
        arguments: { objectId: 'obj-1', rotation: -90 },
      });

      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'obj-1', { rotation: 270 });
    });
  });

  // -------------------------------------------------------------------------
  // getObjectDetails
  // -------------------------------------------------------------------------

  describe('getObjectDetails', () => {
    it('returns object properties', async () => {
      const obj = makeObj({
        id: 'obj-1',
        x: 50, y: 60, width: 200, height: 120,
        text: 'Hello', fill: '#fef08a',
      });

      const { execute } = createCompoundExecutor(createCtx([obj]));
      const result = await execute({
        name: 'getObjectDetails',
        arguments: { objectId: 'obj-1' },
      });

      expectSuccess(result);
      expect(isRecord(result) && isRecord(result.object) && result.object.id).toBe('obj-1');
      expect(isRecord(result) && isRecord(result.object) && result.object.text).toBe('Hello');
    });

    it('returns error for missing object', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'getObjectDetails',
        arguments: { objectId: 'nonexistent' },
      });

      expectFailure(result);
    });

    it('returns error when objectId is not a string', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'getObjectDetails',
        arguments: { objectId: 123 },
      });

      expectFailure(result);
    });

    it('includes connector fields when object has fromObjectId', async () => {
      const obj = makeObj({
        id: 'conn-1',
        type: 'connector',
        fromObjectId: 'a',
        toObjectId: 'b',
      });

      const { execute } = createCompoundExecutor(createCtx([obj]));
      const result = await execute({
        name: 'getObjectDetails',
        arguments: { objectId: 'conn-1' },
      });

      expectSuccess(result);
      const details = isRecord(result) && isRecord(result.object) ? result.object : {};
      expect(details.fromObjectId).toBe('a');
      expect(details.toObjectId).toBe('b');
    });

    it('omits connector fields when object has no fromObjectId', async () => {
      const obj = makeObj({ id: 'sticky-1', type: 'sticky' });

      const { execute } = createCompoundExecutor(createCtx([obj]));
      const result = await execute({
        name: 'getObjectDetails',
        arguments: { objectId: 'sticky-1' },
      });

      expectSuccess(result);
      const details = isRecord(result) && isRecord(result.object) ? result.object : {};
      expect(details.fromObjectId).toBeUndefined();
      expect(details.toObjectId).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // batchCreate — additional branch coverage
  // -------------------------------------------------------------------------

  describe('batchCreate — additional branches', () => {
    it('rejects non-array objects argument', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'batchCreate',
        arguments: { objects: 'not-an-array' },
      });

      expectFailure(result);
    });

    it('passes optional fontSize and opacity fields', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      await execute({
        name: 'batchCreate',
        arguments: {
          objects: [
            { type: 'sticky', x: 0, y: 0, text: 'Test', fontSize: 24, opacity: 0.5 },
          ],
        },
      });

      const params = firstCallArg<Array<Record<string, unknown>>>(mockCreateObjectsBatch, 1);
      expect(nth(params, 0).fontSize).toBe(24);
      expect(nth(params, 0).opacity).toBe(0.5);
      expect(nth(params, 0).text).toBe('Test');
    });

    it('resolves named color via color field', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      await execute({
        name: 'batchCreate',
        arguments: {
          objects: [{ type: 'sticky', x: 0, y: 0, color: 'blue' }],
        },
      });

      const params = firstCallArg<Array<Record<string, unknown>>>(mockCreateObjectsBatch, 1);
      // 'blue' should resolve via resolveStickyColor
      expect(typeof nth(params, 0).fill).toBe('string');
    });

    it('uses default width/height for unknown type', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      await execute({
        name: 'batchCreate',
        arguments: {
          objects: [{ type: 'unknown_shape', x: 0, y: 0 }],
        },
      });

      const params = firstCallArg<Array<Record<string, unknown>>>(mockCreateObjectsBatch, 1);
      // unknown type resolves to 'sticky' with default dimensions
      expect(nth(params, 0).type).toBe('sticky');
    });
  });

  // -------------------------------------------------------------------------
  // batchUpdate — additional branch coverage
  // -------------------------------------------------------------------------

  describe('batchUpdate — additional branches', () => {
    it('caps updates at 50', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const updates = Array.from({ length: 60 }, (_, i) => ({
        objectId: `obj-${i}`,
        changes: { x: i },
      }));
      await execute({ name: 'batchUpdate', arguments: { updates } });

      const mapped = firstCallArg<unknown[]>(mockUpdateObjectsBatch, 1);
      expect(mapped).toHaveLength(50);
    });

    it('filters out updates with missing objectId', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'batchUpdate',
        arguments: {
          updates: [
            { objectId: 'a', changes: { x: 10 } },
            { changes: { x: 20 } }, // missing objectId
            { objectId: 123, changes: { x: 30 } }, // non-string objectId
          ],
        },
      });

      const mapped = firstCallArg<Array<{ objectId: string }>>(mockUpdateObjectsBatch, 1);
      expect(mapped).toHaveLength(1);
      expect(nth(mapped, 0).objectId).toBe('a');
      expectSuccess(result);
    });

    it('filters out updates with missing changes', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'batchUpdate',
        arguments: {
          updates: [
            { objectId: 'a' }, // no changes property
          ],
        },
      });

      // All filtered out => mapped.length === 0 => failure
      expectFailure(result);
    });

    it('rejects non-array updates argument', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'batchUpdate',
        arguments: { updates: 'not-an-array' },
      });

      expectFailure(result);
    });
  });

  // -------------------------------------------------------------------------
  // groupIntoFrame — additional branches
  // -------------------------------------------------------------------------

  describe('groupIntoFrame — additional branches', () => {
    it('rejects non-array objectIds', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'groupIntoFrame',
        arguments: { objectIds: 'not-an-array', title: 'X' },
      });

      expectFailure(result);
    });

    it('rejects empty objectIds array', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'groupIntoFrame',
        arguments: { objectIds: [], title: 'X' },
      });

      expectFailure(result);
    });

    it('uses default title and padding when not provided', async () => {
      const objects = [makeObj({ id: 'obj-1', x: 50, y: 50, width: 100, height: 100 })];
      mockCreateObject.mockResolvedValue(makeObj({ id: 'frame-1', type: 'frame' }));

      const { execute } = createCompoundExecutor(createCtx(objects));
      const result = await execute({
        name: 'groupIntoFrame',
        arguments: { objectIds: ['obj-1'] },
      });

      expectSuccess(result);
      const frameParams = firstCallArg<Record<string, unknown>>(mockCreateObject, 1);
      expect(frameParams.text).toBe('Group'); // default title
    });
  });

  // -------------------------------------------------------------------------
  // connectSequence — additional branches
  // -------------------------------------------------------------------------

  describe('connectSequence — additional branches', () => {
    it('returns failure when no valid object pairs found (missing objects)', async () => {
      const { execute } = createCompoundExecutor(createCtx([]));
      const result = await execute({
        name: 'connectSequence',
        arguments: { objectIds: ['missing-a', 'missing-b'] },
      });

      expectFailure(result);
    });

    it('uses vertical direction anchors when direction is vertical', async () => {
      const objects = [
        makeObj({ id: 'a', x: 0, y: 0, width: 100, height: 50 }),
        makeObj({ id: 'b', x: 0, y: 200, width: 100, height: 50 }),
      ];

      const { execute } = createCompoundExecutor(createCtx(objects));
      await execute({
        name: 'connectSequence',
        arguments: { objectIds: ['a', 'b'], direction: 'vertical' },
      });

      const connectors = firstCallArg<Array<Record<string, unknown>>>(mockCreateObjectsBatch, 1);
      expect(nth(connectors, 0).fromAnchor).toBe('bottom');
      expect(nth(connectors, 0).toAnchor).toBe('top');
    });

    it('uses line style with arrowheads none', async () => {
      const objects = [
        makeObj({ id: 'a', x: 0, y: 0, width: 100, height: 50 }),
        makeObj({ id: 'b', x: 200, y: 0, width: 100, height: 50 }),
      ];

      const { execute } = createCompoundExecutor(createCtx(objects));
      await execute({
        name: 'connectSequence',
        arguments: { objectIds: ['a', 'b'], style: 'line' },
      });

      const connectors = firstCallArg<Array<Record<string, unknown>>>(mockCreateObjectsBatch, 1);
      expect(nth(connectors, 0).arrowheads).toBe('none');
    });

    it('skips pairs where one object is missing', async () => {
      const objects = [
        makeObj({ id: 'a', x: 0, y: 0, width: 100, height: 50 }),
        // 'b' is missing
        makeObj({ id: 'c', x: 400, y: 0, width: 100, height: 50 }),
      ];

      const { execute } = createCompoundExecutor(createCtx(objects));
      await execute({
        name: 'connectSequence',
        arguments: { objectIds: ['a', 'b', 'c'] },
      });

      // Only a→c pair would be skipped because b is missing. a→b fails, b→c fails.
      // So no valid connectors are made; but actually a→b fails (no b), b→c fails (no b).
      // The result would be failure since no connectors created
      // Actually: connParams pushes only when both fromObj and toObj exist.
      // a,b: fromObj=a exists, toObj=b doesn't => skip
      // b,c: fromObj=b doesn't exist, toObj=c exists => skip
      // result: 0 connParams => failure
      expect(mockCreateObjectsBatch).not.toHaveBeenCalled();
    });

    it('rejects non-array objectIds', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'connectSequence',
        arguments: { objectIds: 'not-array' },
      });

      expectFailure(result);
    });
  });

  // -------------------------------------------------------------------------
  // setArrowheads / setStrokeStyle / setRotation — missing objectId branches
  // -------------------------------------------------------------------------

  describe('setArrowheads — missing objectId', () => {
    it('rejects when objectId is not a string', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'setArrowheads',
        arguments: { objectId: 123, arrowheads: 'both' },
      });

      expectFailure(result);
    });
  });

  describe('setStrokeStyle — additional branches', () => {
    it('rejects when objectId is not a string', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'setStrokeStyle',
        arguments: { objectId: 123, strokeStyle: 'dashed' },
      });

      expectFailure(result);
    });

    it('rejects invalid stroke style', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'setStrokeStyle',
        arguments: { objectId: 'obj-1', strokeStyle: 'wavy' },
      });

      expectFailure(result);
    });
  });

  describe('setRotation — additional branches', () => {
    it('rejects when objectId is not a string', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'setRotation',
        arguments: { objectId: 123, rotation: 45 },
      });

      expectFailure(result);
    });

    it('normalizes rotation > 360', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      await execute({
        name: 'setRotation',
        arguments: { objectId: 'obj-1', rotation: 450 },
      });

      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'obj-1', { rotation: 90 });
    });
  });

  // -------------------------------------------------------------------------
  // Layout tools — invalid config branches (null return from buildXConfig)
  // -------------------------------------------------------------------------

  describe('createQuadrant', () => {
    it('returns failure when config is invalid (missing title)', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'createQuadrant',
        arguments: { quadrants: {} },
      });

      expectFailure(result);
    });

    it('returns failure when quadrant data is incomplete', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'createQuadrant',
        arguments: {
          title: 'SWOT',
          quadrants: {
            topLeft: { label: 'Strengths', items: ['a'] },
            // missing topRight, bottomLeft, bottomRight
          },
        },
      });

      expectFailure(result);
    });

    it('succeeds with valid quadrant config', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'createQuadrant',
        arguments: {
          title: 'SWOT Analysis',
          quadrants: {
            topLeft: { label: 'Strengths', items: ['Strong brand'] },
            topRight: { label: 'Weaknesses', items: ['Slow delivery'] },
            bottomLeft: { label: 'Opportunities', items: ['New market'] },
            bottomRight: { label: 'Threats', items: ['Competition'] },
          },
        },
      });

      expectSuccess(result);
      expect(mockCreateObject).toHaveBeenCalledTimes(1); // frame
    });
  });

  describe('createColumnLayout', () => {
    it('returns failure when config is invalid (missing title)', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'createColumnLayout',
        arguments: { columns: [] },
      });

      expectFailure(result);
    });

    it('returns failure when columns array has no valid entries', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'createColumnLayout',
        arguments: {
          title: 'Kanban',
          columns: [{ notAHeading: true }],
        },
      });

      expectFailure(result);
    });

    it('succeeds with valid column config', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'createColumnLayout',
        arguments: {
          title: 'Kanban Board',
          columns: [
            { heading: 'Todo', items: ['Task 1'] },
            { heading: 'Done', items: ['Task 2'] },
          ],
        },
      });

      expectSuccess(result);
    });
  });

  describe('createFlowchart', () => {
    it('returns failure when config is invalid (missing nodes)', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'createFlowchart',
        arguments: { edges: [] },
      });

      expectFailure(result);
    });

    it('returns failure when config is invalid (missing edges)', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'createFlowchart',
        arguments: { nodes: [] },
      });

      expectFailure(result);
    });

    it('reaches computeFlowchartLayout with valid config (dagre unavailable in test env)', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      // Valid config passes buildFlowchartConfig (non-null path), but dagre is not
      // available in the test environment so computeFlowchartLayout throws.
      // This still covers the `if (!config)` false branch.
      await expect(
        execute({
          name: 'createFlowchart',
          arguments: {
            nodes: [
              { id: 'start', label: 'Start' },
              { id: 'end', label: 'End' },
            ],
            edges: [{ from: 'start', to: 'end' }],
          },
        })
      ).rejects.toThrow('dagre');
    });
  });

  describe('createMindMap', () => {
    it('returns failure when config is invalid (missing centralTopic)', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'createMindMap',
        arguments: { branches: [] },
      });

      expectFailure(result);
    });

    it('returns failure when branches is not an array', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'createMindMap',
        arguments: { centralTopic: 'Ideas', branches: 'not-array' },
      });

      expectFailure(result);
    });

    it('succeeds with valid mind map config', async () => {
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'createMindMap',
        arguments: {
          centralTopic: 'Project Ideas',
          branches: [
            { label: 'Frontend', children: ['React', 'Vue'] },
            { label: 'Backend', children: ['Node', 'Go'] },
          ],
        },
      });

      expectSuccess(result);
    });
  });

  // -------------------------------------------------------------------------
  // executeLayout — edge case: layout with no child params
  // -------------------------------------------------------------------------

  describe('layout with zero children after frame', () => {
    it('creates frame only when layout has no child objects', async () => {
      // A mind map with no branches produces frame + central topic only
      // but zero children means the createObjectsBatch path is still exercised
      const { execute } = createCompoundExecutor(createCtx());
      const result = await execute({
        name: 'createMindMap',
        arguments: {
          centralTopic: 'Lone Topic',
          branches: [],
        },
      });

      expectSuccess(result);
    });
  });
});
