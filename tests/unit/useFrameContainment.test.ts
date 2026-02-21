import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { IBoardObject } from '@/types';
import {
  isInsideFrame,
  findContainingFrame,
  getFrameChildren,
  getChildrenBounds,
  resolveParentFrameId,
  resolveParentFrameIdFromFrames,
  hasParentFrame,
} from '@/hooks/useFrameContainment';

// ── Helpers ──────────────────────────────────────────────────────────

const ts = Timestamp.now();

const makeObj = (overrides: Partial<IBoardObject>): IBoardObject => ({
  id: 'obj-1',
  type: 'sticky',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  fill: '#fef08a',
  createdBy: 'user-1',
  createdAt: ts,
  updatedAt: ts,
  ...overrides,
});

const makeFrame = (overrides: Partial<IBoardObject>): IBoardObject =>
  makeObj({ type: 'frame', fill: 'rgba(255,255,255,0.15)', ...overrides });

// ── isInsideFrame ────────────────────────────────────────────────────

describe('isInsideFrame', () => {
  const frameBounds = { x1: 0, y1: 0, x2: 300, y2: 200 };

  it('returns true when object center is inside the frame', () => {
    const objBounds = { x1: 50, y1: 50, x2: 150, y2: 150 }; // center 100,100
    expect(isInsideFrame(objBounds, frameBounds)).toBe(true);
  });

  it('returns false when object center is outside the frame', () => {
    const objBounds = { x1: 400, y1: 400, x2: 500, y2: 500 }; // center 450,450
    expect(isInsideFrame(objBounds, frameBounds)).toBe(false);
  });

  it('returns true when center is exactly on the frame edge', () => {
    // Object center at (300, 100) — exactly on right edge
    const objBounds = { x1: 250, y1: 50, x2: 350, y2: 150 };
    expect(isInsideFrame(objBounds, frameBounds)).toBe(true);
  });

  it('returns false when object overlaps frame but center is outside', () => {
    // Object overlaps frame but center at (310, 100) is outside
    const objBounds = { x1: 260, y1: 50, x2: 360, y2: 150 };
    expect(isInsideFrame(objBounds, frameBounds)).toBe(false);
  });
});

// ── findContainingFrame ──────────────────────────────────────────────

describe('findContainingFrame', () => {
  const bigFrame = makeFrame({ id: 'frame-big', x: 0, y: 0, width: 500, height: 500 });
  const smallFrame = makeFrame({ id: 'frame-small', x: 50, y: 50, width: 200, height: 200 });

  it('returns the frame ID when object is inside one frame', () => {
    const objBounds = { x1: 60, y1: 60, x2: 160, y2: 160 }; // center 110,110
    expect(findContainingFrame(objBounds, [bigFrame])).toBe('frame-big');
  });

  it('returns undefined when object is outside all frames', () => {
    const objBounds = { x1: 600, y1: 600, x2: 700, y2: 700 };
    expect(findContainingFrame(objBounds, [bigFrame, smallFrame])).toBeUndefined();
  });

  it('picks the smallest frame when object is inside multiple overlapping frames', () => {
    const objBounds = { x1: 100, y1: 100, x2: 200, y2: 200 }; // center 150,150 — inside both
    expect(findContainingFrame(objBounds, [bigFrame, smallFrame])).toBe('frame-small');
  });

  it('excludes the frame with excludeId (prevents self-parenting)', () => {
    const objBounds = { x1: 100, y1: 100, x2: 200, y2: 200 };
    expect(findContainingFrame(objBounds, [bigFrame, smallFrame], 'frame-small')).toBe('frame-big');
  });

  it('returns undefined when all frames are excluded', () => {
    const objBounds = { x1: 100, y1: 100, x2: 200, y2: 200 };
    const singleFrame = makeFrame({ id: 'frame-only', x: 0, y: 0, width: 500, height: 500 });
    expect(findContainingFrame(objBounds, [singleFrame], 'frame-only')).toBeUndefined();
  });

  it('returns undefined when frames array is empty', () => {
    const objBounds = { x1: 100, y1: 100, x2: 200, y2: 200 };
    expect(findContainingFrame(objBounds, [])).toBeUndefined();
  });
});

// ── getFrameChildren ─────────────────────────────────────────────────

describe('getFrameChildren', () => {
  it('returns objects whose parentFrameId matches the given frame', () => {
    const objects = [
      makeObj({ id: 'child-1', parentFrameId: 'frame-1' }),
      makeObj({ id: 'child-2', parentFrameId: 'frame-1' }),
      makeObj({ id: 'orphan', parentFrameId: undefined }),
      makeObj({ id: 'other-frame-child', parentFrameId: 'frame-2' }),
    ];
    const children = getFrameChildren('frame-1', objects);
    expect(children).toHaveLength(2);
    expect(children.map((c) => c.id)).toEqual(['child-1', 'child-2']);
  });

  it('returns empty array when frame has no children', () => {
    const objects = [makeObj({ id: 'orphan' })];
    expect(getFrameChildren('frame-1', objects)).toHaveLength(0);
  });

  it('returns empty array when objects array is empty', () => {
    expect(getFrameChildren('frame-1', [])).toHaveLength(0);
  });
});

// ── getChildrenBounds ────────────────────────────────────────────────

describe('getChildrenBounds', () => {
  it('returns null when frame has no children', () => {
    const objects = [makeObj({ id: 'orphan' })];
    expect(getChildrenBounds('frame-1', objects)).toBeNull();
  });

  it('returns null when objects array is empty', () => {
    expect(getChildrenBounds('frame-1', [])).toBeNull();
  });

  it('returns bounding box of all direct children', () => {
    const frame = makeFrame({ id: 'frame-1' });
    const child1 = makeObj({ id: 'c1', parentFrameId: 'frame-1', x: 10, y: 20, width: 50, height: 30 });
    const child2 = makeObj({ id: 'c2', parentFrameId: 'frame-1', x: 70, y: 5, width: 20, height: 25 });
    const objects = [frame, child1, child2];
    const bounds = getChildrenBounds('frame-1', objects);
    expect(bounds).not.toBeNull();
    expect(bounds?.x).toBe(10);
    expect(bounds?.y).toBe(5);
    expect(bounds?.width).toBe(80);
    expect(bounds?.height).toBe(45);
  });
});

// ── hasParentFrame ───────────────────────────────────────────────────

describe('hasParentFrame', () => {
  it('returns true when parentFrameId is a non-empty string', () => {
    expect(hasParentFrame(makeObj({ parentFrameId: 'frame-1' }))).toBe(true);
  });

  it('returns false when parentFrameId is undefined', () => {
    expect(hasParentFrame(makeObj({ parentFrameId: undefined }))).toBe(false);
  });

  it('returns false when parentFrameId is empty string', () => {
    expect(hasParentFrame(makeObj({ parentFrameId: '' }))).toBe(false);
  });
});

// ── resolveParentFrameId ─────────────────────────────────────────────

describe('resolveParentFrameId', () => {
  const frame = makeFrame({ id: 'frame-1', x: 0, y: 0, width: 300, height: 300 });

  it('returns frame ID when sticky center is inside the frame', () => {
    const sticky = makeObj({ id: 'sticky-1', x: 50, y: 50, width: 100, height: 100 });
    const bounds = { x1: 50, y1: 50, x2: 150, y2: 150 }; // center 100,100
    expect(resolveParentFrameId(sticky, bounds, [frame, sticky])).toBe('frame-1');
  });

  it('returns undefined when sticky center is outside all frames', () => {
    const sticky = makeObj({ id: 'sticky-1', x: 400, y: 400, width: 100, height: 100 });
    const bounds = { x1: 400, y1: 400, x2: 500, y2: 500 };
    expect(resolveParentFrameId(sticky, bounds, [frame, sticky])).toBeUndefined();
  });

  it('returns undefined for frame objects (frames cannot be parented)', () => {
    const childFrame = makeFrame({ id: 'frame-2', x: 50, y: 50, width: 100, height: 100 });
    const bounds = { x1: 50, y1: 50, x2: 150, y2: 150 };
    expect(resolveParentFrameId(childFrame, bounds, [frame, childFrame])).toBeUndefined();
  });

  it('returns undefined for connector objects (connectors cannot be parented)', () => {
    const connector = makeObj({ id: 'conn-1', type: 'connector', x: 50, y: 50, width: 100, height: 100 });
    const bounds = { x1: 50, y1: 50, x2: 150, y2: 150 };
    expect(resolveParentFrameId(connector, bounds, [frame, connector])).toBeUndefined();
  });

  it('returns the smallest enclosing frame when multiple frames overlap', () => {
    const bigFrame = makeFrame({ id: 'frame-big', x: 0, y: 0, width: 500, height: 500 });
    const smallFrame = makeFrame({ id: 'frame-small', x: 50, y: 50, width: 200, height: 200 });
    const sticky = makeObj({ id: 'sticky-1', x: 100, y: 100, width: 50, height: 50 });
    const bounds = { x1: 100, y1: 100, x2: 150, y2: 150 }; // center 125,125
    expect(resolveParentFrameId(sticky, bounds, [bigFrame, smallFrame, sticky])).toBe('frame-small');
  });
});

// ── resolveParentFrameIdFromFrames ───────────────────────────────────

describe('resolveParentFrameIdFromFrames', () => {
  const frames = [
    makeFrame({ id: 'frame-1', x: 0, y: 0, width: 300, height: 300 }),
  ];

  it('returns undefined for frame objects', () => {
    const childFrame = makeFrame({ id: 'frame-2', x: 50, y: 50, width: 100, height: 100 });
    const bounds = { x1: 50, y1: 50, x2: 150, y2: 150 };
    expect(resolveParentFrameIdFromFrames(childFrame, bounds, frames)).toBeUndefined();
  });

  it('returns undefined for connector objects', () => {
    const connector = makeObj({
      id: 'conn-1',
      type: 'connector',
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });
    const bounds = { x1: 50, y1: 50, x2: 150, y2: 150 };
    expect(resolveParentFrameIdFromFrames(connector, bounds, frames)).toBeUndefined();
  });

  it('returns frame ID when sticky center is inside a frame', () => {
    const sticky = makeObj({ id: 'sticky-1', x: 50, y: 50, width: 100, height: 100 });
    const bounds = { x1: 50, y1: 50, x2: 150, y2: 150 };
    expect(resolveParentFrameIdFromFrames(sticky, bounds, frames)).toBe('frame-1');
  });

  it('returns undefined when sticky center is outside all frames', () => {
    const sticky = makeObj({ id: 'sticky-1', x: 400, y: 400, width: 100, height: 100 });
    const bounds = { x1: 400, y1: 400, x2: 500, y2: 500 };
    expect(resolveParentFrameIdFromFrames(sticky, bounds, frames)).toBeUndefined();
  });
});
