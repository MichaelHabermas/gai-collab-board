import { describe, it, expect, vi, beforeEach } from 'vitest';

const { MockShape, MockLayer } = vi.hoisted(() => {
  class MockShape {
    public sceneFuncValue: ((ctx: unknown) => void) | null = null;
    public visibleValue = true;
    public nameValue = '';
    public listeningValue = true;
    public perfectDrawEnabledValue = true;

    constructor(config: { name?: string; listening?: boolean; perfectDrawEnabled?: boolean }) {
      this.nameValue = config.name ?? '';
      this.listeningValue = config.listening ?? true;
      this.perfectDrawEnabledValue = config.perfectDrawEnabled ?? true;
      globalThis.__gridRendererShape = this;
    }

    sceneFunc(func?: (ctx: unknown) => void): void {
      if (func) {
        this.sceneFuncValue = func;
      }
    }

    visible(value?: boolean): boolean | void {
      if (value === undefined) {
        return this.visibleValue;
      }

      this.visibleValue = value;
    }

    destroy(): void {
      // no-op for tests
    }
  }

  class MockLayer {
    public add = vi.fn();

    constructor(_config?: { name?: string }) {}
  }

  return { MockShape, MockLayer };
});

declare global {
  // eslint-disable-next-line no-var
  var __gridRendererShape: InstanceType<typeof MockShape> | undefined;
}

vi.mock('konva', () => {
  return {
    default: {
      Shape: MockShape,
      Layer: MockLayer,
    },
  };
});

import Konva from 'konva';
import {
  GridRenderer,
  createGridSceneFunc,
  GRID_LINE_OPACITY,
  GRID_STROKE_WIDTH,
  type IGridSceneContext,
} from '@/canvas/GridRenderer';
import type { IViewportState } from '@/types';

describe('GridRenderer', () => {
  beforeEach(() => {
    globalThis.__gridRendererShape = undefined;
    vi.clearAllMocks();
  });

  it('creates sceneFunc with scale-aware line widths', () => {
    const viewport: IViewportState = {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      width: 100,
      height: 100,
    };
    const rects: Array<{ width: number; height: number }> = [];
    const ctx: IGridSceneContext = {
      setAttr: vi.fn(),
      fillRect: vi.fn((_x: number, _y: number, width: number, height: number) => {
        rects.push({ width, height });
      }),
    };

    const sceneFunc = createGridSceneFunc(viewport, '#ccc');
    sceneFunc(ctx);

    const expectedWidth = GRID_STROKE_WIDTH / viewport.scale.x;
    const expectedHeight = GRID_STROKE_WIDTH / viewport.scale.y;

    expect(rects.some((rect) => rect.width === expectedWidth)).toBe(true);
    expect(rects.some((rect) => rect.height === expectedHeight)).toBe(true);
    expect(ctx.setAttr).toHaveBeenCalledWith('globalAlpha', GRID_LINE_OPACITY);
    expect(ctx.setAttr).toHaveBeenCalledWith('fillStyle', '#ccc');
  });

  it('applies scale to line widths at higher zoom', () => {
    const viewport: IViewportState = {
      position: { x: 0, y: 0 },
      scale: { x: 2, y: 2 },
      width: 100,
      height: 100,
    };
    const rects: Array<{ width: number; height: number }> = [];
    const ctx: IGridSceneContext = {
      setAttr: vi.fn(),
      fillRect: vi.fn((_x: number, _y: number, width: number, height: number) => {
        rects.push({ width, height });
      }),
    };

    const sceneFunc = createGridSceneFunc(viewport, '#333');
    sceneFunc(ctx);

    const expectedWidth = GRID_STROKE_WIDTH / viewport.scale.x;
    const expectedHeight = GRID_STROKE_WIDTH / viewport.scale.y;

    expect(rects.some((rect) => rect.width === expectedWidth)).toBe(true);
    expect(rects.some((rect) => rect.height === expectedHeight)).toBe(true);
  });

  it('toggles visibility and schedules draws when showGrid changes', () => {
    const layer = new Konva.Layer({ name: 'grid-layer' });
    const scheduleBatchDraw = vi.fn();
    const renderer = new GridRenderer({ layer, scheduleBatchDraw });
    const shape = globalThis.__gridRendererShape;
    if (!shape) {
      throw new Error('GridRenderer did not create a shape.');
    }

    const viewport: IViewportState = {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      width: 100,
      height: 100,
    };

    renderer.update({ viewport, gridColor: '#000', showGrid: false });
    expect(shape.visibleValue).toBe(false);
    expect(scheduleBatchDraw).toHaveBeenCalledWith(layer);

    scheduleBatchDraw.mockClear();
    renderer.update({ viewport, gridColor: '#000', showGrid: true });
    expect(shape.visibleValue).toBe(true);
    expect(shape.sceneFuncValue).not.toBeNull();
    expect(scheduleBatchDraw).toHaveBeenCalledWith(layer);
  });
});
