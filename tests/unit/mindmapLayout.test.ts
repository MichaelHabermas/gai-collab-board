import { describe, it, expect } from 'vitest';
import { computeMindMapLayout, type IMindMapConfig } from '@/modules/ai/layouts/mindmapLayout';
import { FRAME_PLACEHOLDER_ID } from '@/modules/ai/layouts/layoutUtils';

const CREATED_BY = 'test-user';

function makeConfig(overrides?: Partial<IMindMapConfig>): IMindMapConfig {
  return {
    centralTopic: 'Product Strategy',
    branches: [
      { label: 'Growth', color: 'green', children: ['SEO', 'Partnerships'] },
      { label: 'Product', color: 'blue', children: ['Mobile', 'API'] },
      { label: 'Revenue', color: 'purple', children: ['Pricing'] },
    ],
    ...overrides,
  };
}

describe('computeMindMapLayout', () => {
  it('produces a frame as the first object', () => {
    const { objects } = computeMindMapLayout(makeConfig(), [], CREATED_BY);

    expect(objects[0]?.type).toBe('frame');
    expect(objects[0]?.text).toBe('Product Strategy');
  });

  it('creates the central topic as a sticky note', () => {
    const { objects } = computeMindMapLayout(makeConfig(), [], CREATED_BY);

    // Index 1: center node (after frame)
    expect(objects[1]?.type).toBe('sticky');
    expect(objects[1]?.text).toBe('Product Strategy');
  });

  it('creates correct total node count', () => {
    const config = makeConfig();
    const { objects } = computeMindMapLayout(config, [], CREATED_BY);

    const totalChildren = config.branches.reduce((sum, b) => sum + b.children.length, 0);
    const expectedNodes = 1 + config.branches.length + totalChildren; // center + branches + children

    const stickies = objects.filter((o) => o.type === 'sticky');

    expect(stickies).toHaveLength(expectedNodes);
  });

  it('creates connectors from center to branches and branches to children', () => {
    const config = makeConfig();
    const { objects } = computeMindMapLayout(config, [], CREATED_BY);

    const connectors = objects.filter((o) => o.type === 'connector');
    const totalChildren = config.branches.reduce((sum, b) => sum + b.children.length, 0);
    const expectedConnectors = config.branches.length + totalChildren;

    expect(connectors).toHaveLength(expectedConnectors);
  });

  it('sets parentFrameId on all non-frame objects', () => {
    const { objects } = computeMindMapLayout(makeConfig(), [], CREATED_BY);

    for (const obj of objects) {
      if (obj.type !== 'frame') {
        expect(obj.parentFrameId).toBe(FRAME_PLACEHOLDER_ID);
      }
    }
  });

  it('frame encompasses all sticky notes', () => {
    const { objects } = computeMindMapLayout(makeConfig(), [], CREATED_BY);
    const frame = objects[0];
    if (!frame) {
      throw new Error('No frame');
    }

    const stickies = objects.filter((o) => o.type === 'sticky');

    for (const s of stickies) {
      expect(s.x).toBeGreaterThanOrEqual(frame.x);
      expect(s.y).toBeGreaterThanOrEqual(frame.y);
      expect(s.x + s.width).toBeLessThanOrEqual(frame.x + frame.width + 1); // +1 for rounding
      expect(s.y + s.height).toBeLessThanOrEqual(frame.y + frame.height + 1);
    }
  });

  it('uses explicit x/y when provided', () => {
    const { objects } = computeMindMapLayout(makeConfig({ x: 300, y: 250 }), [], CREATED_BY);

    expect(objects[0]?.x).toBe(300);
    expect(objects[0]?.y).toBe(250);
  });

  it('auto-positions when x/y are omitted', () => {
    const existing = [{ x: 0, y: 0, width: 600, height: 600 }];
    const { objects } = computeMindMapLayout(makeConfig(), existing, CREATED_BY);

    expect(objects[0]?.x).toBeGreaterThan(600);
  });

  it('returns FRAME_PLACEHOLDER_ID as frameId', () => {
    const { frameId } = computeMindMapLayout(makeConfig(), [], CREATED_BY);

    expect(frameId).toBe(FRAME_PLACEHOLDER_ID);
  });

  it('distributes branches radially around center', () => {
    const config = makeConfig();
    const { objects } = computeMindMapLayout(config, [], CREATED_BY);

    const center = objects[1]; // center sticky
    if (!center) {
      throw new Error('No center');
    }

    // Branch stickies start at index 2 (after frame and center)
    const branches = objects.slice(2, 2 + config.branches.length).filter((o) => o.type === 'sticky');

    // Branches should be at different positions around the center
    const positions = branches.map((b) => ({ x: b.x, y: b.y }));
    const uniquePositions = new Set(positions.map((p) => `${p.x},${p.y}`));

    expect(uniquePositions.size).toBe(config.branches.length);
  });

  it('handles a single branch', () => {
    const config = makeConfig({
      branches: [{ label: 'Only', color: 'yellow', children: ['Child'] }],
    });
    const { objects } = computeMindMapLayout(config, [], CREATED_BY);

    // 1 frame + 1 center + 1 branch + 1 child + 2 connectors
    expect(objects).toHaveLength(6);
  });

  it('handles branches with no children', () => {
    const config = makeConfig({
      branches: [
        { label: 'Empty A', color: 'green', children: [] },
        { label: 'Empty B', color: 'blue', children: [] },
      ],
    });
    const { objects } = computeMindMapLayout(config, [], CREATED_BY);

    const connectors = objects.filter((o) => o.type === 'connector');

    // Only center→branch connectors, no branch→child connectors
    expect(connectors).toHaveLength(2);
  });

  it('resolves named colors to hex on branch stickies', () => {
    const { objects } = computeMindMapLayout(makeConfig(), [], CREATED_BY);
    const stickies = objects.filter((o) => o.type === 'sticky');

    for (const s of stickies) {
      expect(s.fill).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
