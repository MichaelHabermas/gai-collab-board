import { describe, it, expect } from 'vitest';
import { computeColumnLayout, type IColumnConfig } from '@/modules/ai/layouts/columnLayout';
import { FRAME_PLACEHOLDER_ID } from '@/modules/ai/layouts/layoutUtils';

const CREATED_BY = 'test-user';

function makeConfig(overrides?: Partial<IColumnConfig>): IColumnConfig {
  return {
    title: 'Sprint Retro',
    columns: [
      { heading: 'Start', color: 'green', items: ['Standups', 'Code reviews'] },
      { heading: 'Stop', color: 'pink', items: ['Overtime'] },
      { heading: 'Continue', color: 'blue', items: ['Pair programming', 'Sprint demos'] },
    ],
    ...overrides,
  };
}

describe('computeColumnLayout', () => {
  it('produces a frame as the first object', () => {
    const { objects } = computeColumnLayout(makeConfig(), [], CREATED_BY);

    expect(objects[0]?.type).toBe('frame');
    expect(objects[0]?.text).toBe('Sprint Retro');
  });

  it('creates correct total object count', () => {
    const config = makeConfig();
    const { objects } = computeColumnLayout(config, [], CREATED_BY);
    const totalItems = config.columns.reduce((sum, col) => sum + col.items.length, 0);

    // 1 frame + N headings + M stickies
    const expected = 1 + config.columns.length + totalItems;

    expect(objects.length).toBe(expected);
  });

  it('sets parentFrameId on all non-frame children', () => {
    const { objects } = computeColumnLayout(makeConfig(), [], CREATED_BY);

    for (const obj of objects) {
      if (obj.type !== 'frame') {
        expect(obj.parentFrameId).toBe(FRAME_PLACEHOLDER_ID);
      }
    }
  });

  it('frame encompasses all children', () => {
    const { objects } = computeColumnLayout(makeConfig(), [], CREATED_BY);
    const frame = objects[0];
    if (!frame) {
      throw new Error('No frame');
    }

    for (const obj of objects.slice(1)) {
      expect(obj.x).toBeGreaterThanOrEqual(frame.x);
      expect(obj.y).toBeGreaterThanOrEqual(frame.y);
    }
  });

  it('stacks stickies vertically within each column', () => {
    const { objects } = computeColumnLayout(makeConfig(), [], CREATED_BY);
    const stickies = objects.filter((o) => o.type === 'sticky');

    // Group by approximate x position (same column)
    const colGroups = new Map<number, typeof stickies>();
    for (const s of stickies) {
      const colKey = Math.round(s.x / 10) * 10; // bucket by ~10px
      const group = colGroups.get(colKey) ?? [];
      group.push(s);
      colGroups.set(colKey, group);
    }

    for (const group of colGroups.values()) {
      for (let i = 1; i < group.length; i++) {
        const prev = group[i - 1];
        const curr = group[i];
        if (prev && curr) {
          expect(curr.y).toBeGreaterThan(prev.y);
        }
      }
    }
  });

  it('uses explicit x/y when provided', () => {
    const { objects } = computeColumnLayout(makeConfig({ x: 400, y: 200 }), [], CREATED_BY);

    expect(objects[0]?.x).toBe(400);
    expect(objects[0]?.y).toBe(200);
  });

  it('auto-positions when x/y are omitted', () => {
    const existing = [{ x: 0, y: 0, width: 500, height: 500 }];
    const { objects } = computeColumnLayout(makeConfig(), existing, CREATED_BY);

    expect(objects[0]?.x).toBeGreaterThan(500);
  });

  it('handles a single column', () => {
    const config = makeConfig({
      columns: [{ heading: 'Only', color: 'yellow', items: ['One'] }],
    });
    const { objects } = computeColumnLayout(config, [], CREATED_BY);

    // 1 frame + 1 heading + 1 sticky
    expect(objects.length).toBe(3);
  });

  it('handles columns with zero items', () => {
    const config = makeConfig({
      columns: [
        { heading: 'Empty', items: [] },
        { heading: 'Also Empty', items: [] },
      ],
    });
    const { objects } = computeColumnLayout(config, [], CREATED_BY);

    // 1 frame + 2 headings
    expect(objects.length).toBe(3);
  });

  it('returns FRAME_PLACEHOLDER_ID as frameId', () => {
    const { frameId } = computeColumnLayout(makeConfig(), [], CREATED_BY);

    expect(frameId).toBe(FRAME_PLACEHOLDER_ID);
  });

  it('resolves named colors to hex on stickies', () => {
    const { objects } = computeColumnLayout(makeConfig(), [], CREATED_BY);
    const stickies = objects.filter((o) => o.type === 'sticky');

    for (const sticky of stickies) {
      expect(sticky.fill).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
