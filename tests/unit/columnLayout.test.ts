import { describe, it, expect } from 'vitest';
import { computeColumnLayout, type IColumnConfig } from '@/modules/ai/layouts/columnLayout';
import {
  FRAME_PLACEHOLDER_ID,
  DEFAULT_STICKY_WIDTH,
  DEFAULT_STICKY_HEIGHT,
  DEFAULT_FRAME_PADDING,
} from '@/modules/ai/layouts/layoutUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nth<T>(arr: T[], index: number): T {
  const val = arr[index];
  if (!val) throw new Error(`Index ${String(index)} out of bounds`);

  return val;
}

// ---------------------------------------------------------------------------
// Constants mirrored from implementation (column-specific)
// ---------------------------------------------------------------------------

const COLUMN_WIDTH = DEFAULT_STICKY_WIDTH + 40; // 240
const COLUMN_GAP = 20;
const STICKY_GAP = 15;
const HEADING_HEIGHT = 40;
const CREATED_BY = 'test-user';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeColumnLayout', () => {
  it('frame is the first object with type frame', () => {
    const { objects } = computeColumnLayout(makeConfig(), [], CREATED_BY);

    expect(nth(objects, 0).type).toBe('frame');
    expect(nth(objects, 0).text).toBe('Sprint Retro');
  });

  it('returns FRAME_PLACEHOLDER_ID as frameId', () => {
    const { frameId } = computeColumnLayout(makeConfig(), [], CREATED_BY);

    expect(frameId).toBe(FRAME_PLACEHOLDER_ID);
  });

  it('correct total object count: 1 frame + N headings + sum(items) stickies', () => {
    const config = makeConfig();
    const { objects } = computeColumnLayout(config, [], CREATED_BY);
    const totalItems = config.columns.reduce((sum, col) => sum + col.items.length, 0);
    const expected = 1 + config.columns.length + totalItems;

    expect(objects).toHaveLength(expected);
  });

  it('all non-frame children have parentFrameId = FRAME_PLACEHOLDER_ID', () => {
    const { objects } = computeColumnLayout(makeConfig(), [], CREATED_BY);

    for (const obj of objects) {
      if (obj.type !== 'frame') {
        expect(obj.parentFrameId).toBe(FRAME_PLACEHOLDER_ID);
      }
    }
  });

  it('headings are type text', () => {
    const config = makeConfig({
      columns: [{ heading: 'OnlyCol', items: [] }],
    });
    const { objects } = computeColumnLayout(config, [], CREATED_BY);
    // objects[0] = frame, objects[1] = heading
    expect(nth(objects, 1).type).toBe('text');
  });

  it('stickies are type sticky', () => {
    const config = makeConfig({
      columns: [{ heading: 'Col', items: ['A', 'B'] }],
    });
    const { objects } = computeColumnLayout(config, [], CREATED_BY);
    // objects[0] = frame, [1] = heading, [2..3] = stickies
    expect(nth(objects, 2).type).toBe('sticky');
    expect(nth(objects, 3).type).toBe('sticky');
  });

  it('stickies within a column have strictly increasing y values', () => {
    const config = makeConfig({
      columns: [{ heading: 'Col', items: ['First', 'Second', 'Third'] }],
    });
    const { objects } = computeColumnLayout(config, [], CREATED_BY);
    const stickies = objects.filter((o) => o.type === 'sticky');

    for (let i = 1; i < stickies.length; i++) {
      const prev = nth(stickies, i - 1);
      const curr = nth(stickies, i);

      expect(curr.y).toBeGreaterThan(prev.y);
    }
  });

  it('y spacing between consecutive stickies equals DEFAULT_STICKY_HEIGHT + STICKY_GAP', () => {
    const config = makeConfig({
      columns: [{ heading: 'Col', items: ['A', 'B'] }],
    });
    const { objects } = computeColumnLayout(config, [], CREATED_BY);
    // [0]=frame [1]=heading [2]=sticky0 [3]=sticky1
    const s0 = nth(objects, 2);
    const s1 = nth(objects, 3);

    expect(s1.y - s0.y).toBe(DEFAULT_STICKY_HEIGHT + STICKY_GAP);
  });

  it('named color resolves to hex fill on stickies', () => {
    const config = makeConfig({
      columns: [{ heading: 'H', color: 'pink', items: ['Item'] }],
    });
    const { objects } = computeColumnLayout(config, [], CREATED_BY);
    const stickies = objects.filter((o) => o.type === 'sticky');

    for (const sticky of stickies) {
      expect(sticky.fill).toMatch(/^#[0-9a-f]{6}$/i);
    }

    // pink → #fda4af specifically
    expect(nth(stickies, 0).fill).toBe('#fda4af');
  });

  it('explicit x/y positions the frame at those coords', () => {
    const { objects } = computeColumnLayout(makeConfig({ x: 500, y: 300 }), [], CREATED_BY);

    expect(nth(objects, 0).x).toBe(500);
    expect(nth(objects, 0).y).toBe(300);
  });

  it('auto-positions to the right of existing objects when x/y omitted', () => {
    const existing = [{ x: 0, y: 0, width: 500, height: 500 }];
    const { objects } = computeColumnLayout(makeConfig(), existing, CREATED_BY);

    // findOpenSpace: bbox.x + bbox.width + 60 = 0 + 500 + 60 = 560
    expect(nth(objects, 0).x).toBe(560);
    expect(nth(objects, 0).y).toBe(0);
  });

  it('single column: 1 frame + 1 heading + N stickies', () => {
    const config = makeConfig({
      columns: [{ heading: 'Only', color: 'yellow', items: ['One', 'Two'] }],
    });
    const { objects } = computeColumnLayout(config, [], CREATED_BY);

    // 1 + 1 + 2 = 4
    expect(objects).toHaveLength(4);
  });

  it('empty items column produces only heading with no stickies', () => {
    const config = makeConfig({
      columns: [{ heading: 'Empty', items: [] }],
    });
    const { objects } = computeColumnLayout(config, [], CREATED_BY);

    // 1 frame + 1 heading = 2; zero stickies
    expect(objects).toHaveLength(2);
    expect(nth(objects, 1).type).toBe('text');
  });

  it('frame width accounts for column count, gaps, and padding', () => {
    const colCount = 2;
    const config = makeConfig({
      columns: [
        { heading: 'A', items: [] },
        { heading: 'B', items: [] },
      ],
    });
    const { objects } = computeColumnLayout(config, [], CREATED_BY);
    const expectedW =
      COLUMN_WIDTH * colCount + COLUMN_GAP * (colCount - 1) + DEFAULT_FRAME_PADDING * 2;

    expect(nth(objects, 0).width).toBe(expectedW);
  });

  it('frame height accounts for max item count, gaps, and padding', () => {
    // col0: 3 items, col1: 1 item — max = 3
    const config = makeConfig({
      columns: [
        { heading: 'A', items: ['1', '2', '3'] },
        { heading: 'B', items: ['X'] },
      ],
    });
    const { objects } = computeColumnLayout(config, [], CREATED_BY);
    const maxItems = 3;
    const gridH = HEADING_HEIGHT + maxItems * (DEFAULT_STICKY_HEIGHT + STICKY_GAP);
    const expectedH = gridH + DEFAULT_FRAME_PADDING * 2;

    expect(nth(objects, 0).height).toBe(expectedH);
  });
});
