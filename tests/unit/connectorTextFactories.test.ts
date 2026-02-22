/**
 * Unit tests for createConnector and createTextElement factories.
 * Mocks Konva to avoid canvas/clearRect in jsdom.
 */

import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';

vi.mock('konva', () => {
  const RESERVED = new Set(['points', 'text', 'fontSize', 'fill', 'x', 'y']);

  class MockArrow {
    _points: number[] = [0, 0, 100, 0];
    _fill = '#64748b';

    constructor(attrs: Record<string, unknown>) {
      for (const [k, v] of Object.entries(attrs)) {
        if (!RESERVED.has(k)) {
          (this as Record<string, unknown>)[k] = v;
        }
      }
      if (Array.isArray(attrs.points)) {
        this._points = attrs.points as number[];
      }
      if (typeof attrs.fill === 'string') {
        this._fill = attrs.fill;
      }
    }

    setAttrs(attrs: Record<string, unknown>): void {
      for (const [k, v] of Object.entries(attrs)) {
        if (!RESERVED.has(k)) {
          (this as Record<string, unknown>)[k] = v;
        }
      }
      if (Array.isArray(attrs.points)) {
        this._points = attrs.points as number[];
      }
    }

    points(): number[] {
      return this._points;
    }

    fill(_v?: string): string {
      return this._fill;
    }
  }

  class MockLine extends MockArrow {}

  class MockGroup {
    children: unknown[] = [];

    constructor(attrs: Record<string, unknown>) {
      Object.assign(this, attrs);
    }

    add(child: unknown): void {
      this.children.push(child);
    }

    setAttrs(attrs: Record<string, unknown>): void {
      Object.assign(this, attrs);
    }
  }

  class MockText {
    _text = '';
    _fontSize = 16;
    _x = 0;
    _y = 0;
    _fill = '#1f2937';

    constructor(attrs: Record<string, unknown>) {
      this._text = (attrs.text as string) ?? '';
      this._fontSize = (attrs.fontSize as number) ?? 16;
      this._x = (attrs.x as number) ?? 0;
      this._y = (attrs.y as number) ?? 0;
      this._fill = (attrs.fill as string) ?? '#1f2937';
    }

    fill(): string {
      return this._fill;
    }

    setAttrs(attrs: Record<string, unknown>): void {
      if (typeof attrs.text === 'string') {
        this._text = attrs.text;
      }
      if (typeof attrs.fontSize === 'number') {
        this._fontSize = attrs.fontSize;
      }
      if (typeof attrs.x === 'number') {
        this._x = attrs.x;
      }
      if (typeof attrs.y === 'number') {
        this._y = attrs.y;
      }
    }

    text(): string {
      return this._text;
    }

    fontSize(): number {
      return this._fontSize;
    }

    x(): number {
      return this._x;
    }

    y(): number {
      return this._y;
    }
  }

  return {
    default: {
      Arrow: MockArrow,
      Line: MockLine,
      Group: MockGroup,
      Text: MockText,
    },
  };
});

import Konva from 'konva';
import { createConnector, updateConnector } from '@/canvas/factories/createConnector';
import { createTextElement, updateTextElement } from '@/canvas/factories/createTextElement';
import { getFactory } from '@/canvas/factories';
import type { IBoardObject } from '@/types';

const ts = Timestamp.now();

function createConnectorObj(overrides: Partial<IBoardObject> = {}): IBoardObject {
  return {
    id: 'conn-1',
    type: 'connector',
    x: 10,
    y: 20,
    width: 0,
    height: 0,
    rotation: 0,
    fill: '#64748b',
    stroke: '#64748b',
    strokeWidth: 2,
    points: [0, 0, 100, 50],
    createdBy: 'test',
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

function createTextObj(overrides: Partial<IBoardObject> = {}): IBoardObject {
  return {
    id: 'text-1',
    type: 'text',
    x: 50,
    y: 60,
    width: 200,
    height: 30,
    rotation: 0,
    fill: '#1f2937',
    text: 'Hello',
    fontSize: 16,
    createdBy: 'test',
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

describe('createConnector', () => {
  it('creates Arrow for arrowheads=end (default)', () => {
    const obj = createConnectorObj({ arrowheads: 'end' });
    const { root, parts, cacheable } = createConnector(obj);
    expect(root).toBeInstanceOf(Konva.Arrow);
    expect(parts).toEqual({});
    expect(cacheable).toBe(false);
  });

  it('creates Arrow for arrowheads=start', () => {
    const obj = createConnectorObj({ arrowheads: 'start' });
    const { root } = createConnector(obj);
    expect(root).toBeInstanceOf(Konva.Arrow);
  });

  it('creates Group with 2 Arrows for arrowheads=both', () => {
    const obj = createConnectorObj({ arrowheads: 'both' });
    const { root, parts } = createConnector(obj);
    expect(root).toBeInstanceOf(Konva.Group);
    expect(parts.endArrow).toBeInstanceOf(Konva.Arrow);
    expect(parts.startArrow).toBeInstanceOf(Konva.Arrow);
  });

  it('creates Line for arrowheads=none', () => {
    const obj = createConnectorObj({ arrowheads: 'none' });
    const { root } = createConnector(obj);
    expect(root).toBeInstanceOf(Konva.Line);
  });

  it('defaults to end when arrowheads undefined', () => {
    const obj = createConnectorObj();
    const { root } = createConnector(obj);
    expect(root).toBeInstanceOf(Konva.Arrow);
  });
});

describe('updateConnector', () => {
  it('returns false for position-only change', () => {
    const obj = createConnectorObj({ x: 5, y: 10 });
    const nodes = createConnector(obj);
    const moved = { ...obj, x: 15, y: 25 };
    const result = updateConnector(nodes, moved, obj);
    expect(result).toBe(false);
  });

  it('returns true when stroke changes', () => {
    const obj = createConnectorObj({ stroke: '#64748b' });
    const prev = createConnectorObj({ stroke: '#000000' });
    const nodes = createConnector(prev);
    const result = updateConnector(nodes, obj, prev);
    expect(result).toBe(true);
  });

  it('returns true when strokeWidth changes', () => {
    const obj = createConnectorObj({ strokeWidth: 3 });
    const prev = createConnectorObj({ strokeWidth: 2 });
    const nodes = createConnector(prev);
    const result = updateConnector(nodes, obj, prev);
    expect(result).toBe(true);
  });

  it('patches points when they change', () => {
    const obj = createConnectorObj({ points: [0, 0, 100, 50] });
    const nodes = createConnector(obj);
    const updated = createConnectorObj({ points: [0, 0, 150, 75] });
    updateConnector(nodes, updated, obj);
    const root = nodes.root as Konva.Arrow;
    expect(root.points()).toEqual([0, 0, 150, 75]);
  });
});

describe('createTextElement', () => {
  it('creates Konva.Text with correct structure', () => {
    const obj = createTextObj();
    const { root, parts, cacheable } = createTextElement(obj);
    expect(root).toBeInstanceOf(Konva.Text);
    expect(parts).toEqual({});
    expect(cacheable).toBe(false);
  });

  it('sets text, fontSize, fill from object', () => {
    const obj = createTextObj({ text: 'Test', fontSize: 20, textFill: '#ff0000' });
    const { root } = createTextElement(obj);
    const text = root as Konva.Text;
    expect(text.text()).toBe('Test');
    expect(text.fontSize()).toBe(20);
    expect(text.fill()).toBe('#ff0000');
  });

  it('defaults to placeholder when text empty', () => {
    const obj = createTextObj({ text: '' });
    const { root } = createTextElement(obj);
    expect((root as Konva.Text).text()).toBe('Double-click to edit');
  });
});

describe('updateTextElement', () => {
  it('returns false for position-only change', () => {
    const obj = createTextObj({ x: 50, y: 60 });
    const nodes = createTextElement(obj);
    const moved = { ...obj, x: 100, y: 120 };
    const result = updateTextElement(nodes, moved, obj);
    expect(result).toBe(false);
  });

  it('returns true when text changes', () => {
    const obj = createTextObj({ text: 'New' });
    const prev = createTextObj({ text: 'Old' });
    const nodes = createTextElement(obj);
    const result = updateTextElement(nodes, obj, prev);
    expect(result).toBe(true);
  });

  it('returns true when fontSize changes', () => {
    const obj = createTextObj({ fontSize: 24 });
    const prev = createTextObj({ fontSize: 16 });
    const nodes = createTextElement(obj);
    const result = updateTextElement(nodes, obj, prev);
    expect(result).toBe(true);
  });

  it('patches attrs on update', () => {
    const obj = createTextObj({ text: 'A', x: 10, y: 20 });
    const nodes = createTextElement(obj);
    const updated = createTextObj({ text: 'B', x: 30, y: 40 });
    updateTextElement(nodes, updated, obj);
    const text = nodes.root as Konva.Text;
    expect(text.text()).toBe('B');
    expect(text.x()).toBe(30);
    expect(text.y()).toBe(40);
  });
});

describe('connector and text in registry', () => {
  it('connector factory creates and updates via registry', () => {
    const entry = getFactory('connector');
    const obj = createConnectorObj();
    const nodes = entry.create(obj);
    expect(nodes.root).toBeInstanceOf(Konva.Arrow);
    const updated = createConnectorObj({ x: 99, y: 99 });
    const visualChanged = entry.update(nodes, updated, obj);
    expect(typeof visualChanged).toBe('boolean');
  });

  it('text factory creates and updates via registry', () => {
    const entry = getFactory('text');
    const obj = createTextObj();
    const nodes = entry.create(obj);
    expect(nodes.root).toBeInstanceOf(Konva.Text);
    const updated = createTextObj({ text: 'Updated' });
    const visualChanged = entry.update(nodes, updated, obj);
    expect(visualChanged).toBe(true);
  });
});
