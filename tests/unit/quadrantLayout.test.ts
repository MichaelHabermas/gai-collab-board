import { describe, it, expect } from 'vitest';
import { computeQuadrantLayout, type IQuadrantConfig } from '@/modules/ai/layouts/quadrantLayout';
import {
  FRAME_PLACEHOLDER_ID,
  DEFAULT_STICKY_WIDTH,
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
// Constants mirrored from implementation (quadrant-specific)
// ---------------------------------------------------------------------------

const CELL_GAP = 20;
const MIN_CELL_WIDTH = 440;
const CELL_WIDTH = Math.max(2 * DEFAULT_STICKY_WIDTH + 40, MIN_CELL_WIDTH); // 440

const CREATED_BY = 'test-user';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<IQuadrantConfig>): IQuadrantConfig {
  return {
    title: 'SWOT Analysis',
    quadrants: {
      topLeft: { label: 'Strengths', color: 'green', items: ['Brand', 'Team'] },
      topRight: { label: 'Weaknesses', color: 'pink', items: ['Cost'] },
      bottomLeft: { label: 'Opportunities', color: 'blue', items: ['Market'] },
      bottomRight: { label: 'Threats', color: 'orange', items: ['Competitors', 'Regulation'] },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeQuadrantLayout', () => {
  it('frame is the first object with type frame', () => {
    const { objects } = computeQuadrantLayout(makeConfig(), [], CREATED_BY);

    expect(nth(objects, 0).type).toBe('frame');
    expect(nth(objects, 0).text).toBe('SWOT Analysis');
  });

  it('returns FRAME_PLACEHOLDER_ID as frameId', () => {
    const { frameId } = computeQuadrantLayout(makeConfig(), [], CREATED_BY);

    expect(frameId).toBe(FRAME_PLACEHOLDER_ID);
  });

  it('contains exactly 2 axis lines', () => {
    const { objects } = computeQuadrantLayout(makeConfig(), [], CREATED_BY);
    const lines = objects.filter((o) => o.type === 'line');

    expect(lines).toHaveLength(2);
  });

  it('contains 4 section labels matching quadrant label text', () => {
    const config = makeConfig();
    const { objects } = computeQuadrantLayout(config, [], CREATED_BY);
    const textObjects = objects.filter((o) => o.type === 'text');
    const labels = ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'];

    for (const label of labels) {
      const found = textObjects.some((o) => o.text === label);

      expect(found, `section label "${label}" not found`).toBe(true);
    }
  });

  it('all non-frame children have parentFrameId = FRAME_PLACEHOLDER_ID', () => {
    const { objects } = computeQuadrantLayout(makeConfig(), [], CREATED_BY);

    for (const obj of objects) {
      if (obj.type !== 'frame') {
        expect(obj.parentFrameId).toBe(FRAME_PLACEHOLDER_ID);
      }
    }
  });

  it('x axis label is present when xAxisLabel is provided', () => {
    const config = makeConfig({ xAxisLabel: 'Internal ← External' });
    const { objects } = computeQuadrantLayout(config, [], CREATED_BY);
    const found = objects.some((o) => o.type === 'text' && o.text === 'Internal ← External');

    expect(found).toBe(true);
  });

  it('y axis label is present when yAxisLabel is provided', () => {
    const config = makeConfig({ yAxisLabel: 'Positive ← Negative' });
    const { objects } = computeQuadrantLayout(config, [], CREATED_BY);
    const found = objects.some((o) => o.type === 'text' && o.text === 'Positive ← Negative');

    expect(found).toBe(true);
  });

  it('no extra axis labels when neither xAxisLabel nor yAxisLabel are provided', () => {
    // makeConfig() without axis labels → exactly 4 text objects (section labels)
    const { objects } = computeQuadrantLayout(makeConfig(), [], CREATED_BY);
    const textObjects = objects.filter((o) => o.type === 'text');

    // 4 section labels, no axis labels
    expect(textObjects).toHaveLength(4);
  });

  it('correct total object count: 1 frame + 2 lines + 4 section labels + total stickies', () => {
    const config = makeConfig();
    const totalItems =
      config.quadrants.topLeft.items.length +
      config.quadrants.topRight.items.length +
      config.quadrants.bottomLeft.items.length +
      config.quadrants.bottomRight.items.length;

    const { objects } = computeQuadrantLayout(config, [], CREATED_BY);
    const expected = 1 + 2 + 4 + totalItems;

    expect(objects).toHaveLength(expected);
  });

  it('stickies in a quadrant with more than 3 items use 2-column layout (x coords differ)', () => {
    const config = makeConfig({
      quadrants: {
        topLeft: { label: 'TL', color: 'yellow', items: ['A', 'B', 'C', 'D'] },
        topRight: { label: 'TR', items: [] },
        bottomLeft: { label: 'BL', items: [] },
        bottomRight: { label: 'BR', items: [] },
      },
    });
    const { objects } = computeQuadrantLayout(config, [], CREATED_BY);
    const stickies = objects.filter((o) => o.type === 'sticky');

    // With 4 items and cols=2: item[0] and item[1] should be in different columns (x differs)
    const xValues = new Set(stickies.map((s) => s.x));

    expect(xValues.size).toBeGreaterThan(1);
  });

  it('stickies in a quadrant with 3 or fewer items use single-column layout (same x)', () => {
    const config = makeConfig({
      quadrants: {
        topLeft: { label: 'TL', color: 'blue', items: ['A', 'B', 'C'] },
        topRight: { label: 'TR', items: [] },
        bottomLeft: { label: 'BL', items: [] },
        bottomRight: { label: 'BR', items: [] },
      },
    });
    const { objects } = computeQuadrantLayout(config, [], CREATED_BY);
    const stickies = objects.filter((o) => o.type === 'sticky');

    // With 3 items and cols=1: all stickies share the same x
    const xValues = new Set(stickies.map((s) => s.x));

    expect(xValues.size).toBe(1);
  });

  it('explicit x/y positions the frame at those coords', () => {
    const { objects } = computeQuadrantLayout(makeConfig({ x: 500, y: 300 }), [], CREATED_BY);

    expect(nth(objects, 0).x).toBe(500);
    expect(nth(objects, 0).y).toBe(300);
  });

  it('auto-positions to the right of existing objects when x/y omitted', () => {
    const existing = [{ x: 0, y: 0, width: 200, height: 200 }];
    const { objects } = computeQuadrantLayout(makeConfig(), existing, CREATED_BY);

    // findOpenSpace: bbox.x + bbox.width + 60 = 0 + 200 + 60 = 260
    expect(nth(objects, 0).x).toBe(260);
    expect(nth(objects, 0).y).toBe(0);
  });

  it('resolves named colors to hex in sticky notes', () => {
    const { objects } = computeQuadrantLayout(makeConfig(), [], CREATED_BY);
    const stickies = objects.filter((o) => o.type === 'sticky');

    for (const sticky of stickies) {
      expect(sticky.fill).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('frame width accounts for cell count, gap, and padding', () => {
    const { objects } = computeQuadrantLayout(makeConfig(), [], CREATED_BY);
    const expectedW = CELL_WIDTH * 2 + CELL_GAP + DEFAULT_FRAME_PADDING * 2;

    expect(nth(objects, 0).width).toBe(expectedW);
  });
});
