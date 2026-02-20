import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialIndex } from '@/lib/spatialIndex';

describe('SpatialIndex', () => {
  let index: SpatialIndex;

  beforeEach(() => {
    index = new SpatialIndex();
  });

  it('inserts and queries a single object', () => {
    index.insert('a', { x1: 100, y1: 100, x2: 200, y2: 200 });
    const result = index.query({ x1: 0, y1: 0, x2: 300, y2: 300 });
    expect(result.has('a')).toBe(true);
    expect(result.size).toBe(1);
  });

  it('returns empty set when query misses all objects', () => {
    index.insert('a', { x1: 100, y1: 100, x2: 200, y2: 200 });
    const result = index.query({ x1: 5000, y1: 5000, x2: 6000, y2: 6000 });
    expect(result.size).toBe(0);
  });

  it('handles objects spanning multiple cells', () => {
    // Object spans 600px wide → at least 2 cells (CELL_SIZE=500)
    index.insert('wide', { x1: 0, y1: 0, x2: 600, y2: 100 });

    // Query first cell only
    const r1 = index.query({ x1: 0, y1: 0, x2: 100, y2: 100 });
    expect(r1.has('wide')).toBe(true);

    // Query second cell only
    const r2 = index.query({ x1: 500, y1: 0, x2: 600, y2: 100 });
    expect(r2.has('wide')).toBe(true);
  });

  it('removes an object', () => {
    index.insert('a', { x1: 100, y1: 100, x2: 200, y2: 200 });
    expect(index.size).toBe(1);

    index.remove('a');
    expect(index.size).toBe(0);

    const result = index.query({ x1: 0, y1: 0, x2: 500, y2: 500 });
    expect(result.size).toBe(0);
  });

  it('remove is a no-op for unknown ID', () => {
    index.remove('nonexistent');
    expect(index.size).toBe(0);
  });

  it('update replaces old bounds with new bounds', () => {
    index.insert('a', { x1: 0, y1: 0, x2: 100, y2: 100 });
    index.update('a', { x1: 3000, y1: 3000, x2: 3100, y2: 3100 });

    // Old position should not match
    const old = index.query({ x1: 0, y1: 0, x2: 200, y2: 200 });
    expect(old.has('a')).toBe(false);

    // New position should match
    const fresh = index.query({ x1: 2900, y1: 2900, x2: 3200, y2: 3200 });
    expect(fresh.has('a')).toBe(true);
  });

  it('clear removes everything', () => {
    for (let i = 0; i < 100; i++) {
      index.insert(`obj-${i}`, { x1: i * 50, y1: 0, x2: i * 50 + 100, y2: 100 });
    }
    expect(index.size).toBe(100);

    index.clear();
    expect(index.size).toBe(0);
    expect(index.query({ x1: 0, y1: 0, x2: 10000, y2: 10000 }).size).toBe(0);
  });

  it('query returns unique IDs (no duplicates from multi-cell overlap)', () => {
    // Object spans 3 cells
    index.insert('big', { x1: 0, y1: 0, x2: 1200, y2: 100 });

    // Query covers all 3 cells
    const result = index.query({ x1: 0, y1: 0, x2: 1200, y2: 100 });
    expect(result.size).toBe(1);
    expect(result.has('big')).toBe(true);
  });

  it('handles negative coordinates', () => {
    index.insert('neg', { x1: -300, y1: -300, x2: -100, y2: -100 });
    const result = index.query({ x1: -500, y1: -500, x2: 0, y2: 0 });
    expect(result.has('neg')).toBe(true);
  });

  it('performance: insert and query 1000 objects', () => {
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 5000;
      const y = Math.random() * 5000;
      index.insert(`obj-${i}`, { x1: x, y1: y, x2: x + 150, y2: y + 100 });
    }
    expect(index.size).toBe(1000);

    const start = performance.now();
    const visible = index.query({ x1: 0, y1: 0, x2: 1920, y2: 1080 });
    const duration = performance.now() - start;

    expect(visible.size).toBeGreaterThan(0);
    expect(duration).toBeLessThan(10); // Should be <1ms typically
  });

  it('performance: query panned-away viewport returns few results fast', () => {
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 5000;
      const y = Math.random() * 5000;
      index.insert(`obj-${i}`, { x1: x, y1: y, x2: x + 150, y2: y + 100 });
    }

    const start = performance.now();
    const visible = index.query({ x1: 50000, y1: 50000, x2: 51920, y2: 51080 });
    const duration = performance.now() - start;

    expect(visible.size).toBe(0);
    expect(duration).toBeLessThan(5);
  });
});
