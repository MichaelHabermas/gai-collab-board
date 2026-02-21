import { describe, it, expect } from 'vitest';
import { computeQuadrantLayout, type IQuadrantConfig } from '@/modules/ai/layouts/quadrantLayout';
import { FRAME_PLACEHOLDER_ID } from '@/modules/ai/layouts/layoutUtils';

const CREATED_BY = 'test-user';

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

describe('computeQuadrantLayout', () => {
  it('produces a frame as the first object', () => {
    const { objects } = computeQuadrantLayout(makeConfig(), [], CREATED_BY);

    expect(objects.length).toBeGreaterThan(0);
    expect(objects[0]?.type).toBe('frame');
    expect(objects[0]?.text).toBe('SWOT Analysis');
  });

  it('creates correct total object count', () => {
    const config = makeConfig();
    const { objects } = computeQuadrantLayout(config, [], CREATED_BY);
    const totalItems =
      config.quadrants.topLeft.items.length +
      config.quadrants.topRight.items.length +
      config.quadrants.bottomLeft.items.length +
      config.quadrants.bottomRight.items.length;

    // 1 frame + 2 axis lines + 4 section labels + N stickies
    const expectedMin = 1 + 2 + 4 + totalItems;

    expect(objects.length).toBeGreaterThanOrEqual(expectedMin);
  });

  it('sets parentFrameId on all non-frame children', () => {
    const { objects } = computeQuadrantLayout(makeConfig(), [], CREATED_BY);

    for (const obj of objects) {
      if (obj.type !== 'frame') {
        expect(obj.parentFrameId).toBe(FRAME_PLACEHOLDER_ID);
      }
    }
  });

  it('frame encompasses all children', () => {
    const { objects } = computeQuadrantLayout(makeConfig(), [], CREATED_BY);
    const frame = objects[0];
    if (!frame) {
      throw new Error('No frame');
    }

    for (const obj of objects.slice(1)) {
      expect(obj.x).toBeGreaterThanOrEqual(frame.x);
      expect(obj.y).toBeGreaterThanOrEqual(frame.y);
      if (obj.width > 0) {
        expect(obj.x + obj.width).toBeLessThanOrEqual(frame.x + frame.width);
      }
      if (obj.height > 0) {
        expect(obj.y + obj.height).toBeLessThanOrEqual(frame.y + frame.height);
      }
    }
  });

  it('uses explicit x/y when provided', () => {
    const { objects } = computeQuadrantLayout(makeConfig({ x: 500, y: 300 }), [], CREATED_BY);

    expect(objects[0]?.x).toBe(500);
    expect(objects[0]?.y).toBe(300);
  });

  it('auto-positions when x/y are omitted', () => {
    const existing = [{ x: 0, y: 0, width: 200, height: 200 }];
    const { objects } = computeQuadrantLayout(makeConfig(), existing, CREATED_BY);
    const frame = objects[0];

    if (!frame) {
      throw new Error('No frame');
    }

    expect(frame.x).toBeGreaterThan(200);
  });

  it('handles empty items in a quadrant', () => {
    const config = makeConfig({
      quadrants: {
        topLeft: { label: 'A', items: [] },
        topRight: { label: 'B', items: [] },
        bottomLeft: { label: 'C', items: [] },
        bottomRight: { label: 'D', items: [] },
      },
    });

    const { objects } = computeQuadrantLayout(config, [], CREATED_BY);

    // Should still produce frame + axis lines + labels
    expect(objects.length).toBeGreaterThanOrEqual(7); // 1 frame + 2 lines + 4 labels
  });

  it('includes axis labels when xAxisLabel and yAxisLabel are provided', () => {
    const config = makeConfig({
      xAxisLabel: 'Internal ← → External',
      yAxisLabel: 'Positive ← → Negative',
    });
    const { objects } = computeQuadrantLayout(config, [], CREATED_BY);

    const textObjects = objects.filter((o) => o.type === 'text');

    // 4 section labels + 2 axis labels
    expect(textObjects.length).toBeGreaterThanOrEqual(6);
  });

  it('returns FRAME_PLACEHOLDER_ID as frameId', () => {
    const { frameId } = computeQuadrantLayout(makeConfig(), [], CREATED_BY);

    expect(frameId).toBe(FRAME_PLACEHOLDER_ID);
  });

  it('resolves named colors to hex in sticky notes', () => {
    const { objects } = computeQuadrantLayout(makeConfig(), [], CREATED_BY);
    const stickies = objects.filter((o) => o.type === 'sticky');

    for (const sticky of stickies) {
      expect(sticky.fill).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
