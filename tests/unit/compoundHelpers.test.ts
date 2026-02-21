import { describe, it, expect } from 'vitest';
import {
  resolveShapeType,
  defaultWidthForType,
  defaultHeightForType,
  toUpdateParams,
  isArrowheadMode,
  isStrokeStyle,
  isConnectorAnchor,
  buildQuadrantConfig,
  buildColumnConfig,
  buildFlowchartConfig,
  buildMindMapConfig,
  BATCH_CAP,
} from '@/modules/ai/compoundHelpers';

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

describe('compoundHelpers — type guards', () => {
  describe('isArrowheadMode', () => {
    it('returns true for valid modes', () => {
      expect(isArrowheadMode('none')).toBe(true);
      expect(isArrowheadMode('start')).toBe(true);
      expect(isArrowheadMode('end')).toBe(true);
      expect(isArrowheadMode('both')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isArrowheadMode('invalid')).toBe(false);
      expect(isArrowheadMode(123)).toBe(false);
      expect(isArrowheadMode(null)).toBe(false);
      expect(isArrowheadMode(undefined)).toBe(false);
    });
  });

  describe('isStrokeStyle', () => {
    it('returns true for valid styles', () => {
      expect(isStrokeStyle('solid')).toBe(true);
      expect(isStrokeStyle('dashed')).toBe(true);
      expect(isStrokeStyle('dotted')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isStrokeStyle('wavy')).toBe(false);
      expect(isStrokeStyle(42)).toBe(false);
      expect(isStrokeStyle(null)).toBe(false);
    });
  });

  describe('isConnectorAnchor', () => {
    it('returns true for valid anchors', () => {
      expect(isConnectorAnchor('top')).toBe(true);
      expect(isConnectorAnchor('right')).toBe(true);
      expect(isConnectorAnchor('bottom')).toBe(true);
      expect(isConnectorAnchor('left')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isConnectorAnchor('center')).toBe(false);
      expect(isConnectorAnchor(0)).toBe(false);
      expect(isConnectorAnchor(undefined)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// resolveShapeType
// ---------------------------------------------------------------------------

describe('resolveShapeType', () => {
  it('resolves valid lowercase types', () => {
    expect(resolveShapeType('sticky')).toBe('sticky');
    expect(resolveShapeType('rectangle')).toBe('rectangle');
    expect(resolveShapeType('circle')).toBe('circle');
    expect(resolveShapeType('line')).toBe('line');
    expect(resolveShapeType('text')).toBe('text');
    expect(resolveShapeType('frame')).toBe('frame');
    expect(resolveShapeType('connector')).toBe('connector');
  });

  it('resolves mixed-case input', () => {
    expect(resolveShapeType('Rectangle')).toBe('rectangle');
    expect(resolveShapeType('CIRCLE')).toBe('circle');
    expect(resolveShapeType(' Sticky ')).toBe('sticky');
  });

  it('falls back to sticky for unknown types', () => {
    expect(resolveShapeType('unknown')).toBe('sticky');
    expect(resolveShapeType('')).toBe('sticky');
    expect(resolveShapeType('arrow')).toBe('sticky');
  });
});

// ---------------------------------------------------------------------------
// defaultWidthForType / defaultHeightForType
// ---------------------------------------------------------------------------

describe('defaultWidthForType', () => {
  it('returns known defaults', () => {
    expect(defaultWidthForType('sticky')).toBe(200);
    expect(defaultWidthForType('rectangle')).toBe(200);
    expect(defaultWidthForType('circle')).toBe(100);
    expect(defaultWidthForType('frame')).toBe(300);
  });

  it('falls back to 200 for unknown type', () => {
    expect(defaultWidthForType('unknown')).toBe(200);
  });

  it('is case-insensitive', () => {
    expect(defaultWidthForType('STICKY')).toBe(200);
  });
});

describe('defaultHeightForType', () => {
  it('returns known defaults', () => {
    expect(defaultHeightForType('sticky')).toBe(200);
    expect(defaultHeightForType('rectangle')).toBe(200);
    expect(defaultHeightForType('frame')).toBe(200);
  });

  it('falls back to 200 for unknown type', () => {
    expect(defaultHeightForType('unknown')).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// BATCH_CAP
// ---------------------------------------------------------------------------

describe('BATCH_CAP', () => {
  it('is 50', () => {
    expect(BATCH_CAP).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// toUpdateParams
// ---------------------------------------------------------------------------

describe('toUpdateParams', () => {
  it('returns empty object for non-record input', () => {
    expect(toUpdateParams(null)).toEqual({});
    expect(toUpdateParams(undefined)).toEqual({});
    expect(toUpdateParams('string')).toEqual({});
    expect(toUpdateParams(42)).toEqual({});
    expect(toUpdateParams([1, 2])).toEqual({});
  });

  it('extracts numeric fields when present', () => {
    const result = toUpdateParams({ x: 10, y: 20, width: 100, height: 50 });
    expect(result).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it('extracts string fields when present', () => {
    const result = toUpdateParams({ fill: '#ff0000', text: 'hello', stroke: '#000' });
    expect(result).toEqual({ fill: '#ff0000', text: 'hello', stroke: '#000' });
  });

  it('extracts fontSize, opacity, strokeWidth, rotation', () => {
    const result = toUpdateParams({
      fontSize: 16,
      opacity: 0.5,
      strokeWidth: 2,
      rotation: 45,
    });
    expect(result).toEqual({ fontSize: 16, opacity: 0.5, strokeWidth: 2, rotation: 45 });
  });

  it('ignores fields with wrong types', () => {
    const result = toUpdateParams({
      x: 'not a number',
      y: true,
      fill: 123,
      text: null,
      width: undefined,
      fontSize: 'big',
      opacity: 'half',
      stroke: 42,
      strokeWidth: 'thin',
      rotation: 'none',
      height: [],
    });
    expect(result).toEqual({});
  });

  it('extracts only valid fields from mixed input', () => {
    const result = toUpdateParams({
      x: 5,
      y: 'bad',
      fill: 'blue',
      text: 99,
      width: 200,
      unknownField: 'ignored',
    });
    expect(result).toEqual({ x: 5, fill: 'blue', width: 200 });
  });
});

// ---------------------------------------------------------------------------
// buildQuadrantConfig
// ---------------------------------------------------------------------------

describe('buildQuadrantConfig', () => {
  const validQuadrant = { label: 'Test', items: ['a', 'b'] };
  const fullQuadrants = {
    topLeft: validQuadrant,
    topRight: validQuadrant,
    bottomLeft: validQuadrant,
    bottomRight: validQuadrant,
  };

  it('returns null when title is missing', () => {
    expect(buildQuadrantConfig({ quadrants: fullQuadrants })).toBeNull();
  });

  it('returns null when title is wrong type', () => {
    expect(buildQuadrantConfig({ title: 123, quadrants: fullQuadrants })).toBeNull();
  });

  it('returns null when quadrants is not a record', () => {
    expect(buildQuadrantConfig({ title: 'SWOT', quadrants: 'bad' })).toBeNull();
    expect(buildQuadrantConfig({ title: 'SWOT', quadrants: null })).toBeNull();
  });

  it('returns null when a quadrant is invalid', () => {
    const incomplete = { ...fullQuadrants, topLeft: { label: 123, items: [] } };
    expect(buildQuadrantConfig({ title: 'SWOT', quadrants: incomplete })).toBeNull();
  });

  it('returns null when a quadrant is missing items', () => {
    const noItems = { ...fullQuadrants, bottomRight: { label: 'BR' } };
    expect(buildQuadrantConfig({ title: 'SWOT', quadrants: noItems })).toBeNull();
  });

  it('builds valid config with all quadrants', () => {
    const result = buildQuadrantConfig({ title: 'SWOT', quadrants: fullQuadrants });
    expect(result).not.toBeNull();
    expect(result!.title).toBe('SWOT');
    expect(result!.quadrants.topLeft.label).toBe('Test');
  });

  it('includes optional x, y, axis labels when provided', () => {
    const result = buildQuadrantConfig({
      title: 'SWOT',
      quadrants: fullQuadrants,
      x: 100,
      y: 200,
      xAxisLabel: 'Impact',
      yAxisLabel: 'Effort',
    });
    expect(result!.x).toBe(100);
    expect(result!.y).toBe(200);
    expect(result!.xAxisLabel).toBe('Impact');
    expect(result!.yAxisLabel).toBe('Effort');
  });

  it('excludes non-string axis labels', () => {
    const result = buildQuadrantConfig({
      title: 'SWOT',
      quadrants: fullQuadrants,
      xAxisLabel: 42,
    });
    expect(result!.xAxisLabel).toBeUndefined();
  });

  it('includes color in quadrant input when present', () => {
    const colored = { label: 'L', items: ['a'], color: '#ff0' };
    const result = buildQuadrantConfig({
      title: 'T',
      quadrants: {
        topLeft: colored,
        topRight: colored,
        bottomLeft: colored,
        bottomRight: colored,
      },
    });
    expect(result!.quadrants.topLeft.color).toBe('#ff0');
  });
});

// ---------------------------------------------------------------------------
// buildColumnConfig
// ---------------------------------------------------------------------------

describe('buildColumnConfig', () => {
  it('returns null when title missing', () => {
    expect(buildColumnConfig({ columns: [] })).toBeNull();
  });

  it('returns null when title is not a string', () => {
    expect(buildColumnConfig({ title: 42, columns: [] })).toBeNull();
  });

  it('returns null when columns is not an array', () => {
    expect(buildColumnConfig({ title: 'Board', columns: 'bad' })).toBeNull();
  });

  it('returns null when all columns are invalid (empty after filter)', () => {
    expect(
      buildColumnConfig({ title: 'Board', columns: [{ heading: 123 }, 'bad', null] })
    ).toBeNull();
  });

  it('builds valid config with proper columns', () => {
    const result = buildColumnConfig({
      title: 'Retro',
      columns: [
        { heading: 'Good', items: ['a', 'b'] },
        { heading: 'Bad', items: ['c'] },
      ],
    });
    expect(result!.title).toBe('Retro');
    expect(result!.columns).toHaveLength(2);
    expect(result!.columns[0]?.heading).toBe('Good');
  });

  it('includes optional x, y', () => {
    const result = buildColumnConfig({
      title: 'T',
      columns: [{ heading: 'H', items: [] }],
      x: 50,
      y: 60,
    });
    expect(result!.x).toBe(50);
    expect(result!.y).toBe(60);
  });

  it('includes color when present on column', () => {
    const result = buildColumnConfig({
      title: 'T',
      columns: [{ heading: 'H', items: [], color: 'blue' }],
    });
    expect(result!.columns[0]?.color).toBe('blue');
  });

  it('filters out columns missing heading or items', () => {
    const result = buildColumnConfig({
      title: 'T',
      columns: [
        { heading: 'Valid', items: ['x'] },
        { items: ['y'] }, // missing heading
        { heading: 'Also valid', items: [] },
      ],
    });
    expect(result!.columns).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// buildFlowchartConfig
// ---------------------------------------------------------------------------

describe('buildFlowchartConfig', () => {
  it('returns null when nodes missing', () => {
    expect(buildFlowchartConfig({ edges: [] })).toBeNull();
  });

  it('returns null when edges missing', () => {
    expect(buildFlowchartConfig({ nodes: [] })).toBeNull();
  });

  it('returns null when nodes is not array', () => {
    expect(buildFlowchartConfig({ nodes: 'bad', edges: [] })).toBeNull();
  });

  it('defaults direction to top-to-bottom', () => {
    const result = buildFlowchartConfig({ nodes: [], edges: [] });
    expect(result!.direction).toBe('top-to-bottom');
  });

  it('accepts left-to-right direction', () => {
    const result = buildFlowchartConfig({
      nodes: [],
      edges: [],
      direction: 'left-to-right',
    });
    expect(result!.direction).toBe('left-to-right');
  });

  it('maps node shapes correctly', () => {
    const result = buildFlowchartConfig({
      nodes: [
        { id: '1', label: 'Start', shape: 'circle' },
        { id: '2', label: 'Process', shape: 'rectangle' },
        { id: '3', label: 'End', shape: 'diamond' }, // unknown shape → undefined
      ],
      edges: [],
    });
    expect(result!.nodes[0]?.shape).toBe('circle');
    expect(result!.nodes[1]?.shape).toBe('rectangle');
    expect(result!.nodes[2]?.shape).toBeUndefined();
  });

  it('includes node color when present', () => {
    const result = buildFlowchartConfig({
      nodes: [{ id: '1', label: 'A', color: '#f00' }],
      edges: [],
    });
    expect(result!.nodes[0]?.color).toBe('#f00');
  });

  it('includes edge labels when present', () => {
    const result = buildFlowchartConfig({
      nodes: [],
      edges: [
        { from: 'a', to: 'b', label: 'yes' },
        { from: 'b', to: 'c' },
      ],
    });
    expect(result!.edges[0]?.label).toBe('yes');
    expect(result!.edges[1]?.label).toBeUndefined();
  });

  it('includes optional title, x, y', () => {
    const result = buildFlowchartConfig({
      nodes: [],
      edges: [],
      title: 'Flow',
      x: 10,
      y: 20,
    });
    expect(result!.title).toBe('Flow');
    expect(result!.x).toBe(10);
    expect(result!.y).toBe(20);
  });

  it('filters out non-record nodes and edges', () => {
    const result = buildFlowchartConfig({
      nodes: [{ id: '1', label: 'A' }, 'bad', null, 42],
      edges: [{ from: 'a', to: 'b' }, 'bad'],
    });
    expect(result!.nodes).toHaveLength(1);
    expect(result!.edges).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// buildMindMapConfig
// ---------------------------------------------------------------------------

describe('buildMindMapConfig', () => {
  it('returns null when centralTopic missing', () => {
    expect(buildMindMapConfig({ branches: [] })).toBeNull();
  });

  it('returns null when centralTopic is not string', () => {
    expect(buildMindMapConfig({ centralTopic: 42, branches: [] })).toBeNull();
  });

  it('returns null when branches missing', () => {
    expect(buildMindMapConfig({ centralTopic: 'Root' })).toBeNull();
  });

  it('returns null when branches is not array', () => {
    expect(buildMindMapConfig({ centralTopic: 'Root', branches: 'bad' })).toBeNull();
  });

  it('builds valid config', () => {
    const result = buildMindMapConfig({
      centralTopic: 'Project',
      branches: [
        { label: 'Phase 1', children: ['task1', 'task2'] },
        { label: 'Phase 2', children: ['task3'] },
      ],
    });
    expect(result!.centralTopic).toBe('Project');
    expect(result!.branches).toHaveLength(2);
    expect(result!.branches[0]?.children).toEqual(['task1', 'task2']);
  });

  it('includes branch color when present', () => {
    const result = buildMindMapConfig({
      centralTopic: 'R',
      branches: [{ label: 'B', children: [], color: 'red' }],
    });
    expect(result!.branches[0]?.color).toBe('red');
  });

  it('includes optional x, y', () => {
    const result = buildMindMapConfig({
      centralTopic: 'R',
      branches: [],
      x: 100,
      y: 200,
    });
    expect(result!.x).toBe(100);
    expect(result!.y).toBe(200);
  });

  it('filters out branches missing label or children', () => {
    const result = buildMindMapConfig({
      centralTopic: 'R',
      branches: [
        { label: 'Valid', children: ['a'] },
        { children: ['b'] }, // missing label
        { label: 'No kids' }, // missing children
        'bad',
      ],
    });
    expect(result!.branches).toHaveLength(1);
  });
});
