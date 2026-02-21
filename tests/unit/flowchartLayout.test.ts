import { describe, it, expect, vi } from 'vitest';
import {
  computeFlowchartLayout,
  type IFlowchartConfig,
} from '@/modules/ai/layouts/flowchartLayout';
import { FRAME_PLACEHOLDER_ID } from '@/modules/ai/layouts/layoutUtils';

vi.mock('@dagrejs/dagre', () => {
  let nodes: Map<string, { width: number; height: number; x: number; y: number }>;
  let graphOpts: Record<string, unknown>;

  function resetState() {
    nodes = new Map();
    graphOpts = {};
  }
  resetState();

  const mod = {
    graphlib: {
      Graph: class {
        constructor() {
          resetState();
        }
        setGraph(opts: Record<string, unknown>) {
          graphOpts = opts;
        }
        setDefaultEdgeLabel(fn: () => Record<string, never>) {
          fn();
        }
        setNode(id: string, meta: { width: number; height: number }) {
          nodes.set(id, { ...meta, x: 0, y: 0 });
        }
        setEdge(_from: string, _to: string) {
          // edges tracked implicitly via config
        }
        node(id: string) {
          return nodes.get(id);
        }
        nodes() {
          return Array.from(nodes.keys());
        }
      },
    },
    layout(graph: { nodes: () => string[]; node: (id: string) => unknown }) {
      const isLR = graphOpts.rankdir === 'LR';
      let idx = 0;
      for (const id of graph.nodes()) {
        const n = nodes.get(id);
        if (n) {
          n.x = isLR ? idx * 200 + n.width / 2 : n.width / 2;
          n.y = isLR ? n.height / 2 : idx * 150 + n.height / 2;
        }
        idx++;
      }
    },
  };

  return { ...mod, default: mod };
});

const CREATED_BY = 'test-user';

function makeConfig(overrides?: Partial<IFlowchartConfig>): IFlowchartConfig {
  return {
    title: 'Registration Flow',
    direction: 'top-to-bottom',
    nodes: [
      { id: 'start', label: 'Start', shape: 'circle', color: 'green' },
      { id: 'input', label: 'Enter Email', shape: 'rectangle' },
      { id: 'end', label: 'Done', shape: 'circle', color: 'blue' },
    ],
    edges: [
      { from: 'start', to: 'input' },
      { from: 'input', to: 'end' },
    ],
    ...overrides,
  };
}

describe('computeFlowchartLayout', () => {
  it('produces a frame when title is provided', async () => {
    const { objects } = await computeFlowchartLayout(makeConfig(), [], CREATED_BY);

    expect(objects[0]?.type).toBe('frame');
    expect(objects[0]?.text).toBe('Registration Flow');
  });

  it('does not produce a frame when title is omitted', async () => {
    const { objects } = await computeFlowchartLayout(
      makeConfig({ title: undefined }),
      [],
      CREATED_BY,
    );

    const frames = objects.filter((o) => o.type === 'frame');

    expect(frames).toHaveLength(0);
  });

  it('creates one shape per node', async () => {
    const config = makeConfig();
    const { objects } = await computeFlowchartLayout(config, [], CREATED_BY);

    const shapes = objects.filter((o) => o.type === 'circle' || o.type === 'rectangle');

    expect(shapes).toHaveLength(config.nodes.length);
  });

  it('creates one connector per edge', async () => {
    const config = makeConfig();
    const { objects } = await computeFlowchartLayout(config, [], CREATED_BY);

    const connectors = objects.filter((o) => o.type === 'connector');

    expect(connectors).toHaveLength(config.edges.length);
  });

  it('sets parentFrameId on nodes and connectors when frame exists', async () => {
    const { objects } = await computeFlowchartLayout(makeConfig(), [], CREATED_BY);

    for (const obj of objects) {
      if (obj.type !== 'frame') {
        expect(obj.parentFrameId).toBe(FRAME_PLACEHOLDER_ID);
      }
    }
  });

  it('connectors reference node placeholder IDs', async () => {
    const { objects } = await computeFlowchartLayout(makeConfig(), [], CREATED_BY);
    const connectors = objects.filter((o) => o.type === 'connector');

    for (const conn of connectors) {
      expect(conn.fromObjectId).toMatch(/^__node_.+__$/);
      expect(conn.toObjectId).toMatch(/^__node_.+__$/);
    }
  });

  it('uses top/bottom anchors for top-to-bottom direction', async () => {
    const { objects } = await computeFlowchartLayout(makeConfig(), [], CREATED_BY);
    const connectors = objects.filter((o) => o.type === 'connector');

    for (const conn of connectors) {
      expect(conn.fromAnchor).toBe('bottom');
      expect(conn.toAnchor).toBe('top');
    }
  });

  it('uses left/right anchors for left-to-right direction', async () => {
    const config = makeConfig({ direction: 'left-to-right' });
    const { objects } = await computeFlowchartLayout(config, [], CREATED_BY);
    const connectors = objects.filter((o) => o.type === 'connector');

    for (const conn of connectors) {
      expect(conn.fromAnchor).toBe('right');
      expect(conn.toAnchor).toBe('left');
    }
  });

  it('uses explicit x/y when provided', async () => {
    const config = makeConfig({ x: 600, y: 400 });
    const { objects } = await computeFlowchartLayout(config, [], CREATED_BY);

    expect(objects[0]?.x).toBe(600);
    expect(objects[0]?.y).toBe(400);
  });

  it('auto-positions when x/y are omitted', async () => {
    const existing = [{ x: 0, y: 0, width: 800, height: 600 }];
    const { objects } = await computeFlowchartLayout(makeConfig(), existing, CREATED_BY);

    expect(objects[0]?.x).toBeGreaterThan(800);
  });

  it('returns FRAME_PLACEHOLDER_ID as frameId', async () => {
    const { frameId } = await computeFlowchartLayout(makeConfig(), [], CREATED_BY);

    expect(frameId).toBe(FRAME_PLACEHOLDER_ID);
  });

  it('resolves named colors to hex on shape nodes', async () => {
    const { objects } = await computeFlowchartLayout(makeConfig(), [], CREATED_BY);
    const shapes = objects.filter((o) => o.type === 'circle' || o.type === 'rectangle');

    for (const shape of shapes) {
      expect(shape.fill).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('sets arrowheads to end on connectors', async () => {
    const { objects } = await computeFlowchartLayout(makeConfig(), [], CREATED_BY);
    const connectors = objects.filter((o) => o.type === 'connector');

    for (const conn of connectors) {
      expect(conn.arrowheads).toBe('end');
    }
  });
});
