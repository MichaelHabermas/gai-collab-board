import { describe, it, expect } from 'vitest';
import {
  screenToWorld,
  worldToScreen,
  screenToWorldRect,
  worldToScreenRect,
} from '@/lib/coordinateUtils';
import type { IViewportState } from '@/types';

const IDENTITY_VIEWPORT: IViewportState = {
  position: { x: 0, y: 0 },
  scale: { x: 1, y: 1 },
  width: 1920,
  height: 1080,
};

const ZOOMED_VIEWPORT: IViewportState = {
  position: { x: 0, y: 0 },
  scale: { x: 2, y: 2 },
  width: 1920,
  height: 1080,
};

const PANNED_VIEWPORT: IViewportState = {
  position: { x: 100, y: -50 },
  scale: { x: 1, y: 1 },
  width: 1920,
  height: 1080,
};

const ZOOMED_AND_PANNED_VIEWPORT: IViewportState = {
  position: { x: 200, y: 100 },
  scale: { x: 0.5, y: 0.5 },
  width: 1920,
  height: 1080,
};

describe('screenToWorld', () => {
  it('returns identity when viewport is at default', () => {
    const result = screenToWorld({ x: 100, y: 200 }, IDENTITY_VIEWPORT);

    expect(result).toEqual({ x: 100, y: 200 });
  });

  it('divides by scale when zoomed in (2x)', () => {
    const result = screenToWorld({ x: 200, y: 400 }, ZOOMED_VIEWPORT);

    expect(result).toEqual({ x: 100, y: 200 });
  });

  it('subtracts pan offset before dividing', () => {
    const result = screenToWorld({ x: 200, y: 100 }, PANNED_VIEWPORT);

    expect(result).toEqual({ x: 100, y: 150 });
  });

  it('handles combined zoom and pan', () => {
    const result = screenToWorld({ x: 300, y: 200 }, ZOOMED_AND_PANNED_VIEWPORT);

    expect(result).toEqual({ x: 200, y: 200 });
  });

  it('handles origin point', () => {
    const result = screenToWorld({ x: 0, y: 0 }, ZOOMED_AND_PANNED_VIEWPORT);

    expect(result).toEqual({ x: -400, y: -200 });
  });

  it('handles negative screen coordinates', () => {
    const result = screenToWorld({ x: -100, y: -50 }, IDENTITY_VIEWPORT);

    expect(result).toEqual({ x: -100, y: -50 });
  });
});

describe('worldToScreen', () => {
  it('returns identity when viewport is at default', () => {
    const result = worldToScreen({ x: 100, y: 200 }, IDENTITY_VIEWPORT);

    expect(result).toEqual({ x: 100, y: 200 });
  });

  it('multiplies by scale when zoomed in (2x)', () => {
    const result = worldToScreen({ x: 100, y: 200 }, ZOOMED_VIEWPORT);

    expect(result).toEqual({ x: 200, y: 400 });
  });

  it('adds pan offset after scaling', () => {
    const result = worldToScreen({ x: 100, y: 150 }, PANNED_VIEWPORT);

    expect(result).toEqual({ x: 200, y: 100 });
  });

  it('handles combined zoom and pan', () => {
    const result = worldToScreen({ x: 200, y: 200 }, ZOOMED_AND_PANNED_VIEWPORT);

    expect(result).toEqual({ x: 300, y: 200 });
  });
});

describe('round-trip conversions', () => {
  const viewports = [
    IDENTITY_VIEWPORT,
    ZOOMED_VIEWPORT,
    PANNED_VIEWPORT,
    ZOOMED_AND_PANNED_VIEWPORT,
  ];

  const testPoints = [
    { x: 0, y: 0 },
    { x: 100, y: 200 },
    { x: -50, y: 300 },
    { x: 960, y: 540 },
  ];

  for (const viewport of viewports) {
    for (const point of testPoints) {
      it(`screen->world->screen preserves (${point.x},${point.y}) at scale=${viewport.scale.x}, pan=(${viewport.position.x},${viewport.position.y})`, () => {
        const world = screenToWorld(point, viewport);
        const backToScreen = worldToScreen(world, viewport);

        expect(backToScreen.x).toBeCloseTo(point.x, 10);
        expect(backToScreen.y).toBeCloseTo(point.y, 10);
      });
    }
  }
});

describe('screenToWorldRect', () => {
  it('returns identity bounds at default viewport', () => {
    const result = screenToWorldRect({ x1: 10, y1: 20, x2: 100, y2: 200 }, IDENTITY_VIEWPORT);

    expect(result).toEqual({ x1: 10, y1: 20, x2: 100, y2: 200 });
  });

  it('scales bounds at zoom=2', () => {
    const result = screenToWorldRect({ x1: 0, y1: 0, x2: 200, y2: 400 }, ZOOMED_VIEWPORT);

    expect(result).toEqual({ x1: 0, y1: 0, x2: 100, y2: 200 });
  });

  it('handles panned viewport', () => {
    const result = screenToWorldRect({ x1: 100, y1: 0, x2: 300, y2: 100 }, PANNED_VIEWPORT);

    expect(result).toEqual({ x1: 0, y1: 50, x2: 200, y2: 150 });
  });

  it('normalizes inverted bounds', () => {
    const halfScaleViewport: IViewportState = {
      position: { x: 0, y: 0 },
      scale: { x: -1, y: -1 },
      width: 800,
      height: 600,
    };
    const result = screenToWorldRect({ x1: 10, y1: 20, x2: 100, y2: 200 }, halfScaleViewport);

    expect(result.x1).toBeLessThanOrEqual(result.x2);
    expect(result.y1).toBeLessThanOrEqual(result.y2);
  });
});

describe('worldToScreenRect', () => {
  it('returns identity bounds at default viewport', () => {
    const result = worldToScreenRect({ x1: 10, y1: 20, x2: 100, y2: 200 }, IDENTITY_VIEWPORT);

    expect(result).toEqual({ x1: 10, y1: 20, x2: 100, y2: 200 });
  });

  it('scales bounds at zoom=2', () => {
    const result = worldToScreenRect({ x1: 0, y1: 0, x2: 100, y2: 200 }, ZOOMED_VIEWPORT);

    expect(result).toEqual({ x1: 0, y1: 0, x2: 200, y2: 400 });
  });

  it('round-trips with screenToWorldRect', () => {
    const original = { x1: 50, y1: 100, x2: 300, y2: 400 };
    const world = screenToWorldRect(original, ZOOMED_AND_PANNED_VIEWPORT);
    const backToScreen = worldToScreenRect(world, ZOOMED_AND_PANNED_VIEWPORT);

    expect(backToScreen.x1).toBeCloseTo(original.x1, 10);
    expect(backToScreen.y1).toBeCloseTo(original.y1, 10);
    expect(backToScreen.x2).toBeCloseTo(original.x2, 10);
    expect(backToScreen.y2).toBeCloseTo(original.y2, 10);
  });
});
